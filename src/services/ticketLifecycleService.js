import { Ticket } from '../database/models/Ticket.js';
import { ticketConfig } from '../config/tickets.js';
import { isMongoConnected } from './mongodb.js';
import { logTicketAction } from './ticketLoggingService.js';
import { buildChannelTopic } from '../utils/ticketNaming.js';
import { notifyOwner } from './ownerNotify.js';
import { COMPONENTS_V2 } from '../config/constants.js';
import { getDeptConfig, formatDurationMs } from './ticketQueryService.js';
import { buildOpeningPanel } from './ticketCreationService.js';

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
