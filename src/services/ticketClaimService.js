import { Ticket } from '../database/models/Ticket.js';
import { ticketConfig } from '../config/tickets.js';
import { isMongoConnected } from './mongodb.js';
import { logTicketAction } from './ticketLoggingService.js';
import { notifyOwner } from './ownerNotify.js';
import { COMPONENTS_V2 } from '../config/constants.js';
import { getDeptConfig } from './ticketQueryService.js';
import { buildOpeningPanel } from './ticketCreationService.js';

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
