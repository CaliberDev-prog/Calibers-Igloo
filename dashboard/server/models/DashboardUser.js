import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const schema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['owner', 'staff'], default: 'staff' },
  createdAt: { type: Date, default: Date.now },
});

schema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

schema.statics.createUser = async function (userId, username, password) {
  const passwordHash = await bcrypt.hash(password, 12);
  return this.create({ userId, username, passwordHash });
};

export default mongoose.model('DashboardUser', schema);
