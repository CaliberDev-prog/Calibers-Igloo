import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  revokedAt: { type: Date, default: Date.now },
  reason: {
    type: String,
    enum: ['logout', 'rotation', 'replay', 'password_change', 'role_change', 'admin_revoke'],
    required: true,
  },
}, {
  timestamps: false,
  expireAfterSeconds: 8 * 24 * 60 * 60,
});

schema.index({ userId: 1, revokedAt: -1 });

export default mongoose.model('RevokedToken', schema);
