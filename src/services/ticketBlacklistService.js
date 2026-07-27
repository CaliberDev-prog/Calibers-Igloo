import { TicketBlacklist } from '../database/models/TicketBlacklist.js';
import { isMongoConnected } from './mongodb.js';

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
