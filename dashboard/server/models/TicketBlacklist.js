import mongoose from 'mongoose';

const ticketBlacklistSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  departmentId: { type: String, default: 'global' },
  reason: { type: String, default: 'No reason provided' },
  addedBy: { type: String, required: true },
  addedById: { type: String, default: '' },
  expiresAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
  removedBy: { type: String, default: '' },
  removedAt: Date,
}, { timestamps: true });

export default mongoose.models.TicketBlacklist || mongoose.model('TicketBlacklist', ticketBlacklistSchema);
