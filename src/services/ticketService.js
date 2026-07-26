import {
  ChannelType,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { Ticket } from '../database/models/Ticket.js';
import { TicketBlacklist } from '../database/models/TicketBlacklist.js';
import { getNextTicketId } from '../database/models/Counter.js';
import { ticketConfig } from '../config/tickets.js';
import { isMongoConnected } from './mongodb.js';
import { logTicketAction } from './ticketLoggingService.js';
import {
  buildChannelName,
  buildChannelTopic,
  sanitizeChannelName,
} from '../utils/ticketNaming.js';
import {
  checkBlacklist,
  getActiveTicketCount,
  getUserActiveTickets,
  validateAllAnswers,
} from '../utils/ticketValidation.js';
import { isStaff } from '../utils/ticketPermissions.js';
import { notifyOwner } from './ownerNotify.js';

const COMPONENTS_V2 = 1 << 15;

export function getDeptConfig(departmentId) {
  return ticketConfig.departments[departmentId] || null;
}

export async function createTicket(guild, creator, departmentId, answers) {
  const deptConfig = getDeptConfig(departmentId);
  if (!deptConfig || !deptConfig.enabled) throw new Error('Invalid or disabled department.');
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const blacklisted = await checkBlacklist(creator.id, departmentId);
  if (blacklisted) {
    const scope = blacklisted.departmentId === 'global' ? 'globally' : `from ${getDeptConfig(blacklisted.departmentId)?.name || blacklisted.departmentId}`;
    throw new Error(`You are blacklisted ${scope}. Reason: ${blacklisted.reason}`);
  }

  const activeCount = await getActiveTicketCount(creator.id, departmentId, guild);
  if (activeCount >= ticketConfig.ticketLimitPerDepartment) {
    const existing = await getUserActiveTickets(creator.id, departmentId, guild);
    const refs = existing.map((t) => `#${String(t.ticketId).padStart(4, '0')}`).join(', ');
    throw new Error(
      `You already have ${ticketConfig.ticketLimitPerDepartment} active ticket(s) in ${deptConfig.name}: ${refs}`
    );
  }

  const ticketId = await getNextTicketId();
  const channelName = buildChannelName(departmentId, ticketId, creator.username);

  const permissionOverwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: creator.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
  ];

  if (deptConfig.supportRoleId) {
    permissionOverwrites.push({
      id: deptConfig.supportRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    });
  }

  for (const roleId of ticketConfig.staffRoles) {
    if (!permissionOverwrites.some((o) => o.id === roleId)) {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      });
    }
  }

  const parentId = deptConfig.categoryId || null;
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentId,
    permissionOverwrites,
    topic: '',
  });

  const answersArray = [];
  for (const [qId, answer] of Object.entries(answers)) {
    const q = deptConfig.questions.find((x) => x.id === qId);
    answersArray.push({
      questionId: qId,
      question: q?.label || qId,
      answer: answer || '',
    });
  }

  let reportedUserId = '';
  if (departmentId === 'reports') {
    reportedUserId = answers.target_user_id || '';
  }

  const ticket = await Ticket.create({
    ticketId,
    guildId: guild.id,
    channelId: channel.id,
    creatorId: creator.id,
    creatorTag: creator.tag || creator.username,
    departmentId,
    status: 'open',
    answers: answersArray,
    participants: [],
    reportedUserId,
    history: [
      {
        action: 'ticket_opened',
        performedBy: creator.tag || creator.username,
        newValue: deptConfig.name,
        timestamp: new Date(),
      },
    ],
  });

  await channel.setTopic(buildChannelTopic(ticket)).catch(() => null);

  const container = buildOpeningPanel(ticket, deptConfig, creator);

  if (deptConfig.supportRoleId) {
    channel.send({
      content: `<@&${deptConfig.supportRoleId}>`,
      allowedMentions: { roles: [deptConfig.supportRoleId] },
    }).catch(() => null);
  }

  channel.send({
    content: `<@${creator.id}>`,
    allowedMentions: { users: [creator.id] },
  }).catch(() => null);

  const sent = await channel.send({
    components: [container],
    flags: COMPONENTS_V2,
  }).catch((e) => { console.error('[TICKET] Failed to send opening panel:', e); return null; });

  if (sent) {
    await sent.pin().catch((e) => console.error('[TICKET] Failed to pin panel:', e.message));
  }

  logTicketAction(guild, 'ticket_opened', {
    ticketId,
    department: deptConfig.name,
    performedBy: creator.tag || creator.username,
    creatorId: creator.id,
    createdAt: ticket.createdAt,
    description: `Ticket #${String(ticket.ticketId).padStart(4, '0')} opened in ${deptConfig.name}`,
  }).catch(() => null);

  notifyOwner(guild, '🎫 Ticket Opened', {
    ticketId: `#${String(ticketId).padStart(4, '0')}`,
    user: `${creator.tag} (${creator.id})`,
    department: deptConfig.name,
    channel: `<#${channel.id}>`,
    color: ticketConfig.colors.primary,
  }).catch(() => null);

  return { ticket, channel };
}

