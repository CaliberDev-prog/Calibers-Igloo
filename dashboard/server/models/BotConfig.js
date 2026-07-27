import mongoose from 'mongoose';

const botConfigSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: Date,
});

export default mongoose.models.BotConfig || mongoose.model('BotConfig', botConfigSchema);
