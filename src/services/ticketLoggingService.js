import { EmbedBuilder } from 'discord.js';
import { ticketConfig } from '../config/tickets.js';

function fmt(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function fmtDuration(ms) {
  if (!ms || ms < 0) return 'N/A';
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

const actionHandlers = {
  ticket_opened(guild, data) {
    return new EmbedBuilder()
      .setTitle('🎟️ Ticket Opened')
      .setDescription('A new support ticket has been created.')
      .setColor(0x75cff5)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true },
        { name: 'Department', value: data.department || 'Unknown', inline: true },
        { name: 'Creator', value: `<@${data.creatorId || data.performedBy}>`, inline: true },
        { name: 'Created', value: fmt(data.createdAt || new Date()), inline: true }
      )
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },

  ticket_closed(guild, data) {
    const embed = new EmbedBuilder()
      .setTitle('🔒 Ticket Closed')
      .setDescription('A support ticket has been closed and archived for staff review.')
      .setColor(0xed4245)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true },
        { name: 'Department', value: data.department || 'Unknown', inline: true },
        { name: 'Creator', value: data.creatorId ? `<@${data.creatorId}>` : (data.performedBy || 'Unknown'), inline: true },
        { name: 'Closed By', value: `<@${data.closedById || data.performedBy}>`, inline: true },
        { name: 'Close Reason', value: (data.reason || 'No reason provided').slice(0, 1024), inline: false },
        { name: 'Created', value: fmt(data.createdAt), inline: true },
        { name: 'Closed', value: fmt(data.closedAt || new Date()), inline: true }
      );

    if (data.duration) {
      embed.addFields({ name: 'Duration', value: data.duration, inline: true });
    }
    if (data.firstResponse) {
      embed.addFields({ name: 'First Response', value: data.firstResponse, inline: true });
    }
    if (data.totalMessages !== undefined) {
      const msgStats = `${data.totalMessages} total\n${data.userMessages || 0} user\n${data.staffMessages || 0} staff`;
      embed.addFields({ name: 'Messages', value: msgStats, inline: true });
    }
    if (data.transcriptDmStatus) {
      embed.addFields({ name: 'Transcript DM', value: data.transcriptDmStatus, inline: false });
    }

    return embed
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },

  ticket_reopened(guild, data) {
    return new EmbedBuilder()
      .setTitle('🔓 Ticket Reopened')
      .setDescription('A closed ticket has been reopened.')
      .setColor(0x57f287)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true },
        { name: 'Department', value: data.department || 'Unknown', inline: true },
        { name: 'Reopened By', value: `<@${data.performedById || data.performedBy}>`, inline: true },
        { name: 'Previous Closed Time', value: data.previousClosedAt ? fmt(data.previousClosedAt) : 'N/A', inline: true }
      )
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },

  ticket_deleted(guild, data) {
    return new EmbedBuilder()
      .setTitle('🗑️ Ticket Deleted')
      .setDescription('A ticket has been permanently deleted.')
      .setColor(0xed4245)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true },
        { name: 'Department', value: data.department || 'Unknown', inline: true },
        { name: 'Deleted By', value: `<@${data.performedById || data.performedBy}>`, inline: true },
        { name: 'Transcript Saved', value: data.transcriptSaved ? 'Yes' : 'No', inline: true }
      )
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },

  department_moved(guild, data) {
    return new EmbedBuilder()
      .setTitle('🔀 Ticket Department Changed')
      .setDescription('A ticket has been moved to a different department.')
      .setColor(0x5865f2)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true },
        { name: 'Moved By', value: `<@${data.performedById || data.performedBy}>`, inline: true },
        { name: 'Previous Department', value: data.oldValue || 'Unknown', inline: true },
        { name: 'New Department', value: data.newValue || 'Unknown', inline: true }
      )
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },

  user_added(guild, data) {
    return new EmbedBuilder()
      .setTitle('➕ Participant Added')
      .setDescription('A user has been added to a ticket.')
      .setColor(0x57f287)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true },
        { name: 'Department', value: data.department || 'Unknown', inline: true },
        { name: 'Added User', value: data.targetUser ? `<@${data.targetUserId || data.targetUser}>` : data.targetUser || 'Unknown', inline: true },
        { name: 'Added By', value: `<@${data.performedById || data.performedBy}>`, inline: true }
      )
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },

  user_removed(guild, data) {
    return new EmbedBuilder()
      .setTitle('➖ Participant Removed')
      .setDescription('A user has been removed from a ticket.')
      .setColor(0xed4245)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true },
        { name: 'Department', value: data.department || 'Unknown', inline: true },
        { name: 'Removed User', value: data.targetUser ? `<@${data.targetUserId || data.targetUser}>` : data.targetUser || 'Unknown', inline: true },
        { name: 'Removed By', value: `<@${data.performedById || data.performedBy}>`, inline: true }
      )
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },

  ticket_claimed(guild, data) {
    return new EmbedBuilder()
      .setTitle('🙋 Ticket Claimed')
      .setDescription('A staff member has claimed this ticket.')
      .setColor(0x57f287)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true },
        { name: 'Department', value: data.department || 'Unknown', inline: true },
        { name: 'Claimed By', value: `<@${data.performedById || data.performedBy}>`, inline: true }
      )
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },

  ticket_unclaimed(guild, data) {
    return new EmbedBuilder()
      .setTitle('🙋 Ticket Unclaimed')
      .setDescription('A staff member has released their claim.')
      .setColor(0xfee75c)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true },
        { name: 'Department', value: data.department || 'Unknown', inline: true },
        { name: 'Unclaimed By', value: `<@${data.performedById || data.performedBy}>`, inline: true }
      )
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },

  ticket_locked(guild, data) {
    return new EmbedBuilder()
      .setTitle('🔒 Ticket Locked')
      .setDescription('A ticket has been locked. The user can no longer send messages.')
      .setColor(0xfee75c)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true },
        { name: 'Department', value: data.department || 'Unknown', inline: true },
        { name: 'Locked By', value: `<@${data.performedById || data.performedBy}>`, inline: true }
      )
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },

  ticket_unlocked(guild, data) {
    return new EmbedBuilder()
      .setTitle('🔓 Ticket Unlocked')
      .setDescription('A ticket has been unlocked. The user can now send messages.')
      .setColor(0x57f287)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true },
        { name: 'Department', value: data.department || 'Unknown', inline: true },
        { name: 'Unlocked By', value: `<@${data.performedById || data.performedBy}>`, inline: true }
      )
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },

  close_requested(guild, data) {
    return new EmbedBuilder()
      .setTitle('📋 Close Requested')
      .setDescription('A user has requested to close this ticket.')
      .setColor(0xfee75c)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true },
        { name: 'Department', value: data.department || 'Unknown', inline: true },
        { name: 'Requested By', value: `<@${data.performedById || data.performedBy}>`, inline: true }
      )
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },

  alert_sent(guild, data) {
    return new EmbedBuilder()
      .setTitle('🔔 Alert Sent')
      .setDescription('An alert has been sent to the ticket creator.')
      .setColor(0xfee75c)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true },
        { name: 'Department', value: data.department || 'Unknown', inline: true },
        { name: 'Sent By', value: `<@${data.performedById || data.performedBy}>`, inline: true },
        { name: 'Details', value: data.extra || 'N/A', inline: false }
      )
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },

  role_pinged(guild, data) {
    return new EmbedBuilder()
      .setTitle('🔔 Support Role Pinged')
      .setDescription('The support role has been pinged in a ticket.')
      .setColor(0x75cff5)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true },
        { name: 'Department', value: data.department || 'Unknown', inline: true },
        { name: 'Pinged By', value: `<@${data.performedById || data.performedBy}>`, inline: true }
      )
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },

  messages_purged(guild, data) {
    return new EmbedBuilder()
      .setTitle('🧹 Messages Purged')
      .setDescription('Messages have been deleted from a ticket.')
      .setColor(0xed4245)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true },
        { name: 'Department', value: data.department || 'Unknown', inline: true },
        { name: 'Purged By', value: `<@${data.performedById || data.performedBy}>`, inline: true },
        { name: 'Messages Deleted', value: data.newValue || '0', inline: true }
      )
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },

  channel_renamed(guild, data) {
    return new EmbedBuilder()
      .setTitle('✏️ Ticket Renamed')
      .setDescription('A ticket channel has been renamed.')
      .setColor(0x75cff5)
      .addFields(
        { name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: false },
        { name: 'Old Name', value: data.oldValue || 'Unknown', inline: true },
        { name: 'New Name', value: data.newValue || 'Unknown', inline: true }
      )
      .setFooter({ text: `Ticket ID: ${data.ticketId} • PENGUUU Ticket Logging` })
      .setTimestamp();
  },
};

