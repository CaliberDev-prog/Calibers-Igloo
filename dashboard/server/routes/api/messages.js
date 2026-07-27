import { Router } from 'express';
import { requireStaff } from '../../middleware/auth.js';
import * as discord from '../../services/discord.js';
import { isDiscordId } from '../../../utils/validation.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();

router.get('/:channelId', requireStaff, asyncHandler(async (req, res) => {
  if (!isDiscordId(req.params.channelId)) return res.status(400).json({ error: 'Invalid channel ID format' });
  const { before, limit = 50 } = req.query;
  const fetchLimit = Math.min(Math.max(parseInt(limit) || 1, 1), 100);
  const safeBefore = before && /^\d{17,20}$/.test(before) ? before : undefined;
  const messages = await discord.getMessages(req.params.channelId, fetchLimit, safeBefore);
  res.json({ messages });
}));

router.post('/:channelId', requireStaff, asyncHandler(async (req, res) => {
  if (!isDiscordId(req.params.channelId)) return res.status(400).json({ error: 'Invalid channel ID format' });
  const { content, embed } = req.body;
  if (content && typeof content === 'string' && content.length > 2000) return res.status(400).json({ error: 'Message content too long (max 2000)' });
  const message = await discord.sendMessage(req.params.channelId, content, embed || undefined);
  res.json({ message });
}));

router.patch('/:channelId/:messageId', requireStaff, asyncHandler(async (req, res) => {
  if (!isDiscordId(req.params.channelId)) return res.status(400).json({ error: 'Invalid channel ID format' });
  if (!isDiscordId(req.params.messageId)) return res.status(400).json({ error: 'Invalid message ID format' });
  const { content, embed } = req.body;
  const message = await discord.editMessage(req.params.channelId, req.params.messageId, content, embed || undefined);
  res.json({ message });
}));

router.delete('/:channelId/:messageId', requireStaff, asyncHandler(async (req, res) => {
  if (!isDiscordId(req.params.channelId)) return res.status(400).json({ error: 'Invalid channel ID format' });
  if (!isDiscordId(req.params.messageId)) return res.status(400).json({ error: 'Invalid message ID format' });
  await discord.deleteMessage(req.params.channelId, req.params.messageId);
  res.json({ success: true });
}));

router.post('/:channelId/embed', requireStaff, asyncHandler(async (req, res) => {
  if (!isDiscordId(req.params.channelId)) return res.status(400).json({ error: 'Invalid channel ID format' });
  const { embed } = req.body;
  const message = await discord.sendEmbed(req.params.channelId, embed);
  res.json({ message });
}));

export default router;
