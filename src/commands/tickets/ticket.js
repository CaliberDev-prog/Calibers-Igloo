import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { ticketConfig } from '../../config/tickets.js';
import * as ticketService from '../../services/ticketService.js';
import * as transcriptService from '../../services/transcriptService.js';
import { isStaff, canManageTicket } from '../../utils/ticketPermissions.js';

const COMPONENTS_V2 = 1 << 15;

function inTicket(interaction) {
  const categoryId = interaction.channel?.parentId;
  if (!categoryId) return false;
  return Object.values(ticketConfig.departments).some(
    (d) => d.categoryId === categoryId || (d.closedCategoryId && d.closedCategoryId === categoryId)
  );
}

async function getTicket(channelId) {
  return ticketService.getTicketByChannelId(channelId);
}

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName('ticket')
      .setDescription('Ticket management commands')
      .addSubcommand((sub) =>
        sub
          .setName('close')
          .setDescription('Close the current ticket')
          .addStringOption((o) => o.setName('reason').setDescription('Reason for closing').setRequired(false))
      )
      .addSubcommand((sub) => sub.setName('transcript').setDescription('Generate a transcript'))
      .addSubcommand((sub) =>
        sub
          .setName('move')
          .setDescription('Move ticket to another department')
          .addStringOption((o) =>
            o
              .setName('department')
              .setDescription('Target department')
              .setRequired(true)
              .addChoices(
                ...Object.entries(ticketConfig.departments)
                  .filter(([, d]) => d.enabled)
                  .map(([key, dept]) => ({
                    name: `${dept.emoji} ${dept.name}`,
                    value: key,
                  }))
              )
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Add a user to this ticket')
          .addUserOption((o) => o.setName('user').setDescription('User to add').setRequired(true))
      )
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Remove a user from this ticket')
          .addUserOption((o) => o.setName('user').setDescription('User to remove').setRequired(true))
      )
      .addSubcommand((sub) =>
        sub
          .setName('rename')
          .setDescription('Rename this ticket')
          .addStringOption((o) => o.setName('name').setDescription('New name').setRequired(true))
      )
      .addSubcommand((sub) => sub.setName('request-close').setDescription('Request staff to close this ticket'))
      .addSubcommand((sub) => sub.setName('alert').setDescription('Ping the ticket creator'))
      .addSubcommand((sub) => sub.setName('ping').setDescription('Ping the support role'))
      .addSubcommand((sub) => sub.setName('purge').setDescription('Delete messages in this ticket').addIntegerOption((o) => o.setName('count').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)))
      .addSubcommand((sub) =>
        sub
          .setName('blacklist')
          .setDescription('Blacklist a user')
          .addUserOption((o) => o.setName('user').setDescription('User to blacklist').setRequired(true))
          .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false))
          .addStringOption((o) =>
            o
              .setName('scope')
              .setDescription('Blacklist scope')
              .addChoices(
                { name: '🌍 Global', value: 'global' },
                { name: '🛟 General', value: 'general' },
                { name: '🚨 Reports', value: 'reports' },
                { name: '💼 Hiring', value: 'hiring' }
              )
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('unblacklist')
          .setDescription('Remove a blacklist entry')
          .addUserOption((o) => o.setName('user').setDescription('User to unblacklist').setRequired(true))
          .addStringOption((o) =>
            o
              .setName('scope')
              .setDescription('Scope to remove')
              .addChoices(
                { name: '🌍 Global', value: 'global' },
                { name: '🛟 General', value: 'general' },
                { name: '🚨 Reports', value: 'reports' },
                { name: '💼 Hiring', value: 'hiring' },
                { name: '📋 All Scopes', value: 'all' }
              )
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('stats')
          .setDescription('View ticket statistics')
          .addStringOption((o) =>
            o
              .setName('department')
              .setDescription('Filter by department')
              .addChoices(
                ...Object.entries(ticketConfig.departments)
                  .filter(([, d]) => d.enabled)
                  .map(([key, dept]) => ({
                    name: `${dept.emoji} ${dept.name}`,
                    value: key,
                  }))
              )
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('clean')
          .setDescription('Remove orphaned ticket data from the database')
          .addStringOption((o) => o.setName('ticket_id').setDescription('Ticket ID to clean (e.g. 7). Leave blank for all orphaned.').setRequired(false))
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
      const sub = interaction.options.getSubcommand();

      switch (sub) {
        case 'close':
          return cmdClose(interaction);
        case 'transcript':
          return cmdTranscript(interaction);
        case 'move':
          return cmdMove(interaction);
        case 'add':
          return cmdAdd(interaction);
        case 'remove':
          return cmdRemove(interaction);
        case 'rename':
          return cmdRename(interaction);
        case 'request-close':
          return cmdRequestClose(interaction);
        case 'alert':
          return cmdAlert(interaction);
        case 'ping':
          return cmdPing(interaction);
        case 'purge':
          return cmdPurge(interaction);
        case 'blacklist':
          return cmdBlacklist(interaction);
        case 'unblacklist':
          return cmdUnblacklist(interaction);
        case 'stats':
          return cmdStats(interaction);
        case 'clean':
          return cmdClean(interaction);
      }
    },
  },
];