export function buildOpeningPanel(ticket, deptConfig, creator) {
  const answersText = (ticket.answers || [])
    .map((a) => `**${a.question}:** ${a.answer || '*No answer*'}`)
    .join('\n');

  const statusLine = ticket.locked ? '🔒 Locked' : 'Open';
  const claimLine = ticket.claimedBy ? `\n**Claimed by:** <@${ticket.claimedBy}>` : '';

  const container = new ContainerBuilder()
    .setAccentColor(ticketConfig.colors.primary)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${deptConfig.emoji} **Ticket #${String(ticket.ticketId).padStart(4, '0')}** - ${deptConfig.name}`
      )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Opened by:** <@${ticket.creatorId}>\n**Status:** ${statusLine}${claimLine}\n**Created:** <t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:R>`
      )
    );

  if (answersText) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Questions & Answers**\n${answersText}`)
    );
  }

  if (deptConfig.openingMessage) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(deptConfig.openingMessage)
    );
  }

  const id = ticket.ticketId;

  if (ticket.locked) {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ticket:unlock:${id}`).setLabel('🔓 Unlock').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ticket:close:${id}`).setLabel('🔒 Close').setStyle(ButtonStyle.Danger)
      )
    );
  } else {
    const claimBtn = ticket.claimedBy
      ? new ButtonBuilder().setCustomId(`ticket:unclaim:${id}`).setLabel('🙋 Unclaim').setStyle(ButtonStyle.Secondary)
      : new ButtonBuilder().setCustomId(`ticket:claim:${id}`).setLabel('🙋 Claim').setStyle(ButtonStyle.Success);

    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        claimBtn,
        new ButtonBuilder().setCustomId(`ticket:lock:${id}`).setLabel('🔒 Lock').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ticket:close:${id}`).setLabel('❌ Close').setStyle(ButtonStyle.Danger)
      )
    );
  }

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ticket:request-close:${id}`).setLabel('📋 Request Close').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`ticket:alert:${id}`).setLabel('🔔 Alert').setStyle(ButtonStyle.Primary)
    )
  );

  return container;
}

export async function closeTicket(channel, closedBy, reason = 'No reason provided') {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const ticket = await Ticket.findOne({ channelId: channel.id, status: 'open' });
  if (!ticket) throw new Error('No open ticket found in this channel.');

  ticket.status = 'closed';
  ticket.closedAt = new Date();
  ticket.closedBy = closedBy.tag || closedBy.username || closedBy;
  ticket.closedById = closedBy.id || '';
  ticket.closeReason = reason;
  ticket.closeRequest = { active: false, requestedBy: '', requestedAt: null };

  ticket.history.push({
    action: 'ticket_closed',
    performedBy: closedBy.tag || closedBy.username || closedBy,
    reason,
    timestamp: new Date(),
  });

  await ticket.save();

  const deptConfig = getDeptConfig(ticket.departmentId);

  const creatorPerms = channel.permissionOverwrites.cache.get(ticket.creatorId);
  if (creatorPerms) {
    await channel.permissionOverwrites.edit(ticket.creatorId, {
      SendMessages: false,
    }).catch(() => null);
  }

  await Promise.all((ticket.participants || []).map(id => channel.permissionOverwrites.edit(id, { SendMessages: false }).catch(() => null)));

  const duration = ticket.closedAt && ticket.createdAt
    ? formatDurationMs(new Date(ticket.closedAt) - new Date(ticket.createdAt))
    : null;
  const firstResponse = ticket.firstStaffResponseAt
    ? formatDurationMs(new Date(ticket.firstStaffResponseAt) - new Date(ticket.createdAt))
    : null;

  logTicketAction(channel.guild, 'ticket_closed', {
    ticketId: ticket.ticketId,
    department: deptConfig?.name || ticket.departmentId,
    creatorId: ticket.creatorId,
    performedBy: closedBy.tag || closedBy.username || closedBy,
    closedById: closedBy.id || '',
    reason,
    createdAt: ticket.createdAt,
    closedAt: ticket.closedAt,
    duration,
    firstResponse,
    totalMessages: (ticket.staffMessageCount || 0) + (ticket.userMessageCount || 0),
    userMessages: ticket.userMessageCount || 0,
    staffMessages: ticket.staffMessageCount || 0,
  }).catch(() => null);

  notifyOwner(channel.guild, '🔒 Ticket Closed', {
    ticketId: `#${String(ticket.ticketId).padStart(4, '0')}`,
    performedBy: closedBy.tag || closedBy.username || String(closedBy),
    department: deptConfig?.name || ticket.departmentId,
    reason,
    color: ticketConfig.colors.error,
  }).catch(() => null);

  return ticket;
}

const CLOSE_DELETE_DELAY_MS = 10000;