export async function logTicketAction(guild, action, data = {}) {
  const channelId = ticketConfig.logChannelId;
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;

  const handler = actionHandlers[action];

  let embed;
  if (handler) {
    embed = handler(guild, data);
  } else {
    const color = 0x75cff5;
    const title = action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    embed = new EmbedBuilder().setTitle(title).setColor(color).setTimestamp();
    if (data.description) embed.setDescription(String(data.description).slice(0, 4096));
    if (data.ticketId) embed.addFields({ name: 'Ticket', value: `#${String(data.ticketId).padStart(4, '0')}`, inline: true });
    if (data.department) embed.addFields({ name: 'Department', value: data.department, inline: true });
    if (data.performedBy) embed.addFields({ name: 'By', value: data.performedBy, inline: true });
    if (data.reason) embed.addFields({ name: 'Reason', value: String(data.reason).slice(0, 1024), inline: false });
    if (data.extra) embed.addFields({ name: 'Details', value: String(data.extra).slice(0, 1024), inline: false });
  }

  await channel.send({ embeds: [embed] }).catch(() => null);
}

export async function logError(guild, context, error, extra = {}) {
  const channelId = ticketConfig.errorLogChannelId;
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('❌ Ticket System Error')
    .setColor(0xed4245)
    .setDescription(`**Context:** ${context}`)
    .addFields(
      { name: 'Error', value: String(error?.message || error || 'Unknown').slice(0, 1024) },
      { name: 'Stack', value: String(error?.stack || 'No stack trace').slice(0, 1024) }
    )
    .setTimestamp();

  if (extra.ticketId) {
    embed.addFields({ name: 'Ticket', value: `#${String(extra.ticketId).padStart(4, '0')}`, inline: true });
  }
  if (extra.userId) {
    embed.addFields({ name: 'User', value: `<@${extra.userId}>`, inline: true });
  }
  if (extra.channelId) {
    embed.addFields({ name: 'Channel', value: `<#${extra.channelId}>`, inline: true });
  }

  await channel.send({ embeds: [embed] }).catch(() => null);
}
