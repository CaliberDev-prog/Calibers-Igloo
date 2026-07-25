import { Schema, model } from 'mongoose';

const ticketBlacklistSchema = new Schema(
  {
    userId: { type: String, required: true },
    departmentId: { type: String, default: 'global' },
    reason: { type: String, default: 'No reason provided' },
    addedBy: { type: String, required: true },
    addedById: { type: String, default: '' },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    removedBy: { type: String, default: '' },
    removedAt: { type: Date },
  },
  { timestamps: true }
);

ticketBlacklistSchema.index({ userId: 1, departmentId: 1 });
ticketBlacklistSchema.index({ userId: 1, active: 1 });

export const TicketBlacklist = model('TicketBlacklist', ticketBlacklistSchema);