export async function closeTicketAndDelete(channel, closedBy, reason = 'No reason provided') {
  const ticket = await closeTicket(channel, closedBy, reason);

  setTimeout(async () => {
    try {
      await channel.delete().catch(() => null);
    } catch (err) {
      console.error(`[CLOSE] Failed to delete channel for ticket #${ticket.ticketId}:`, err.message);
    }
  }, CLOSE_DELETE_DELAY_MS);

  return ticket;
}

function formatDurationMs(ms) {
  if (!ms || ms < 0) return 'N/A';
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

export async function reopenTicket(channel, reopenedBy) {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const ticket = await Ticket.findOne({ channelId: channel.id, status: 'closed' });
  if (!ticket) throw new Error('No closed ticket found in this channel.');

  const deptConfig = getDeptConfig(ticket.departmentId);

  ticket.status = 'open';
  ticket.closedAt = null;
  ticket.closedBy = '';
  ticket.closeReason = '';

  ticket.history.push({
    action: 'ticket_reopened',
    performedBy: reopenedBy.tag || reopenedBy.username || reopenedBy,
    timestamp: new Date(),
  });

  await ticket.save();

  await channel.permissionOverwrites.edit(ticket.creatorId, {
    SendMessages: true,
  }).catch(() => null);

  await Promise.all((ticket.participants || []).map(id => channel.permissionOverwrites.edit(id, { SendMessages: true }).catch(() => null)));

  if (deptConfig?.categoryId) {
    await channel.setParent(deptConfig.categoryId).catch(() => null);
  }

  await channel.setTopic(buildChannelTopic(ticket)).catch(() => null);

  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const openingMsg = messages?.find(
    (m) => m.author.id === channel.guild.members.me.id && m.components?.length > 0
  );
  if (openingMsg) {
    const container = buildOpeningPanel(ticket, deptConfig, { id: ticket.creatorId, tag: ticket.creatorTag });
    await openingMsg.edit({ components: [container], flags: COMPONENTS_V2 }).catch(() => null);
  }

  logTicketAction(channel.guild, 'ticket_reopened', {
    ticketId: ticket.ticketId,
    department: deptConfig?.name || ticket.departmentId,
    performedBy: reopenedBy.tag || reopenedBy.username || reopenedBy,
  }).catch(() => null);

  return ticket;
}

export async function deleteTicket(channel, deletedBy) {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const ticket = await Ticket.findOne({ channelId: channel.id });
  if (!ticket) throw new Error('No ticket found in this channel.');

  ticket.status = 'deleted';
  ticket.deletedAt = new Date();
  ticket.deletedBy = deletedBy.tag || deletedBy.username || deletedBy;

  ticket.history.push({
    action: 'ticket_deleted',
    performedBy: deletedBy.tag || deletedBy.username || deletedBy,
    timestamp: new Date(),
  });

  await ticket.save();

  const deptConfig = getDeptConfig(ticket.departmentId);
  logTicketAction(channel.guild, 'ticket_deleted', {
    ticketId: ticket.ticketId,
    department: deptConfig?.name || ticket.departmentId,
    performedBy: deletedBy.tag || deletedBy.username || deletedBy,
  }).catch(() => null);

  return ticket;
}

export async function addParticipant(channel, targetMember, addedBy) {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const ticket = await Ticket.findOne({ channelId: channel.id, status: 'open' });
  if (!ticket) throw new Error('No open ticket found.');

  if (ticket.departmentId === 'reports' && ticket.reportedUserId === targetMember.id) {
    throw new Error('WARNING: This user is the subject of this report. Are you sure? Use force-add to confirm.');
  }

  if (ticket.participants.includes(targetMember.id)) {
    throw new Error('That user is already in this ticket.');
  }

  await channel.permissionOverwrites.edit(targetMember.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true,
  });

  ticket.participants.push(targetMember.id);
  ticket.history.push({
    action: 'user_added',
    performedBy: addedBy.tag || addedBy.username || addedBy,
    targetId: targetMember.id,
    timestamp: new Date(),
  });
  await ticket.save();

  const deptConfig = getDeptConfig(ticket.departmentId);
  logTicketAction(channel.guild, 'user_added', {
    ticketId: ticket.ticketId,
    department: deptConfig?.name || ticket.departmentId,
    performedBy: addedBy.tag || addedBy.username || addedBy,
    targetUser: `${targetMember.user?.tag || targetMember.id}`,
  }).catch(() => null);

  return ticket;
}

export async function forceAddParticipant(channel, targetMember, addedBy) {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const ticket = await Ticket.findOne({ channelId: channel.id, status: 'open' });
  if (!ticket) throw new Error('No open ticket found.');

  if (ticket.participants.includes(targetMember.id)) {
    throw new Error('That user is already in this ticket.');
  }

  await channel.permissionOverwrites.edit(targetMember.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true,
  });

  ticket.participants.push(targetMember.id);
  ticket.history.push({
    action: 'user_added',
    performedBy: addedBy.tag || addedBy.username || addedBy,
    targetId: targetMember.id,
    reason: 'Force-added (reported user)',
    timestamp: new Date(),
  });
  await ticket.save();

  return ticket;
}

