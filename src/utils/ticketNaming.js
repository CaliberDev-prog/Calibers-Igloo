import { ticketConfig } from '../config/tickets.js';

const MAX_CHANNEL_NAME = 100;

export function sanitizeChannelName(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_CHANNEL_NAME);
}

export function buildChannelName(departmentId, ticketId, creatorUsername) {
  const ticketNum = String(ticketId).padStart(4, '0');
  const base = `ticket-${ticketNum}`;
  return base.slice(0, MAX_CHANNEL_NAME);
}

export function buildChannelTopic(ticket) {
  const dept = ticketConfig.departments[ticket.departmentId];
  const deptName = dept?.name || ticket.departmentId;
  const status = ticket.status?.toUpperCase() || 'OPEN';
  return `Ticket ID: ${String(ticket.ticketId).padStart(4, '0')} | Owner: ${ticket.creatorId} | Department: ${deptName} | Status: ${status}`;
}

export function parseTicketIdFromChannel(channelName) {
  const match = channelName?.match(/(\d{4,})$/);
  return match ? parseInt(match[1], 10) : null;
}
