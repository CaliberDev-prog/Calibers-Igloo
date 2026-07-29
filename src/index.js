import 'dotenv/config';
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
} from 'discord.js';

import { perf } from './utils/performance.js';

perf.markStartupPhase('processStart');

import * as setupCommand from './commands/setup.js';
import * as pingCommand from './commands/ping.js';
import { handleInteraction } from './events/interactionCreate.js';
import { handleRolesFix } from './commands/rolesfix.js';
import { handleRules } from './commands/rules.js';
import { commands as ticketSlashCommands } from './commands/tickets/ticket.js';
import { commands as panelSlashCommands } from './commands/slash/panels.js';
import { commands as modSlashCommands } from './commands/slash/moderation.js';
import { commands as reminderSlashCommands } from './commands/slash/reminder.js';
import { handleMemberAdd } from './events/guildMemberAdd.js';
import { handleInviteTracking } from './services/inviteTrackingService.js';
import {
  setupReactionRoles,
  handleReactionAdd,
  handleReactionRemove,
} from './services/reactionRoleService.js';
import { connectMongo, isMongoConnected } from './services/mongodb.js';
import { recordMessage, recoverTickets, autoCloseCheck } from './services/ticketService.js';
import { checkGiveawayEnd, handleGiveawayReactionAdd, handleGiveawayReactionRemove } from './services/giveawayService.js';
import { ticketConfig } from './config/tickets.js';
import { setClient } from './services/ownerNotify.js';
import { getPrefix } from './services/prefixService.js';
import { registerMessageLogging } from './services/messageLoggingService.js';
import { handlePurgeCommand, handleWarningCommand, handleSlowmodeCommand } from './commands/prefix/moderation.js';
import * as staffaddCommand from './commands/staffadd.js';
import { initReminderService, handleReminderMessage } from './services/reminderService.js';

if (!process.env.DISCORD_TOKEN) {
  throw new Error('Missing DISCORD_TOKEN in .env');
}
if (!process.env.GUILD_ID) {
  throw new Error('Missing GUILD_ID in .env');
}
if (!process.env.OWNER_ID) {
  throw new Error('Missing OWNER_ID in .env');
}

perf.markStartupPhase('importsLoaded');
await connectMongo();
perf.markStartupPhase('mongodb-connect');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
});

client.commands = new Collection();

client.commands.set(setupCommand.data.name, setupCommand);
client.commands.set(pingCommand.data.name, pingCommand);

for (const cmd of ticketSlashCommands) {
  client.commands.set(cmd.data.name, cmd);
}
for (const cmd of panelSlashCommands) {
  client.commands.set(cmd.data.name, cmd);
}
for (const cmd of modSlashCommands) {
  client.commands.set(cmd.data.name, cmd);
}
for (const cmd of reminderSlashCommands) {
  client.commands.set(cmd.data.name, cmd);
}
client.commands.set(staffaddCommand.data.name, staffaddCommand);

let autoCloseInterval = null;
let giveawayInterval = null;
let reminderInterval = null;

client.once(Events.ClientReady, async (readyClient) => {
  perf.markStartupPhase('clientReady');

  const startupReport = perf.getStartupReport();
  console.log(`[STARTUP] Logged in as ${readyClient.user.tag}`);
  console.log(`[STARTUP] Node ${process.version}`);
  if (startupReport.clientReady) {
    console.log(`[STARTUP] Total startup: ${startupReport.clientReady.sinceStart}ms`);
    console.log(`[STARTUP] Mongo connect: ${startupReport['mongodb-connect']?.sincePrevious || 'N/A'}ms`);
  }

  setClient(readyClient);

  const guild = readyClient.guilds.cache.get(process.env.GUILD_ID);
  if (guild) {
    await setupReactionRoles(guild).catch((err) => {
      console.error('[ROLES] Setup failed:', err.message);
    });

    if (isMongoConnected()) {
      await recoverTickets(guild).catch((err) => {
        console.error('[TICKETS] Recovery failed:', err.message);
      });

      await handleInviteTracking(guild).catch((err) => {
        console.error('[INVITES] Cache setup failed:', err.message);
      });

      autoCloseInterval = setInterval(() => {
        autoCloseCheck(guild).catch((err) => {
          console.error('[AUTOCLOSE] Check failed:', err.message);
        });
      }, 60 * 60 * 1000);
      autoCloseCheck(guild).catch(() => null);

      giveawayInterval = setInterval(() => {
        checkGiveawayEnd(readyClient).catch((err) => {
          console.error('[GIVEAWAY] Check failed:', err.message);
        });
      }, 60 * 1000);
      checkGiveawayEnd(readyClient).catch(() => null);

      reminderInterval = await initReminderService(readyClient);
    } else {
      console.warn('[STARTUP] MongoDB not connected. Recovery, invites, and auto-close skipped.');
    }
  }
});

client.on(Events.InteractionCreate, (interaction) =>
  handleInteraction(interaction, client.commands),
);

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const ticketCategories = Object.values(ticketConfig.departments)
    .flatMap((d) => [d.categoryId].filter(Boolean));

  if (message.channel.parentId && ticketCategories.includes(message.channel.parentId)) {
    recordMessage(message).catch(() => null);
  }

  handleReminderMessage(message).catch(() => null);

  const prefix = getPrefix();
  const botMention = `<@${client.user.id}>`;
  const botMentionNick = `<@!${client.user.id}>`;

  let usedPrefix = null;
  if (message.content.startsWith(prefix)) {
    usedPrefix = prefix;
  } else if (message.content.startsWith(botMention)) {
    usedPrefix = botMention;
  } else if (message.content.startsWith(botMentionNick)) {
    usedPrefix = botMentionNick;
  }

  if (usedPrefix) {
    const args = message.content.slice(usedPrefix.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    if (command === 'purge') return handlePurgeCommand(message, args);
    if (command === 'warning' || command === 'warn') return handleWarningCommand(message, args);
    if (command === 'slowmode') return handleSlowmodeCommand(message, args);
    if (command === 'rolesfix') return handleRolesFix(message);
    if (command === 'rules') return handleRules(message);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  await handleMemberAdd(member);
  await handleInviteTracking(member.guild, member).catch((err) => {
    console.error('[INVITES] Tracking error:', err.message);
  });
});

client.on(Events.MessageReactionAdd, (reaction, user) => {
  handleReactionAdd(reaction, user);
  handleGiveawayReactionAdd(reaction, user);
});
client.on(Events.MessageReactionRemove, (reaction, user) => {
  handleReactionRemove(reaction, user);
  handleGiveawayReactionRemove(reaction, user);
});

registerMessageLogging(client);

client.on(Events.Error, console.error);

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[SHUTDOWN] Received ${signal}. Shutting down gracefully...`);
  if (autoCloseInterval) clearInterval(autoCloseInterval);
  if (giveawayInterval) clearInterval(giveawayInterval);
  if (reminderInterval) clearInterval(reminderInterval);
  client.destroy().catch(() => null);
  import('mongoose').then((mongoose) => {
    mongoose.default.disconnect().then(() => {
      console.log('[SHUTDOWN] Clean shutdown complete.');
      process.exit(0);
    });
  }).catch(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
  console.error('[ERROR] Unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught exception:', err);
  shutdown('uncaughtException');
});

await client.login(process.env.DISCORD_TOKEN);