export async function removeParticipant(channel, targetMember, removedBy) {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const ticket = await Ticket.findOne({ channelId: channel.id, status: 'open' });
  if (!ticket) throw new Error('No open ticket found.');

  if (targetMember.id === ticket.creatorId) {
    throw new Error('Cannot remove the ticket creator.');
  }

  if (targetMember.id === channel.guild.members.me.id) {
    throw new Error('Cannot remove the bot.');
  }

  await channel.permissionOverwrites.edit(targetMember.id, {
    ViewChannel: false,
    SendMessages: false,
    ReadMessageHistory: false,
  }).catch(() => null);

  ticket.participants = ticket.participants.filter((id) => id !== targetMember.id);
  ticket.history.push({
    action: 'user_removed',
    performedBy: removedBy.tag || removedBy.username || removedBy,
    targetId: targetMember.id,
    timestamp: new Date(),
  });
  await ticket.save();

  const deptConfig = getDeptConfig(ticket.departmentId);
  logTicketAction(channel.guild, 'user_removed', {
    ticketId: ticket.ticketId,
    department: deptConfig?.name || ticket.departmentId,
    performedBy: removedBy.tag || removedBy.username || removedBy,
    targetUser: `${targetMember.user?.tag || targetMember.id}`,
  }).catch(() => null);

  return ticket;
}

export async function moveTicket(channel, newDepartmentId, movedBy) {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const newDept = getDeptConfig(newDepartmentId);
  if (!newDept || !newDept.enabled) throw new Error('Invalid or disabled department.');

  const ticket = await Ticket.findOne({ channelId: channel.id, status: 'open' });
  if (!ticket) throw new Error('No open ticket found.');

  const oldDept = getDeptConfig(ticket.departmentId);
  const oldDepartmentId = ticket.departmentId;

  if (newDept.supportRoleId) {
    await channel.permissionOverwrites.edit(newDept.supportRoleId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });
  }

  if (oldDept?.supportRoleId && oldDept.supportRoleId !== newDept.supportRoleId) {
    await channel.permissionOverwrites.delete(oldDept.supportRoleId).catch(() => null);
  }

  if (newDept.categoryId) {
    await channel.setParent(newDept.categoryId).catch(() => null);
  }

  ticket.departmentId = newDepartmentId;
  ticket.history.push({
    action: 'department_moved',
    performedBy: movedBy.tag || movedBy.username || movedBy,
    oldValue: oldDept?.name || oldDepartmentId,
    newValue: newDept.name,
    timestamp: new Date(),
  });
  await ticket.save();

  await channel.setTopic(buildChannelTopic(ticket)).catch(() => null);

  const channelPrefix = ticketConfig.channelNaming.prefixes[newDepartmentId] || newDepartmentId;
  const newName = `${channelPrefix}-${String(ticket.ticketId).padStart(4, '0')}`.slice(0, 100);
  await channel.setName(newName).catch(() => null);

  logTicketAction(channel.guild, 'department_moved', {
    ticketId: ticket.ticketId,
    performedBy: movedBy.tag || movedBy.username || movedBy,
    oldValue: oldDept?.name || oldDepartmentId,
    newValue: newDept.name,
  }).catch(() => null);

  notifyOwner(channel.guild, '📦 Ticket Moved', {
    ticketId: `#${String(ticket.ticketId).padStart(4, '0')}`,
    performedBy: movedBy.tag || movedBy.username || String(movedBy),
    oldValue: oldDept?.name || oldDepartmentId,
    newValue: newDept.name,
    color: newDept.color,
  }).catch(() => null);

  return ticket;
}

export async function renameTicket(channel, newName, renamedBy) {
  const ticket = await Ticket.findOne({ channelId: channel.id });
  if (!ticket) throw new Error('No ticket found in this channel.');

  const cleanName = sanitizeChannelName(newName);
  if (!cleanName) throw new Error('Invalid channel name.');

  const full = `${cleanName}-${String(ticket.ticketId).padStart(4, '0')}`.slice(0, 100);
  const oldName = channel.name;
  await channel.setName(full).catch(() => null);

  ticket.history.push({
    action: 'channel_renamed',
    performedBy: renamedBy.tag || renamedBy.username || renamedBy,
    oldValue: oldName,
    newValue: full,
    timestamp: new Date(),
  });
  await ticket.save();

  return ticket;
}

export async function requestClose(channel, requestedBy, reason = '') {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const ticket = await Ticket.findOne({ channelId: channel.id, status: 'open' });
  if (!ticket) throw new Error('No open ticket found.');

  if (ticket.closeRequest?.active) {
    throw new Error('A close request is already active.');
  }

  ticket.closeRequest = {
    active: true,
    requestedBy: requestedBy.tag || requestedBy.username || requestedBy,
    requestedAt: new Date(),
    reason: reason || '',
  };
  ticket.history.push({
    action: 'close_requested',
    performedBy: requestedBy.tag || requestedBy.username || requestedBy,
    timestamp: new Date(),
  });
  await ticket.save();

  const deptConfig = getDeptConfig(ticket.departmentId);
  logTicketAction(channel.guild, 'close_requested', {
    ticketId: ticket.ticketId,
    department: deptConfig?.name || ticket.departmentId,
    performedBy: requestedBy.tag || requestedBy.username || requestedBy,
  }).catch(() => null);

  return ticket;
}

