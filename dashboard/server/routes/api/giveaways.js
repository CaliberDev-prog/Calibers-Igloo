import { Router } from 'express';
import { requireOwner, requireStaff } from '../../middleware/auth.js';
import * as discord from '../../services/discord.js';
import AuditLog from '../../models/AuditLog.js';
import Giveaway from '../../models/Giveaway.js';
import { isObjectId } from '../../../utils/validation.js';
import { parsePagination } from '../../../utils/pagination.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();

router.get('/', requireStaff, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  const [giveaways, total] = await Promise.all([
    Giveaway.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
    Giveaway.countDocuments(filter),
  ]);
  res.json({ giveaways, pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } });
}));

router.post('/', requireOwner, asyncHandler(async (req, res) => {
  const { prize, description, winners, duration, channelId, requirementRoleId, requirementMinMessages } = req.body;
  if (!prize || !prize.trim()) return res.status(400).json({ error: 'Prize is required' });
  if (!channelId || !/^\d{17,20}$/.test(String(channelId).trim())) return res.status(400).json({ error: 'Valid channel ID is required' });
  if (requirementRoleId && !/^\d{17,20}$/.test(String(requirementRoleId).trim())) return res.status(400).json({ error: 'Invalid role ID' });
  const winnerCount = Math.min(Math.max(parseInt(winners) || 1, 1), 20);
  const durationMs = Math.min(Math.max(parseInt(duration) || 60, 1) * 60 * 1000, 30 * 24 * 60 * 60 * 1000);
  const endAt = new Date(Date.now() + durationMs);

  let messageId = '';
  try {
    const embed = {
      title: `\uD83C\uDF89 ${prize}`,
      description: [
        description || '',
        '',
        `**Winner(s):** ${winnerCount}`,
        `**Ends:** <t:${Math.floor(endAt.getTime() / 1000)}:R>`,
        requirementRoleId ? `**Required Role:** <@&${requirementRoleId}>` : '',
        requirementMinMessages ? `**Min Messages:** ${requirementMinMessages}` : '',
      ].filter(Boolean).join('\n'),
      color: 0x75cff5,
      footer: { text: 'React with 🎉 to enter!' },
      timestamp: endAt.toISOString(),
    };
    const sent = await discord.sendMessage(channelId, '', embed);
    messageId = sent?.id || '';
    if (messageId) {
      const { default: nodeFetch } = await import('node-fetch');
      await nodeFetch(`${discord.BASE}/channels/${channelId}/messages/${messageId}/reactions/%F0%9F%8E%89/@me`, {
        method: 'PUT',
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      }).catch(() => null);
    }
  } catch (e) {
    console.error('[API] Failed to send giveaway message:', e.message);
  }

  const giveaway = await Giveaway.create({
    messageId,
    channelId,
    guildId: process.env.DISCORD_GUILD_ID || '',
    prize: prize.trim(),
    description: String(description || '').trim().slice(0, 2000),
    winners: winnerCount,
    hostId: req.user.id,
    hostTag: req.user.username,
    status: 'active',
    entries: [],
    winnerIds: [],
    endAt,
    requirementRoleId: requirementRoleId || '',
    requirementMinMessages: parseInt(requirementMinMessages) || 0,
  });

  await AuditLog.create({
    action: 'giveaway.create',
    category: 'general',
    description: `Created giveaway: ${prize}`,
    userId: req.user.id,
    username: req.user.username,
    target: giveaway._id.toString(),
  }).catch(() => null);

  res.json({ giveaway });
}));

router.post('/:id/end', requireOwner, asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ID format' });
  const giveaway = await Giveaway.findById(req.params.id);
  if (!giveaway) return res.status(404).json({ error: 'Giveaway not found' });
  if (giveaway.status !== 'active') return res.status(400).json({ error: 'Giveaway is not active' });

  giveaway.status = 'ended';
  giveaway.endedAt = new Date();

  const entries = giveaway.entries || [];
  const winnerCount = Math.min(giveaway.winners || 1, entries.length);
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  giveaway.winnerIds = shuffled.slice(0, winnerCount);

  await giveaway.save();

  if (giveaway.messageId && giveaway.channelId) {
    const mentions = giveaway.winnerIds.map((id) => `<@${id}>`).join(', ') || 'No valid entries';
    const embed = {
      title: `🎉 ${giveaway.prize}`,
      description: `**Winner(s):** ${mentions}\n\nThis giveaway has ended.`,
      color: 0x57f287,
    };
    await discord.editMessage(giveaway.channelId, giveaway.messageId, '', embed).catch(() => null);
  }

  await AuditLog.create({
    action: 'giveaway.end',
    category: 'general',
    description: `Ended giveaway: ${giveaway.prize}`,
    userId: req.user.id,
    username: req.user.username,
    target: giveaway._id.toString(),
  }).catch(() => null);

  res.json({ giveaway });
}));

router.post('/:id/reroll', requireOwner, asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ID format' });
  const giveaway = await Giveaway.findById(req.params.id);
  if (!giveaway) return res.status(404).json({ error: 'Giveaway not found' });
  if (giveaway.status !== 'ended') return res.status(400).json({ error: 'Giveaway must be ended first' });

  const entries = (giveaway.entries || []).filter((id) => !(giveaway.winnerIds || []).includes(id));
  const winnerCount = Math.min(giveaway.winners || 1, entries.length);
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  giveaway.winnerIds = shuffled.slice(0, winnerCount);
  await giveaway.save();

  if (giveaway.messageId && giveaway.channelId) {
    const mentions = giveaway.winnerIds.map((id) => `<@${id}>`).join(', ') || 'No valid entries for reroll';
    const embed = {
      title: `\uD83C\uDF89 ${giveaway.prize} (Rerolled)`,
      description: `**New Winner(s):** ${mentions}`,
      color: 0x9b59b6,
    };
    await discord.editMessage(giveaway.channelId, giveaway.messageId, '', embed).catch(() => null);
  }

  await AuditLog.create({
    action: 'giveaway.reroll',
    category: 'general',
    description: `Rerolled giveaway: ${giveaway.prize}`,
    userId: req.user.id,
    username: req.user.username,
    target: giveaway._id.toString(),
  }).catch(() => null);

  res.json({ giveaway });
}));

router.delete('/:id', requireOwner, asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ID format' });
  const giveaway = await Giveaway.findByIdAndDelete(req.params.id);
  if (!giveaway) return res.status(404).json({ error: 'Giveaway not found' });

  if (giveaway.messageId && giveaway.channelId) {
    await discord.deleteMessage(giveaway.channelId, giveaway.messageId).catch(() => null);
  }

  await AuditLog.create({
    action: 'giveaway.delete',
    category: 'general',
    description: `Deleted giveaway: ${giveaway.prize}`,
    userId: req.user.id,
    username: req.user.username,
  }).catch(() => null);

  res.json({ success: true });
}));

export default router;
