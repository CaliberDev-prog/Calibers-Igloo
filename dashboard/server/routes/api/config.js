import { Router } from 'express';
import { requireOwner, requireStaff } from '../../middleware/auth.js';
import BotConfig from '../../models/BotConfig.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();

router.get('/', requireStaff, async (req, res) => {
  try {
    const config = await BotConfig.findOne({ type: 'settings' }).lean();
    res.json({ settings: config?.settings || {} });
  } catch (err) {
    console.error('[API] Config error:', err);
    res.json({ settings: {} });
  }
});

router.post('/', requireOwner, asyncHandler(async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return res.status(400).json({ error: 'settings object is required' });
  }
  const sanitized = {};
  const ALLOWED_KEYS = ['verificationChannel', 'welcomeChannel', 'guidelinesChannel', 'rolesChannel', 'ticketCategoryId', 'logChannelId', 'transcriptChannelId'];
  for (const [key, value] of Object.entries(settings)) {
    if (ALLOWED_KEYS.includes(key) && typeof value === 'string') {
      sanitized[key] = value;
    }
  }
  await BotConfig.findOneAndUpdate(
    { type: 'settings' },
    { $set: { settings: sanitized, updatedAt: new Date() } },
    { upsert: true }
  );
  res.json({ success: true });
}));

export default router;
