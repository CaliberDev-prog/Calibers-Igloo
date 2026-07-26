import { Schema, model } from 'mongoose';

const giveawaySchema = new Schema(
  {
    messageId: { type: String, default: '' },
    channelId: { type: String, default: '' },
    guildId: { type: String, default: '' },
    prize: { type: String, required: true },
    description: { type: String, default: '' },
    winners: { type: Number, default: 1 },
    hostId: { type: String, default: '' },
    hostTag: { type: String, default: '' },
    status: { type: String, enum: ['active', 'ended', 'cancelled'], default: 'active' },
    entries: [{ type: String }],
    winnerIds: [{ type: String }],
    endedAt: { type: Date },
    endAt: { type: Date },
    requirementRoleId: { type: String, default: '' },
    requirementMinMessages: { type: Number, default: 0 },
  },
  { timestamps: true }
);

giveawaySchema.index({ guildId: 1, status: 1 });
giveawaySchema.index({ endAt: 1, status: 1 });
giveawaySchema.index({ messageId: 1, status: 1 });

export const Giveaway = model('Giveaway', giveawaySchema);
