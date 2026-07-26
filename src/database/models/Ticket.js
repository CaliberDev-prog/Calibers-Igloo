import { Schema, model } from 'mongoose';

const historyEntrySchema = new Schema(
  {
    action: { type: String, required: true },
    performedBy: { type: String, required: true },
    targetId: { type: String, default: '' },
    oldValue: { type: String, default: '' },
    newValue: { type: String, default: '' },
    reason: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const answerSchema = new Schema(
  {
    questionId: { type: String, default: '' },
    question: { type: String, default: '' },
    answer: { type: String, default: '' },
  },
  { _id: false }
);

const transcriptSchema = new Schema(
  {
    generated: { type: Boolean, default: false },
    filename: { type: String, default: '' },
    generatedAt: { type: Date },
    generatedBy: { type: String, default: '' },
    logMessageId: { type: String, default: '' },
    dmDelivered: { type: Boolean, default: false },
  },
  { _id: false }
);

const closeRequestSchema = new Schema(
  {
    active: { type: Boolean, default: false },
    requestedBy: { type: String, default: '' },
    requestedAt: { type: Date },
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const ticketSchema = new Schema(
  {
    ticketId: { type: Number, required: true, unique: true },
    guildId: { type: String, required: true },
    channelId: { type: String, default: '' },
    creatorId: { type: String, required: true },
    creatorTag: { type: String, default: '' },
    departmentId: { type: String, default: '' },

    status: {
      type: String,
      enum: ['creating', 'open', 'closing', 'closed', 'deleted'],
      default: 'creating',
    },

    answers: [answerSchema],
    participants: [{ type: String }],
    reportedUserId: { type: String, default: '' },

    closedAt: Date,
    closedBy: { type: String, default: '' },
    closedById: { type: String, default: '' },
    closeReason: { type: String, default: '' },
    deletedAt: Date,
    deletedBy: { type: String, default: '' },

    firstStaffResponseAt: Date,
    firstStaffResponderId: { type: String, default: '' },
    staffMessageCount: { type: Number, default: 0 },
    userMessageCount: { type: Number, default: 0 },

    lastAlertAt: Date,
    alertCount: { type: Number, default: 0 },

    claimedBy: { type: String, default: '' },
    claimedAt: Date,

    locked: { type: Boolean, default: false },
    lockedBy: { type: String, default: '' },
    lockedAt: Date,

    lastUserMessageAt: Date,
    autoCloseWarned: { type: Boolean, default: false },

    closeRequest: closeRequestSchema,
    transcript: transcriptSchema,
    history: [historyEntrySchema],
  },
  { timestamps: true }
);

ticketSchema.index({ creatorId: 1, departmentId: 1, status: 1 });
ticketSchema.index({ channelId: 1 });
ticketSchema.index({ guildId: 1, status: 1 });
ticketSchema.index({ guildId: 1, departmentId: 1, status: 1 });
ticketSchema.index({ status: 1, lastUserMessageAt: 1 });
ticketSchema.index({ status: 1, createdAt: 1 });
ticketSchema.index({ creatorId: 1, status: 1 });

export const Ticket = model('Ticket', ticketSchema);
