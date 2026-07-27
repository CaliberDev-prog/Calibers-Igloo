import { Router } from 'express';
import { requireOwner } from '../../middleware/auth.js';
import * as discord from '../../services/discord.js';
import AuditLog from '../../models/AuditLog.js';
import { isDiscordId } from '../../../utils/validation.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();

router.post('/execute', requireOwner, asyncHandler(async (req, res) => {
  const { command, args, channelId } = req.body;
  if (!command || typeof command !== 'string') return res.status(400).json({ error: 'command string is required' });
  if (!channelId || !isDiscordId(String(channelId).trim())) return res.status(400).json({ error: 'Valid channel ID is required' });

  const message = `${command} ${(args || []).join(' ')}`.trim();
  if (message.length > 2000) return res.status(400).json({ error: 'Message too long (max 2000 chars)' });

  const sent = await discord.sendMessage(channelId, message);

  await AuditLog.create({
    action: 'terminal.command',
    category: 'terminal',
    description: `Executed: ${message.slice(0, 100)}`,
    userId: req.user.id,
    username: req.user.username,
    target: `channel:${channelId}`,
  }).catch(() => null);

  res.json({ success: true, messageId: sent?.id || null });
}));

export default router;