async function cmdClose(interaction) {
  if (!inTicket(interaction)) return interaction.reply({ content: '❌ Ticket channel only.', ephemeral: true });
  if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Staff only.', ephemeral: true });

  const reason = interaction.options.getString('reason') || 'No reason provided';

  await interaction.deferReply();

  try {
    const transcriptResult = await (async () => {
      try {
        const { attachment, filename } = await transcriptService.generateStaffTranscript(interaction.channel);
        const ticket = await ticketService.getTicketByChannelId(interaction.channel.id);
        const logMsg = await transcriptService.sendTranscriptToLogChannel(interaction.guild, attachment, ticket);
        const { delivered, reason: dmReason } = await transcriptService.sendTranscriptDM(
          interaction.guild, ticket.creatorId, attachment, ticket
        );
        await transcriptService.saveTranscriptInfo(
          ticket.ticketId, interaction.guild, filename,
          interaction.user.tag || interaction.user.username, logMsg?.id || '', delivered
        );
        return { delivered, reason: dmReason };
      } catch (tErr) {
        console.error('[TRANSCRIPT] Generation failed:', tErr.message);
        return { delivered: false, reason: tErr.message };
      }
    })();

    const ticket = await ticketService.closeTicketAndDelete(interaction.channel, interaction.user, reason);

    if (!transcriptResult.delivered) {
      await interaction.channel.send({
        content: `⚠️ Could not DM the transcript to the ticket creator: ${transcriptResult.reason || 'Unknown reason'}`,
      }).catch(() => null);
    }

    await interaction.editReply({ content: `🔒 Ticket #${String(ticket.ticketId).padStart(4, '0')} closed. This channel will be deleted in 10 seconds.` });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function cmdTranscript(interaction) {
  if (!inTicket(interaction)) return interaction.reply({ content: '❌ Ticket channel only.', ephemeral: true });
  if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Staff only.', ephemeral: true });

  await interaction.deferReply({ ephemeral: true });

  try {
    const { attachment, ticket } = await transcriptService.generateStaffTranscript(interaction.channel);
    await interaction.editReply({
      content: `📝 Transcript for Ticket #${String(ticket.ticketId).padStart(4, '0')}`,
      files: [attachment],
    });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function cmdMove(interaction) {
  if (!inTicket(interaction)) return interaction.reply({ content: '❌ Ticket channel only.', ephemeral: true });
  if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Staff only.', ephemeral: true });

  const dept = interaction.options.getString('department');
  await interaction.deferReply();

  try {
    const ticket = await ticketService.moveTicket(interaction.channel, dept, interaction.user);
    const newDept = ticketService.getDeptConfig(dept);
    const embed = new EmbedBuilder()
      .setTitle('📦 Ticket Moved')
      .setDescription(`Ticket #${String(ticket.ticketId).padStart(4, '0')} → **${newDept.name}**`)
      .setColor(newDept.color);
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function cmdAdd(interaction) {
  if (!inTicket(interaction)) return interaction.reply({ content: '❌ Ticket channel only.', ephemeral: true });
  if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Staff only.', ephemeral: true });

  const target = interaction.options.getMember('user');
  if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });

  const ticket = await getTicket(interaction.channel.id);
  const tId = ticket?.ticketId || 0;

  await interaction.deferReply({ ephemeral: true });

  try {
    await ticketService.addParticipant(interaction.channel, target, interaction.user);
    await interaction.editReply({ content: `✅ Added ${target} to this ticket.` });
  } catch (err) {
    if (err.message.includes('subject of this report')) {
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket:force-add:${tId}:${target.id}`)
          .setLabel('⚠️ Yes, Add Reported User')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`ticket:cancel-close:${tId}`)
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Secondary)
      );
      await interaction.editReply({ content: `⚠️ ${err.message}`, components: [confirmRow] });
    } else {
      await interaction.editReply({ content: `❌ ${err.message}` });
    }
  }
}

async function cmdRemove(interaction) {
  if (!inTicket(interaction)) return interaction.reply({ content: '❌ Ticket channel only.', ephemeral: true });
  if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Staff only.', ephemeral: true });

  const target = interaction.options.getMember('user');
  if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });

  await interaction.deferReply({ ephemeral: true });

  try {
    await ticketService.removeParticipant(interaction.channel, target, interaction.user);
    await interaction.editReply({ content: `✅ Removed ${target} from this ticket.` });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function cmdRename(interaction) {
  if (!inTicket(interaction)) return interaction.reply({ content: '❌ Ticket channel only.', ephemeral: true });
  if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Staff only.', ephemeral: true });

  const name = interaction.options.getString('name');

  await interaction.deferReply({ ephemeral: true });

  try {
    await ticketService.renameTicket(interaction.channel, name, interaction.user);
    await interaction.editReply({ content: `✅ Renamed to \`${interaction.channel.name}\`` });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function cmdRequestClose(interaction) {
  if (!inTicket(interaction)) return interaction.reply({ content: '❌ Ticket channel only.', ephemeral: true });

  const ticket = await getTicket(interaction.channel.id);
  if (!ticket) return interaction.reply({ content: '❌ No ticket found.', ephemeral: true });

  const modal = new ModalBuilder()
    .setCustomId(`ticket:close-request-modal:${ticket.ticketId}`)
    .setTitle(`📋 Request Close #${String(ticket.ticketId).padStart(4, '0')}`);

  const reasonInput = new TextInputBuilder()
    .setCustomId('reason')
    .setLabel('Reason (optional)')
    .placeholder('Why are you requesting to close? Leave blank for no reason.')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
  await interaction.showModal(modal);
}

async function cmdAlert(interaction) {
  if (!inTicket(interaction)) return interaction.reply({ content: '❌ Ticket channel only.', ephemeral: true });
  if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Staff only.', ephemeral: true });

  await interaction.deferReply({ ephemeral: true });

  try {
    const { ticket, dmFailed } = await ticketService.handleAlert(interaction.channel, interaction.user);
    const dmStatus = dmFailed ? ' (DM failed)' : ' (DM sent)';
    await interaction.editReply({
      content: `🔔 Alert sent to <@${ticket.creatorId}>${dmStatus}`,
    });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function cmdPing(interaction) {
  if (!inTicket(interaction)) return interaction.reply({ content: '❌ Ticket channel only.', ephemeral: true });
  if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Staff only.', ephemeral: true });

  await interaction.deferReply({ ephemeral: true });

  try {
    await ticketService.handlePingSupport(interaction.channel, interaction.user);
    await interaction.editReply({ content: '🔔 Support role pinged.' });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function cmdPurge(interaction) {
  if (!inTicket(interaction)) return interaction.reply({ content: '❌ Ticket channel only.', ephemeral: true });
  if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Staff only.', ephemeral: true });

  const count = interaction.options.getInteger('count');

  await interaction.deferReply({ ephemeral: true });

  try {
    const actual = await ticketService.purgeMessages(interaction.channel, count, interaction.user);
    await interaction.editReply({ content: `🗑️ Deleted ${actual} message(s).` });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function cmdBlacklist(interaction) {
  if (!canManageTicket(interaction.member)) {
    return interaction.reply({ content: '❌ Management only.', ephemeral: true });
  }

  const target = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const scope = interaction.options.getString('scope') || 'global';

  await interaction.deferReply({ ephemeral: true });

  try {
    await ticketService.blacklistUser(target.id, reason, interaction.user, scope);
    const scopeLabel = scope === 'global' ? 'globally' : `from ${ticketConfig.departments[scope]?.name || scope}`;
    const embed = new EmbedBuilder()
      .setTitle('🚫 User Blacklisted')
      .setDescription(`${target} is now blacklisted ${scopeLabel}.\n**Reason:** ${reason}`)
      .setColor(ticketConfig.colors.error);
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function cmdUnblacklist(interaction) {
  if (!canManageTicket(interaction.member)) {
    return interaction.reply({ content: '❌ Management only.', ephemeral: true });
  }

  const target = interaction.options.getUser('user');
  const scope = interaction.options.getString('scope');

  await interaction.deferReply({ ephemeral: true });

  try {
    if (scope === 'all') {
      const entries = await ticketService.getBlacklistEntries(target.id);
      for (const entry of entries) {
        if (entry.active) {
          await ticketService.unblacklistUser(target.id, entry.departmentId, interaction.user);
        }
      }
    } else {
      const result = await ticketService.unblacklistUser(target.id, scope || undefined, interaction.user);
      if (!result) return interaction.editReply({ content: '❌ No active blacklist found for that scope.' });
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ User Unblacklisted')
      .setDescription(`${target} can now create tickets again.`)
      .setColor(ticketConfig.colors.success);
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function cmdStats(interaction) {
  if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Staff only.', ephemeral: true });

  const department = interaction.options.getString('department');

  await interaction.deferReply({ ephemeral: true });

  try {
    const stats = await ticketService.getStats(interaction.guild.id, department ? { departmentId: department } : {});
    if (!stats) return interaction.editReply({ content: '❌ Could not fetch statistics.' });

    const depts = Object.entries(stats.byDepartment)
      .map(([d, count]) => {
        const dept = ticketService.getDeptConfig(d);
        return `${dept?.emoji || '❓'} **${dept?.name || d}:** ${count} open`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📊 Ticket Statistics')
      .setDescription(
        `**Total:** ${stats.total}\n**Open:** ${stats.open}\n**Closed:** ${stats.closed}\n\n${depts}`
      )
      .setColor(ticketConfig.colors.primary)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function cmdClean(interaction) {
  if (interaction.user.id !== process.env.OWNER_ID) {
    return interaction.reply({ content: '❌ Owner only.', ephemeral: true });
  }

  const ticketId = interaction.options.getString('ticket_id');

  await interaction.deferReply({ ephemeral: true });

  try {
    const result = await ticketService.cleanOrphanedTickets(interaction.guild, ticketId ? parseInt(ticketId, 10) : null);

    if (result.cleaned === 0) {
      return interaction.editReply({ content: '✅ No orphaned tickets found. All ticket records have valid channels.' });
    }

    const embed = new EmbedBuilder()
      .setTitle('🧹 Orphaned Tickets Cleaned')
      .setDescription(`Cleaned **${result.cleaned}** orphaned ticket(s) from the database.`)
      .setColor(ticketConfig.colors.success)
      .addFields(
        { name: 'Cleaned', value: result.cleaned.toString(), inline: true },
        { name: 'Tickets', value: result.ids.length > 0 ? result.ids.map((id) => `#${String(id).padStart(4, '0')}`).join(', ') : 'N/A', inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}