export async function handleAlert(channel, sentBy) {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const ticket = await Ticket.findOne({ channelId: channel.id, status: 'open' });
  if (!ticket) throw new Error('No open ticket found.');

  const cooldown = ticketConfig.alertCooldownSeconds * 1000;
  if (ticket.lastAlertAt && Date.now() - new Date(ticket.lastAlertAt).getTime() < cooldown) {
    const remaining = Math.ceil(
      (cooldown - (Date.now() - new Date(ticket.lastAlertAt).getTime())) / 1000
    );
    throw new Error(`Alert cooldown active. Try again in ${remaining}s.`);
  }

  ticket.lastAlertAt = new Date();
  ticket.alertCount = (ticket.alertCount || 0) + 1;
  ticket.history.push({
    action: 'alert_sent',
    performedBy: sentBy.tag || sentBy.username || sentBy,
    timestamp: new Date(),
  });
  await ticket.save();

  const member = await channel.guild.members.fetch(ticket.creatorId).catch(() => null);
  let dmFailed = false;

  if (member) {
    await channel.send({
      content: `<@${ticket.creatorId}>`,
      allowedMentions: { users: [ticket.creatorId] },
    }).catch(() => null);

    const dmEmbed = new EmbedBuilder()
      .setTitle('🔔 Ticket Alert')
      .setDescription(`Staff are waiting for your response in Ticket #${String(ticket.ticketId).padStart(4, '0')}.`)
      .setColor(ticketConfig.colors.primary)
      .setTimestamp();

    const dmResult = await member.send({ embeds: [dmEmbed], components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Open Ticket').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${channel.guild.id}/${channel.id}`)
    )] }).catch(() => null);
    dmFailed = !dmResult;
  } else {
    dmFailed = true;
  }

  const deptConfig = getDeptConfig(ticket.departmentId);
  logTicketAction(channel.guild, 'alert_sent', {
    ticketId: ticket.ticketId,
    department: deptConfig?.name || ticket.departmentId,
    performedBy: sentBy.tag || sentBy.username || sentBy,
    extra: dmFailed ? 'DM delivery failed' : 'DM delivered',
  }).catch(() => null);

  return { ticket, dmFailed };
}

export async function handlePingSupport(channel, sentBy) {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const ticket = await Ticket.findOne({ channelId: channel.id, status: 'open' });
  if (!ticket) throw new Error('No open ticket found.');

  const deptConfig = getDeptConfig(ticket.departmentId);
  if (!deptConfig?.supportRoleId) throw new Error('No support role configured for this department.');

  ticket.history.push({
    action: 'role_pinged',
    performedBy: sentBy.tag || sentBy.username || sentBy,
    timestamp: new Date(),
  });
  await ticket.save();

  await channel.send({
    content: `<@&${deptConfig.supportRoleId}>`,
    allowedMentions: { roles: [deptConfig.supportRoleId] },
  }).catch(() => null);

  logTicketAction(channel.guild, 'role_pinged', {
    ticketId: ticket.ticketId,
    department: deptConfig.name,
    performedBy: sentBy.tag || sentBy.username || sentBy,
  }).catch(() => null);

  return ticket;
}

export async function blacklistUser(userId, reason, addedBy, departmentId = 'global', expiresAt = null) {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const entry = await TicketBlacklist.findOneAndUpdate(
    { userId, departmentId },
    {
      userId,
      departmentId,
      reason,
      addedBy: addedBy.tag || addedBy.username || addedBy,
      addedById: addedBy.id || '',
      expiresAt,
      active: true,
      removedBy: '',
      removedAt: null,
    },
    { upsert: true, new: true }
  );

  return entry;
}

export async function unblacklistUser(userId, departmentId, removedBy) {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const query = { userId, active: true };
  if (departmentId) query.departmentId = departmentId;

  const result = await TicketBlacklist.findOneAndUpdate(query, {
    active: false,
    removedBy: removedBy?.tag || removedBy?.username || 'Unknown',
    removedAt: new Date(),
  });

  return result;
}

export async function getBlacklistEntries(userId) {
  if (!isMongoConnected()) return [];
  return TicketBlacklist.find({ userId }).sort({ createdAt: -1 });
}

