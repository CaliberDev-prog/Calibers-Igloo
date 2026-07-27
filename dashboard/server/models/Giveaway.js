import mongoose from 'mongoose';

const giveawaySchema = new mongoose.Schema({
  messageId: { type: String, default: '' },
  channelId: { type: String, default: '' },
  guildId: { type: String, default: '' },
  prize: { type: String, required: true },
  description: { type: String, default: '' },
  winners: { type: Number, default: 1 },
  hostId: { type: String, default: '' },
  hostTag: { type: String, default: '' },
  status: { type: String, enum: ['active', 'ended', 'cancelled'], default: 'active' },
  entries: [String],
  winnerIds: [String],
  endedAt: Date,
  endAt: Date,
  requirementRoleId: { type: String, default: '' },
  requirementMinMessages: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Giveaway || mongoose.model('Giveaway', giveawaySchema);
