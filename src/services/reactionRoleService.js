import { EmbedBuilder } from 'discord.js';
import { reactionRoles } from '../config/reactionRoles.js';

let reactionMessageId = null;

export function setReactionMessageId(id) {
  reactionMessageId = id;
}

export function buildReactionRoleEmbed() {
  return new EmbedBuilder()
    .setTitle(reactionRoles.embed.title)
    .setDescription(reactionRoles.embed.description)
    .setColor(reactionRoles.embed.color)
    .setFooter({ text: reactionRoles.embed.footer })
    .setTimestamp();
}

export async function setupReactionRoles(guild) {
  const channel = guild.channels.cache.get(reactionRoles.channelId);
  if (!channel) {
    console.error('[ROLES] Reaction role channel not found');
    return;
  }

  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const existing = messages?.find(
    (m) =>
      m.author.id === guild.members.me.id &&
      m.embeds.some((e) => e.title === reactionRoles.embed.title)
  );

  if (existing) {
    reactionMessageId = existing.id;
    console.log(`[ROLES] Found existing reaction role message: ${reactionMessageId}`);
    return;
  }

  const embed = buildReactionRoleEmbed();
  const sent = await channel.send({ embeds: [embed] }).catch((err) => {
    console.error('[ROLES] Failed to send reaction role message:', err.message);
    return null;
  });

  if (sent) {
    reactionMessageId = sent.id;
    const emojis = Object.keys(reactionRoles.emojiRoleMap);
    for (const emoji of emojis) {
      await sent.react(emoji).catch(() => null);
    }
    console.log(`[ROLES] Sent reaction role message: ${reactionMessageId}`);
  }
}

async function resolveReaction(reaction) {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return null;
    }
  }

  if (reaction.message.partial) {
    try {
      await reaction.message.fetch();
    } catch {
      return null;
    }
  }

  return reaction;
}

export async function handleReactionAdd(reaction, user) {
  if (user.bot) return;

  const resolved = await resolveReaction(reaction);
  if (!resolved) return;

  if (resolved.message.id !== reactionMessageId) return;

  const emoji = resolved.emoji.name;
  const roleId = reactionRoles.emojiRoleMap[emoji];
  if (!roleId) {
    console.log(`[ROLES] No role mapped for emoji: ${emoji}`);
    return;
  }

  const guild = resolved.message.guild;
  if (!guild) {
    console.error('[ROLES] No guild on message');
    return;
  }

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    console.error(`[ROLES] Could not fetch member ${user.tag}`);
    return;
  }

  const role = guild.roles.cache.get(roleId);
  if (!role) {
    console.error(`[ROLES] Role not found for ID: ${roleId}`);
    return;
  }

  if (guild.members.me.roles.highest.position <= role.position) {
    console.error(`[ROLES] Bot role is below or equal to ${role.name} in hierarchy`);
    return;
  }

  const botMember = guild.members.me;
  if (!botMember.permissions.has('ManageRoles')) {
    console.error('[ROLES] Bot missing ManageRoles permission');
    return;
  }

  if (member.roles.cache.has(roleId)) {
    console.log(`[ROLES] ${member.user.tag} already has ${role.name}`);
    return;
  }

  await member.roles.add(role).then(() => {
    console.log(`[ROLES] Added ${role.name} to ${member.user.tag}`);
  }).catch((err) => {
    console.error(`[ROLES] Failed to add role ${role.name}:`, err.message);
  });
}

export async function handleReactionRemove(reaction, user) {
  if (user.bot) return;

  const resolved = await resolveReaction(reaction);
  if (!resolved) return;

  if (resolved.message.id !== reactionMessageId) return;

  const emoji = resolved.emoji.name;
  const roleId = reactionRoles.emojiRoleMap[emoji];
  if (!roleId) return;

  const guild = resolved.message.guild;
  if (!guild) return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  const role = guild.roles.cache.get(roleId);
  if (!role) return;

  if (!member.roles.cache.has(roleId)) return;

  await member.roles.remove(role).then(() => {
    console.log(`[ROLES] Removed ${role.name} from ${member.user.tag}`);
  }).catch((err) => {
    console.error(`[ROLES] Failed to remove role ${role.name}:`, err.message);
  });
}