export async function purgeMessages(channel, count, purgedBy) {
  if (count < 1 || count > 100) throw new Error('Count must be between 1 and 100.');

  const deleted = await channel.bulkDelete(count, true).catch(() => null);
  const actual = deleted?.size || 0;

  const ticket = await Ticket.findOne({ channelId: channel.id }).catch(() => null);
  if (ticket) {
    ticket.history.push({
      action: 'messages_purged',
      performedBy: purgedBy.tag || purgedBy.username || purgedBy,
      newValue: String(actual),
      timestamp: new Date(),
    });
    await ticket.save();
  }

  const deptConfig = ticket ? getDeptConfig(ticket.departmentId) : null;
  logTicketAction(channel.guild, 'messages_purged', {
    ticketId: ticket?.ticketId,
    department: deptConfig?.name,
    performedBy: purgedBy.tag || purgedBy.username || purgedBy,
    newValue: `${actual} messages`,
  }).catch(() => null);

  return actual;
}

export async function recordMessage(message) {
  if (!isMongoConnected()) return;

  const ticket = await Ticket.findOne({ channelId: message.channel.id, status: { $in: ['open', 'closing'] } }).lean();
  if (!ticket) return;

  const member = message.member;
  const staffMember = member ? isStaff(member) : false;

  const setFields = {};
  if (staffMember && !ticket.firstStaffResponseAt) {
    setFields.firstStaffResponseAt = new Date();
    setFields.firstStaffResponderId = message.author.id;
  }

  const incFields = {};
  if (staffMember) {
    incFields.staffMessageCount = 1;
  } else {
    incFields.userMessageCount = 1;
    setFields.lastUserMessageAt = new Date();
    setFields.autoCloseWarned = false;
  }

  const update = {};
  if (Object.keys(setFields).length > 0) update.$set = setFields;
  if (Object.keys(incFields).length > 0) update.$inc = incFields;
  update.$push = {
    history: {
      $each: [{
        action: 'message_recorded',
        performedBy: message.author.tag || message.author.username,
        newValue: (message.content || '').slice(0, 200) || '[No text content]',
        timestamp: new Date(),
      }],
      $slice: -500,
    },
  };

  await Ticket.findOneAndUpdate({ _id: ticket._id }, update).catch(() => null);
}

export async function getStats(guildId, filters = {}) {
  if (!isMongoConnected()) return null;

  const match = { guildId };
  if (filters.departmentId) match.departmentId = filters.departmentId;
  if (filters.creatorId) match.creatorId = filters.creatorId;
  if (filters.status) match.status = filters.status;

  const aggResult = await Ticket.aggregate([
    { $match: match },
    {
      $facet: {
        totals: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],
        byDepartment: [
          { $match: { status: 'open' } },
          { $group: { _id: '$departmentId', count: { $sum: 1 } } },
        ],
      },
    },
  ]);

  const facet = aggResult[0] || { totals: [], byDepartment: [] };
  const statusCounts = {};
  for (const doc of facet.totals) {
    statusCounts[doc._id] = doc.count;
  }

  const total = Object.values(statusCounts).reduce((sum, c) => sum + c, 0);
  const open = statusCounts.open || 0;
  const closed = statusCounts.closed || 0;

  const byDepartment = {};
  for (const doc of facet.byDepartment) {
    byDepartment[doc._id] = doc.count;
  }

  return { total, open, closed, byDepartment };
}

export async function recoverTickets(guild) {
  if (!isMongoConnected()) return;

  const stuck = await Ticket.find({ status: { $in: ['creating', 'closing'] } }).catch(() => []);
  for (const ticket of stuck) {
    const oldStatus = ticket.status;
    const newStatus = oldStatus === 'creating' ? 'open' : 'closed';
    ticket.status = newStatus;
    ticket.history.push({
      action: 'status_recovered',
      performedBy: 'System',
      oldValue: oldStatus,
      newValue: newStatus,
      reason: 'Bot restart recovery',
      timestamp: new Date(),
    });
    await ticket.save().catch((err) => {
      console.error(`[RECOVERY] Failed to recover ticket #${ticket.ticketId}:`, err.message);
    });
  }

  const openTickets = await Ticket.find({ status: 'open' }).catch(() => []);
  for (const ticket of openTickets) {
    if (!ticket.channelId) continue;
    const channel = guild.channels.cache.get(ticket.channelId);
    if (!channel) {
      ticket.status = 'deleted';
      ticket.deletedAt = new Date();
      ticket.deletedBy = 'System (recovery)';
      ticket.history.push({
        action: 'ticket_deleted',
        performedBy: 'System (recovery)',
        reason: 'Channel not found after restart - auto-cleaned',
        timestamp: new Date(),
      });
      await ticket.save().catch((err) => {
        console.error(`[RECOVERY] Failed to clean orphan #${ticket.ticketId}:`, err.message);
      });
      console.log(`[RECOVERY] Cleaned orphaned ticket #${ticket.ticketId} (channel missing)`);
    }
  }
}

export async function getTicketByChannelId(channelId) {
  if (!isMongoConnected()) return null;
  return Ticket.findOne({ channelId });
}

export async function getTicketById(ticketId) {
  if (!isMongoConnected()) return null;
  return Ticket.findOne({ ticketId });
}

