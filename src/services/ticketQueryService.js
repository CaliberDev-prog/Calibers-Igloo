import { Ticket } from '../database/models/Ticket.js';
import { ticketConfig } from '../config/tickets.js';
import { isMongoConnected } from './mongodb.js';
import { isStaff } from '../utils/ticketPermissions.js';

export function getDeptConfig(departmentId) {
  return ticketConfig.departments[departmentId] || null;
}

export function formatDurationMs(ms) {
  if (!ms || ms < 0) return 'N/A';
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

export async function getTicketByChannelId(channelId) {
  if (!isMongoConnected()) return null;
  return Ticket.findOne({ channelId });
}

export async function getTicketById(ticketId) {
  if (!isMongoConnected()) return null;
  return Ticket.findOne({ ticketId });
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
