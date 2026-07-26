import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const schema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['owner', 'developer', 'manager', 'moderator', 'support', 'analyst'],
    default: 'support',
  },
}, { timestamps: true, toJSON: { transform: (doc, ret) => { delete ret.passwordHash; return ret; } } });

schema.methods.checkPassword = async function (plain) {
  return bcryptjs.compare(plain, this.passwordHash);
};

schema.statics.createUser = async function (userId, username, password, role = 'support') {
  const passwordHash = await bcryptjs.hash(password, 12);
  return this.create({ userId, username: username.toLowerCase(), passwordHash, role });
};

export default mongoose.model('DashboardUser', schema);
