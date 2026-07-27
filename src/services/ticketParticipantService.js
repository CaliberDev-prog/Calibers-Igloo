import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Ticket } from '../database/models/Ticket.js';
import { ticketConfig } from '../config/tickets.js';
import { isMongoConnected } from './mongodb.js';
import { logTicketAction } from './ticketLoggingService.js';
import { buildChannelTopic, sanitizeChannelName } from '../utils/ticketNaming.js';
import { notifyOwner } from './ownerNotify.js';
import { getDeptConfig } from './ticketQueryService.js';

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
