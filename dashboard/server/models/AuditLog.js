import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  category: { type: String, default: 'general' },
  description: String,
  userId: String,
  username: String,
  target: String,
  targetId: String,
  metadata: { type: Map, of: String },
  ip: String,
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ category: 1 });
auditLogSchema.index({ userId: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