export async function claimTicket(channel, claimedBy) {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const ticket = await Ticket.findOne({ channelId: channel.id, status: 'open' });
  if (!ticket) throw new Error('No open ticket found in this channel.');
  if (ticket.claimedBy) throw new Error(`This ticket is already claimed by <@${ticket.claimedBy}>.`);

  ticket.claimedBy = claimedBy.id;
  ticket.claimedAt = new Date();
  ticket.history.push({
    action: 'ticket_claimed',
    performedBy: claimedBy.tag || claimedBy.username,
    timestamp: new Date(),
  });
  await ticket.save();

  const deptConfig = getDeptConfig(ticket.departmentId);
  const container = buildOpeningPanel(ticket, deptConfig, { id: ticket.creatorId, tag: ticket.creatorTag });
  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const openingMsg = messages?.find(
    (m) => m.author.id === channel.guild.members.me.id && m.components?.length > 0
  );
  if (openingMsg) {
    await openingMsg.edit({ components: [container], flags: COMPONENTS_V2 }).catch(() => null);
  }

  logTicketAction(channel.guild, 'ticket_claimed', {
    ticketId: ticket.ticketId,
    department: deptConfig?.name || ticket.departmentId,
    performedBy: claimedBy.tag || claimedBy.username,
  }).catch(() => null);

  notifyOwner(channel.guild, '🙋 Ticket Claimed', {
    ticketId: `#${String(ticket.ticketId).padStart(4, '0')}`,
    performedBy: claimedBy.tag || claimedBy.username,
    department: deptConfig?.name || ticket.departmentId,
    color: ticketConfig.colors.success,
  }).catch(() => null);

  return ticket;
}

export async function unclaimTicket(channel, unclaimedBy) {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const ticket = await Ticket.findOne({ channelId: channel.id, status: 'open' });
  if (!ticket) throw new Error('No open ticket found in this channel.');
  if (!ticket.claimedBy) throw new Error('This ticket is not claimed.');

  const prevClaimer = ticket.claimedBy;
  ticket.claimedBy = '';
  ticket.claimedAt = null;
  ticket.history.push({
    action: 'ticket_unclaimed',
    performedBy: unclaimedBy.tag || unclaimedBy.username,
    targetId: prevClaimer,
    timestamp: new Date(),
  });
  await ticket.save();

  const deptConfig = getDeptConfig(ticket.departmentId);
  const container = buildOpeningPanel(ticket, deptConfig, { id: ticket.creatorId, tag: ticket.creatorTag });
  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const openingMsg = messages?.find(
    (m) => m.author.id === channel.guild.members.me.id && m.components?.length > 0
  );
  if (openingMsg) {
    await openingMsg.edit({ components: [container], flags: COMPONENTS_V2 }).catch(() => null);
  }

  logTicketAction(channel.guild, 'ticket_unclaimed', {
    ticketId: ticket.ticketId,
    department: deptConfig?.name || ticket.departmentId,
    performedBy: unclaimedBy.tag || unclaimedBy.username,
  }).catch(() => null);

  notifyOwner(channel.guild, '🙋 Ticket Unclaimed', {
    ticketId: `#${String(ticket.ticketId).padStart(4, '0')}`,
    performedBy: unclaimedBy.tag || unclaimedBy.username,
    department: deptConfig?.name || ticket.departmentId,
    color: ticketConfig.colors.warn,
  }).catch(() => null);

  return ticket;
}

export async function lockTicket(channel, lockedBy) {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const ticket = await Ticket.findOne({ channelId: channel.id, status: 'open' });
  if (!ticket) throw new Error('No open ticket found in this channel.');
  if (ticket.locked) throw new Error('Ticket is already locked.');

  ticket.locked = true;
  ticket.lockedBy = lockedBy.id;
  ticket.lockedAt = new Date();
  ticket.history.push({
    action: 'ticket_locked',
    performedBy: lockedBy.tag || lockedBy.username,
    timestamp: new Date(),
  });
  await ticket.save();

  await channel.permissionOverwrites.edit(ticket.creatorId, { SendMessages: false }).catch(() => null);
  await Promise.all((ticket.participants || []).map(id => channel.permissionOverwrites.edit(id, { SendMessages: false }).catch(() => null)));

  const deptConfig = getDeptConfig(ticket.departmentId);
  const container = buildOpeningPanel(ticket, deptConfig, { id: ticket.creatorId, tag: ticket.creatorTag });
  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const openingMsg = messages?.find(
    (m) => m.author.id === channel.guild.members.me.id && m.components?.length > 0
  );
  if (openingMsg) {
    await openingMsg.edit({ components: [container], flags: COMPONENTS_V2 }).catch(() => null);
  }

  logTicketAction(channel.guild, 'ticket_locked', {
    ticketId: ticket.ticketId,
    department: deptConfig?.name || ticket.departmentId,
    performedBy: lockedBy.tag || lockedBy.username,
  }).catch(() => null);

  notifyOwner(channel.guild, '🔒 Ticket Locked', {
    ticketId: `#${String(ticket.ticketId).padStart(4, '0')}`,
    performedBy: lockedBy.tag || lockedBy.username,
    department: deptConfig?.name || ticket.departmentId,
    color: ticketConfig.colors.warn,
  }).catch(() => null);

  return ticket;
}

