import { Router } from 'express';
import { requireOwner, requireStaff } from '../../middleware/auth.js';
import * as discord from '../../services/discord.js';
import { isDiscordId } from '../../utils/validation.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();

router.get('/channels', requireStaff, asyncHandler(async (req, res) => {
  const channels = await discord.getChannels();
  res.json({ channels });
}));

router.patch('/channels/:channelId', requireOwner, asyncHandler(async (req, res) => {
  if (!isDiscordId(req.params.channelId)) return res.status(400).json({ error: 'Invalid channel ID format' });
  const { name } = req.body;
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Invalid channel name' });
  if (name.length > 100) return res.status(400).json({ error: 'Channel name too long (max 100)' });
  const updated = await discord.editChannel(req.params.channelId, { name });
  res.json({ channel: updated });
}));

router.patch('/channels-reorder', requireOwner, asyncHandler(async (req, res) => {
  const { positions } = req.body;
  if (!Array.isArray(positions) || !positions.every(p => p.id && typeof p.position === 'number')) return res.status(400).json({ error: 'positions array required with {id, position} format' });
  await discord.reorderChannels(positions);
  res.json({ success: true });
}));

router.get('/roles', requireStaff, asyncHandler(async (req, res) => {
  const roles = await discord.getRoles();
  res.json({ roles });
}));

router.get('/members', requireStaff, asyncHandler(async (req, res) => {
  const { search, limit = 50, after = '0' } = req.query;
  const fetchLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const safeAfter = /^\d{17,20}$/.test(after) ? after : '0';
  const members = await discord.getMembers(fetchLimit, safeAfter);
  let results = members.map((m) => ({
    id: m.user?.id,
    username: m.user?.username,
    displayName: m.nick || m.user?.global_name || m.user?.username,
    avatar: m.user?.avatar ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=64` : null,
    roles: m.roles || [],
    joinedAt: m.joined_at,
    isBot: m.user?.bot || false,
    status: m.presence?.status || 'offline',
  }));
  if (search) {
    const q = search.toLowerCase();
    results = results.filter((m) => m.username?.toLowerCase().includes(q) || m.displayName?.toLowerCase().includes(q) || m.id?.includes(q));
  }
  const hasMore = members.length === fetchLimit;
  const lastId = hasMore && results.length > 0 ? results[results.length - 1].id : null;
  res.json({ members: results, hasMore, nextAfter: lastId });
}));

router.patch('/roles/:roleId', requireOwner, asyncHandler(async (req, res) => {
  if (!isDiscordId(req.params.roleId)) return res.status(400).json({ error: 'Invalid role ID format' });
  const { name, color } = req.body;
  const data = {};
  if (name && typeof name === 'string') data.name = name.slice(0, 100);
  if (color !== undefined) {
    const c = typeof color === 'number' ? color : parseInt(String(color).replace('#', ''), 16);
    if (!isNaN(c) && c >= 0 && c <= 0xFFFFFF) data.color = c;
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No fields to update' });
  const updated = await discord.editRole(req.params.roleId, data);
  res.json({ role: updated });
}));

router.delete('/roles/:roleId', requireOwner, asyncHandler(async (req, res) => {
  if (!isDiscordId(req.params.roleId)) return res.status(400).json({ error: 'Invalid role ID format' });
  await discord.deleteRole(req.params.roleId);
  res.json({ success: true });
}));

router.patch('/roles-reorder', requireOwner, asyncHandler(async (req, res) => {
  const { positions } = req.body;
  if (!Array.isArray(positions) || !positions.every(p => p.id && typeof p.position === 'number')) return res.status(400).json({ error: 'positions array required with {id, position} format' });
  await discord.reorderRoles(positions);
  res.json({ success: true });
}));

export default router;
