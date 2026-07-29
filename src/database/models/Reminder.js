import { Schema, model } from 'mongoose';

const reminderSchema = new Schema({
  userId: { type: String, required: true },
  channelId: { type: String, required: true },
  guildId: { type: String, required: true },
  message: { type: String, default: 'Time for your reminder!' },
  intervalMinutes: { type: Number, default: 5, min: 1, max: 1440 },
  active: { type: Boolean, default: true },
  createdBy: { type: String, required: true },
  lastPingedAt: { type: Date, default: null },
  lastResponseAt: { type: Date, default: null },
  cycleStart: { type: Date, default: Date.now },
  totalPingsSent: { type: Number, default: 0 },
  totalResponses: { type: Number, default: 0 },
}, { timestamps: true });

reminderSchema.index({ guildId: 1, active: 1 });
reminderSchema.index({ userId: 1, active: 1 });
reminderSchema.index({ channelId: 1, active: 1 });

export const Reminder = model('Reminder', reminderSchema);