export async function unlockTicket(channel, unlockedBy) {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const ticket = await Ticket.findOne({ channelId: channel.id, status: 'open' });
  if (!ticket) throw new Error('No open ticket found in this channel.');
  if (!ticket.locked) throw new Error('Ticket is not locked.');

  ticket.locked = false;
  ticket.lockedBy = '';
  ticket.lockedAt = null;
  ticket.history.push({
    action: 'ticket_unlocked',
    performedBy: unlockedBy.tag || unlockedBy.username,
    timestamp: new Date(),
  });
  await ticket.save();

  await channel.permissionOverwrites.edit(ticket.creatorId, { SendMessages: true }).catch(() => null);
  await Promise.all((ticket.participants || []).map(id => channel.permissionOverwrites.edit(id, { SendMessages: true }).catch(() => null)));

  const deptConfig = getDeptConfig(ticket.departmentId);
  const container = buildOpeningPanel(ticket, deptConfig, { id: ticket.creatorId, tag: ticket.creatorTag });
  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const openingMsg = messages?.find(
    (m) => m.author.id === channel.guild.members.me.id && m.components?.length > 0
  );
  if (openingMsg) {
    await openingMsg.edit({ components: [container], flags: COMPONENTS_V2 }).catch(() => null);
  }

  logTicketAction(channel.guild, 'ticket_unlocked', {
    ticketId: ticket.ticketId,
    department: deptConfig?.name || ticket.departmentId,
    performedBy: unlockedBy.tag || unlockedBy.username,
  }).catch(() => null);

  notifyOwner(channel.guild, '🔓 Ticket Unlocked', {
    ticketId: `#${String(ticket.ticketId).padStart(4, '0')}`,
    performedBy: unlockedBy.tag || unlockedBy.username,
    department: deptConfig?.name || ticket.departmentId,
    color: ticketConfig.colors.success,
  }).catch(() => null);

  return ticket;
}

export async function autoCloseCheck(guild) {
  if (!isMongoConnected()) return;

  const inactiveMs = (ticketConfig.autoCloseInactiveHours || 48) * 60 * 60 * 1000;
  const warnMs = (ticketConfig.autoCloseWarnHours || 6) * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - inactiveMs);
  const warnCutoff = new Date(Date.now() - (inactiveMs - warnMs));

  const stale = await Ticket.find({
    status: 'open',
    lastUserMessageAt: { $lte: cutoff },
    autoCloseWarned: false,
  });

  for (const ticket of stale) {
    if (!ticket.channelId) continue;
    const channel = guild.channels.cache.get(ticket.channelId);
    if (!channel) continue;

    await channel.send({
      content: `<@${ticket.creatorId}> This ticket has been inactive for a while and will be auto-closed in ${(warnMs / 3600000).toFixed(0)} hours. Send a message to keep it open.`,
      allowedMentions: { users: [ticket.creatorId] },
    }).catch(() => null);

    ticket.autoCloseWarned = true;
    await ticket.save();
  }

  const expired = await Ticket.find({
    status: 'open',
    lastUserMessageAt: { $lte: cutoff },
    autoCloseWarned: true,
  });

  for (const ticket of expired) {
    if (!ticket.channelId) continue;
    const channel = guild.channels.cache.get(ticket.channelId);
    if (!channel) continue;

    try {
      await closeTicketAndDelete(channel, guild.members.me, 'Auto-closed due to inactivity.');
    } catch (err) {
      console.error(`[AUTOCLOSE] Failed to close ticket #${ticket.ticketId}:`, err.message);
    }
  }
}

export async function cleanOrphanedTickets(guild, ticketId = null) {
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const query = { status: { $in: ['open', 'closed'] } };
  if (ticketId) query.ticketId = ticketId;

  const tickets = await Ticket.find(query);
  const cleaned = [];
  const cleanedIds = [];

  for (const ticket of tickets) {
    if (!ticket.channelId) continue;
    const channel = guild.channels.cache.get(ticket.channelId);
    if (channel) continue;

    ticket.status = 'deleted';
    ticket.deletedAt = new Date();
    ticket.deletedBy = `System (clean by ${ticketId ? 'manual' : 'sweep'})`;
    ticket.history.push({
      action: 'ticket_deleted',
      performedBy: `System (clean by ${ticketId ? 'manual' : 'sweep'})`,
      reason: 'Channel does not exist - cleaned from database',
      timestamp: new Date(),
    });
    await ticket.save().catch(() => null);
    cleaned.push(ticket.ticketId);
    cleanedIds.push(ticket.ticketId);
  }

  if (ticketId && cleaned.length === 0) {
    throw new Error(`Ticket #${String(ticketId).padStart(4, '0')} was not found or its channel still exists.`);
  }

  return { cleaned: cleaned.length, ids: cleanedIds };
}
