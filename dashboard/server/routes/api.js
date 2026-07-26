import { Router } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { authenticate, requireOwner, requireStaff, STAFF_ROLES } from '../middleware/auth.js';
import * as discord from '../services/discord.js';
import AuditLog from '../models/AuditLog.js';
import DashboardUser from '../models/DashboardUser.js';

const router = Router();

const Ticket = mongoose.model('Ticket', new mongoose.Schema({}, { strict: false }));
const TicketBlacklist = mongoose.model('TicketBlacklist', new mongoose.Schema({}, { strict: false }));
const Counter = mongoose.model('Counter', new mongoose.Schema({}, { strict: false }));
const BotConfig = mongoose.model('BotConfig', new mongoose.Schema({}, { strict: false }));
const Giveaway = mongoose.model('Giveaway', new mongoose.Schema({}, { strict: false }));

function sanitizeSearch(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 25));
  return { page, limit, skip: (page - 1) * limit };
}

router.use(authenticate);

router.get('/overview', requireStaff, async (req, res) => {
  try {
    const [guild, openTickets, totalTickets, closedTickets, blacklists] = await Promise.all([
      discord.getGuild().catch(() => null),
      Ticket.countDocuments({ status: 'open' }),
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: 'closed' }),
      TicketBlacklist.countDocuments(),
    ]);

    let botUser = null;
    try {
      const token = process.env.DISCORD_BOT_TOKEN;
      if (token) {
        const res = await fetch('https://discord.com/api/v10/users/@me', {
          headers: { Authorization: `Bot ${token}` },
        });
        if (res.ok) botUser = await res.json();
      }
    } catch (e) {
      console.warn('[API] Bot user fetch failed:', e.message);
    }

    const byDept = await Ticket.aggregate([
      { $match: { status: 'open' } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
    ]);

    const recentTickets = await Ticket.find().sort({ createdAt: -1 }).limit(10).lean();
    const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    res.json({
      guild: guild ? {
        name: guild.name, id: guild.id,
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
        memberCount: guild.approximate_member_count || 0,
        onlineCount: guild.approximate_presence_count || 0,
      } : null,
      tickets: {
        open: openTickets, total: totalTickets, closed: closedTickets,
        byDepartment: byDept.reduce((acc, d) => { acc[d._id] = d.count; return acc; }, {}),
      },
      recentTickets,
      blacklists,
      database: dbState,
      bot: { id: botUser?.id || null, uptime: process.uptime(), ...(req.user.role === 'owner' ? { memory: process.memoryUsage(), nodeVersion: process.version } : {}) },
    });
  } catch (err) {
    console.error('[API] Overview error:', err);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

router.get('/config', requireStaff, async (req, res) => {
  try {
    const config = await BotConfig.findOne({ type: 'settings' }).lean();
    res.json({ settings: config?.settings || {} });
  } catch (err) {
    console.error('[API] Config error:', err);
    res.json({ settings: {} });
  }
});

router.post('/config', requireOwner, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('[API] Config save error:', err);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

router.get('/channels', requireStaff, async (req, res) => {
  try {
    const channels = await discord.getChannels();
    res.json({ channels });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

router.patch('/channels/:channelId', requireOwner, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Invalid channel name' });
    if (name.length > 100) return res.status(400).json({ error: 'Channel name too long (max 100)' });
    const updated = await discord.editChannel(req.params.channelId, { name });
    res.json({ channel: updated });
  } catch (err) {
    console.error('[API] Edit channel error:', err);
    res.status(500).json({ error: 'Failed to edit channel' });
  }
});

router.patch('/channels-reorder', requireOwner, async (req, res) => {
  try {
    const { positions } = req.body;
    if (!Array.isArray(positions) || !positions.every(p => p.id && typeof p.position === 'number')) return res.status(400).json({ error: 'positions array required with {id, position} format' });
    await discord.reorderChannels(positions);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Reorder channels error:', err);
    res.status(500).json({ error: 'Failed to reorder channels' });
  }
});

router.get('/roles', requireStaff, async (req, res) => {
  try {
    const roles = await discord.getRoles();
    res.json({ roles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

router.get('/members', requireStaff, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('[API] Members error:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

router.patch('/roles/:roleId', requireOwner, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('[API] Edit role error:', err);
    res.status(500).json({ error: 'Failed to edit role' });
  }
});

router.delete('/roles/:roleId', requireOwner, async (req, res) => {
  try {
    await discord.deleteRole(req.params.roleId);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Delete role error:', err);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

router.patch('/roles-reorder', requireOwner, async (req, res) => {
  try {
    const { positions } = req.body;
    if (!Array.isArray(positions) || !positions.every(p => p.id && typeof p.position === 'number')) return res.status(400).json({ error: 'positions array required with {id, position} format' });
    await discord.reorderRoles(positions);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Reorder roles error:', err);
    res.status(500).json({ error: 'Failed to reorder roles' });
  }
});

router.get('/tickets', requireStaff, async (req, res) => {
  try {
    const { status, department, search, sort = 'createdAt', order = 'desc' } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (department && department !== 'all') filter.departmentId = department;
    if (search) {
      const safeSearch = sanitizeSearch(search);
      if (safeSearch) {
        filter.$or = [
          { channelId: { $regex: safeSearch, $options: 'i' } },
          { creatorId: { $regex: safeSearch, $options: 'i' } },
          { creatorTag: { $regex: safeSearch, $options: 'i' } },
        ];
      }
    }
    const validSorts = ['createdAt', 'ticketId', 'status', 'departmentId', 'closedAt'];
    const sortField = validSorts.includes(sort) ? sort : 'createdAt';
    const sortObj = { [sortField]: order === 'asc' ? 1 : -1 };
    const [tickets, total] = await Promise.all([
      Ticket.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      Ticket.countDocuments(filter),
    ]);
    res.json({ tickets, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('[API] Tickets error:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.get('/tickets/stats/overview', requireStaff, async (req, res) => {
  try {
    const { days = '30' } = req.query;
    const dayCount = Math.min(Math.max(parseInt(days) || 30, 1), 365);
    const since = new Date(Date.now() - dayCount * 24 * 60 * 60 * 1000);

    const [total, open, closed, deleted, byDept, createdOverTime, closedOverTime, avgDuration, avgFirstResponse, topUsers, deptStats] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: 'open' }),
      Ticket.countDocuments({ status: 'closed' }),
      Ticket.countDocuments({ status: 'deleted' }),
      Ticket.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$departmentId', count: { $sum: 1 }, open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } }, closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } } } },
      ]),
      Ticket.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Ticket.aggregate([
        { $match: { closedAt: { $gte: since }, status: 'closed' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$closedAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Ticket.aggregate([
        { $match: { status: 'closed', closedAt: { $exists: true, $gte: since } } },
        { $project: { duration: { $subtract: ['$closedAt', '$createdAt'] } } },
        { $group: { _id: null, avg: { $avg: '$duration' } } },
      ]),
      Ticket.aggregate([
        { $match: { firstStaffResponseAt: { $exists: true, $gte: since }, status: 'closed' } },
        { $project: { responseTime: { $subtract: ['$firstStaffResponseAt', '$createdAt'] } } },
        { $group: { _id: null, avg: { $avg: '$responseTime' } } },
      ]),
      Ticket.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$creatorTag', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Ticket.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$departmentId', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      total, open, closed, deleted,
      byDepartment: byDept,
      createdOverTime,
      closedOverTime,
      avgDuration: avgDuration[0]?.avg || 0,
      avgFirstResponse: avgFirstResponse[0]?.avg || 0,
      topUsers,
      recentByDepartment: deptStats,
      days: dayCount,
    });
  } catch (err) {
    console.error('[API] Stats overview error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/tickets/:ticketId', requireStaff, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: parseInt(req.params.ticketId) }).lean();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

router.get('/tickets/:ticketId/transcript', requireStaff, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: parseInt(req.params.ticketId) }).lean();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!ticket.transcript?.generated) return res.status(404).json({ error: 'No transcript available' });
    res.json({
      transcript: ticket.transcript,
      history: ticket.history || [],
      answers: ticket.answers || [],
      ticket: {
        ticketId: ticket.ticketId,
        departmentId: ticket.departmentId,
        creatorTag: ticket.creatorTag,
        creatorId: ticket.creatorId,
        status: ticket.status,
        createdAt: ticket.createdAt,
        closedAt: ticket.closedAt,
        closedBy: ticket.closedBy,
        closeReason: ticket.closeReason,
        staffMessageCount: ticket.staffMessageCount || 0,
        userMessageCount: ticket.userMessageCount || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
});

router.get('/tickets/:ticketId/transcript/download', requireStaff, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: parseInt(req.params.ticketId) }).lean();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!ticket.transcript?.generated) return res.status(404).json({ error: 'No transcript available' });
    const transcriptChannelId = process.env.TRANSCRIPT_CHANNEL_ID || process.env.LOG_CHANNEL_ID;
    if (!transcriptChannelId || !ticket.transcript.logMessageId) {
      return res.status(404).json({ error: 'Transcript channel or message not available' });
    }
    const message = await discord.getMessage(transcriptChannelId, ticket.transcript.logMessageId);
    const attachment = message.attachments?.[0];
    if (!attachment) return res.status(404).json({ error: 'Transcript file not found' });
    const fetchRes = await fetch(attachment.url);
    if (!fetchRes.ok) return res.status(500).json({ error: 'Failed to fetch transcript file' });
    const html = await fetchRes.text();
    const safeFilename = (ticket.transcript.filename || 'transcript.html')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 100);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Security-Policy', "sandbox allow-forms allow-scripts; script-src 'none'; object-src 'none';");
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.send(html);
  } catch (err) {
    console.error('[API] Transcript download error:', err);
    res.status(500).json({ error: 'Failed to download transcript' });
  }
});

router.post('/tickets/:ticketId/close', requireStaff, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: parseInt(req.params.ticketId) });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.status !== 'open') return res.status(400).json({ error: 'Ticket is not open' });
    
    if (ticket.channelId) {
      try { await discord.deleteChannel(ticket.channelId); } catch {}
    }
    ticket.status = 'closed';
    ticket.closedAt = new Date();
    ticket.closedBy = req.user.username;
    ticket.closedById = req.user.id || '';
    ticket.closeReason = String(req.body.reason || 'Closed from dashboard').slice(0, 500);
    if (!ticket.history) ticket.history = [];
    ticket.history.push({
      action: 'ticket_closed',
      performedBy: req.user.username,
      reason: ticket.closeReason,
      timestamp: new Date(),
    });
    await ticket.save();

    await AuditLog.create({
      action: 'ticket.closed',
      category: 'tickets',
      description: `Closed ticket #${String(ticket.ticketId).padStart(4, '0')}`,
      userId: req.user.id,
      username: req.user.username,
      target: `ticket:${ticket.ticketId}`,
    }).catch(() => null);

    res.json({ success: true });
  } catch (err) {
    console.error('[API] Close ticket error:', err);
    res.status(500).json({ error: 'Failed to close ticket' });
  }
});

router.get('/blacklists', requireStaff, async (req, res) => {
  try {
    const { userId, department } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (userId) filter.userId = userId.trim();
    if (department && department !== 'all') filter.departmentId = department;
    const [entries, total] = await Promise.all([
      TicketBlacklist.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      TicketBlacklist.countDocuments(filter),
    ]);
    res.json({ entries, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch blacklists' });
  }
});

router.delete('/blacklists/:id', requireOwner, async (req, res) => {
  try {
    await TicketBlacklist.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove blacklist entry' });
  }
});

router.post('/blacklists', requireOwner, async (req, res) => {
  try {
    const { userId, reason, departmentId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (!/^\d{17,20}$/.test(String(userId).trim())) return res.status(400).json({ error: 'Invalid Discord user ID format' });
    const entry = await TicketBlacklist.findOneAndUpdate(
      { userId, departmentId: departmentId || 'global' },
      {
        userId,
        departmentId: departmentId || 'global',
        reason: String(reason || 'No reason provided').slice(0, 500),
        addedBy: req.user.username,
        active: true,
      },
      { upsert: true, new: true }
    );
    await AuditLog.create({
      action: 'blacklist.add',
      category: 'blacklists',
      description: `Blacklisted user ${userId}`,
      userId: req.user.id,
      username: req.user.username,
      target: userId,
    }).catch(() => null);
    res.json({ entry });
  } catch (err) {
    console.error('[API] Create blacklist error:', err);
    res.status(500).json({ error: 'Failed to create blacklist entry' });
  }
});

router.get('/messages/:channelId', requireStaff, async (req, res) => {
  try {
    const { before, limit = 50 } = req.query;
    const fetchLimit = Math.min(Math.max(parseInt(limit) || 1, 1), 100);
    const safeBefore = before && /^\d{17,20}$/.test(before) ? before : undefined;
    const messages = await discord.getMessages(req.params.channelId, fetchLimit, safeBefore);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/messages/:channelId', requireStaff, async (req, res) => {
  try {
    const { content, embed } = req.body;
    if (content && typeof content === 'string' && content.length > 2000) return res.status(400).json({ error: 'Message content too long (max 2000)' });
    const message = await discord.sendMessage(req.params.channelId, content, embed || undefined);
    res.json({ message });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.patch('/messages/:channelId/:messageId', requireStaff, async (req, res) => {
  try {
    const { content, embed } = req.body;
    const message = await discord.editMessage(req.params.channelId, req.params.messageId, content, embed || undefined);
    res.json({ message });
  } catch (err) {
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

router.delete('/messages/:channelId/:messageId', requireStaff, async (req, res) => {
  try {
    await discord.deleteMessage(req.params.channelId, req.params.messageId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

router.post('/messages/:channelId/embed', requireStaff, async (req, res) => {
  try {
    const { embed } = req.body;
    const message = await discord.sendEmbed(req.params.channelId, embed);
    res.json({ message });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send embed' });
  }
});

router.patch('/tickets/:ticketId', requireOwner, async (req, res) => {
  try {
    const { departmentId, notes, claimedBy } = req.body;
    const ticket = await Ticket.findOne({ ticketId: parseInt(req.params.ticketId) });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (departmentId !== undefined) ticket.departmentId = departmentId;
    if (notes !== undefined) ticket.notes = String(notes).slice(0, 5000);
    if (claimedBy !== undefined) ticket.claimedBy = String(claimedBy).slice(0, 100);
    await ticket.save();
    res.json({ ticket });
  } catch (err) {
    console.error('[API] Edit ticket error:', err);
    res.status(500).json({ error: 'Failed to edit ticket' });
  }
});

router.post('/tickets/:ticketId/participants', requireStaff, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || !/^\d{17,20}$/.test(String(userId).trim())) return res.status(400).json({ error: 'Valid Discord user ID required' });
    const ticket = await Ticket.findOne({ ticketId: parseInt(req.params.ticketId) });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!ticket.participants) ticket.participants = [];
    if (!ticket.participants.includes(userId)) ticket.participants.push(userId);
    await ticket.save();
    res.json({ ticket });
  } catch (err) {
    console.error('[API] Add participant error:', err);
    res.status(500).json({ error: 'Failed to add participant' });
  }
});

router.delete('/tickets/:ticketId/participants/:userId', requireStaff, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: parseInt(req.params.ticketId) });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.participants = (ticket.participants || []).filter(u => u !== req.params.userId);
    await ticket.save();
    res.json({ ticket });
  } catch (err) {
    console.error('[API] Remove participant error:', err);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
});

router.patch('/blacklists/:id', requireOwner, async (req, res) => {
  try {
    const { reason, departmentId } = req.body;
    const entry = await TicketBlacklist.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Blacklist entry not found' });
    if (reason !== undefined) entry.reason = String(reason).slice(0, 500);
    if (departmentId !== undefined) entry.departmentId = String(departmentId).slice(0, 50);
    await entry.save();
    res.json({ entry });
  } catch (err) {
    console.error('[API] Edit blacklist error:', err);
    res.status(500).json({ error: 'Failed to edit blacklist entry' });
  }
});

router.post('/commands/execute', requireOwner, async (req, res) => {
  try {
    const { command, args, channelId } = req.body;
    if (!command || typeof command !== 'string') return res.status(400).json({ error: 'command string is required' });
    if (!channelId) return res.status(400).json({ error: 'channelId is required' });

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
  } catch (err) {
    console.error('[API] Execute command error:', err);
    res.status(500).json({ error: 'Failed to execute command' });
  }
});

router.get('/giveaways', requireStaff, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('[API] Get giveaways error:', err);
    res.status(500).json({ error: 'Failed to fetch giveaways' });
  }
});

router.post('/giveaways', requireOwner, async (req, res) => {
  try {
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
        const { default: fetch } = await import('node-fetch');
        await fetch(`${discord.BASE}/channels/${channelId}/messages/${messageId}/reactions/%F0%9F%8E%89/@me`, {
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
  } catch (err) {
    console.error('[API] Create giveaway error:', err);
    res.status(500).json({ error: 'Failed to create giveaway' });
  }
});

router.post('/giveaways/:id/end', requireOwner, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('[API] End giveaway error:', err);
    res.status(500).json({ error: 'Failed to end giveaway' });
  }
});

router.post('/giveaways/:id/reroll', requireOwner, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('[API] Reroll giveaway error:', err);
    res.status(500).json({ error: 'Failed to reroll giveaway' });
  }
});

router.delete('/giveaways/:id', requireOwner, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('[API] Delete giveaway error:', err);
    res.status(500).json({ error: 'Failed to delete giveaway' });
  }
});

router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    status: dbState === 1 ? 'ok' : 'degraded',
    database: dbState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  });
});

router.get('/audit-logs', requireStaff, async (req, res) => {
  try {
    const { category, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (search) {
      const safeSearch = sanitizeSearch(search);
      if (safeSearch) {
        filter.$or = [
          { action: { $regex: safeSearch, $options: 'i' } },
          { description: { $regex: safeSearch, $options: 'i' } },
          { username: { $regex: safeSearch, $options: 'i' } },
          { target: { $regex: safeSearch, $options: 'i' } },
        ];
      }
    }
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('[API] Audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

router.post('/audit-logs', requireOwner, async (req, res) => {
  try {
    const { action, category, description, target, targetId, metadata } = req.body;
    if (!action || typeof action !== 'string') return res.status(400).json({ error: 'action is required' });
    if (!description || typeof description !== 'string') return res.status(400).json({ error: 'description is required' });
    const log = await AuditLog.create({
      action: action.slice(0, 100),
      category: (category || 'general').slice(0, 50),
      description: description.slice(0, 500),
      userId: req.user.id,
      username: req.user.username,
      target: target ? String(target).slice(0, 200) : undefined,
      targetId: targetId ? String(targetId).slice(0, 200) : undefined,
      metadata: typeof metadata === 'object' && metadata !== null ? metadata : undefined,
      ip: req.ip,
    });
    res.json({ log });
  } catch (err) {
    console.error('[API] Create audit log error:', err);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
});

router.get('/users', requireOwner, async (req, res) => {
  try {
    const users = await DashboardUser.find({}, { passwordHash: 0 }).lean();
    res.json({ users });
  } catch (err) {
    console.error('[API] Users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', requireOwner, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (typeof username !== 'string' || !/^[a-z0-9_-]{3,32}$/.test(username.toLowerCase())) return res.status(400).json({ error: 'Username must be 3-32 chars (letters, numbers, _, -)' });
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const existing = await DashboardUser.findOne({ username: username.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Username already exists' });
    const validRoles = ['developer', 'manager', 'moderator', 'support', 'analyst'];
    const safeRole = validRoles.includes(role) ? role : 'support';
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await DashboardUser.create({
      userId: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, username: username.toLowerCase(), passwordHash, role: safeRole,
    });
    await AuditLog.create({ action: 'dashboard.user.create', category: 'auth', description: `Created user ${username}`, userId: req.user.id, username: req.user.username, target: username });
    res.json({ user: { _id: user._id, username: user.username, role: user.role, userId: user.userId } });
  } catch (err) {
    console.error('[API] Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.patch('/users/:userId', requireOwner, async (req, res) => {
  try {
    const { role } = req.body;
    const user = await DashboardUser.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'owner') return res.status(400).json({ error: 'Cannot change owner role' });
    if (role === 'owner') return res.status(400).json({ error: 'Cannot assign owner role' });
    const VALID_ROLES = ['developer', 'manager', 'moderator', 'support', 'analyst'];
    if (role && VALID_ROLES.includes(role)) user.role = role;
    await user.save();
    await AuditLog.create({ action: 'dashboard.user.update', category: 'auth', description: `Updated user ${user.username}`, userId: req.user.id, username: req.user.username, target: user.username });
    res.json({ user: { _id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    console.error('[API] Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:userId', requireOwner, async (req, res) => {
  try {
    const user = await DashboardUser.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'owner') return res.status(400).json({ error: 'Cannot delete owner' });
    if (req.user.id === user._id.toString()) return res.status(400).json({ error: 'Cannot delete yourself' });
    await DashboardUser.findByIdAndDelete(req.params.userId);
    await AuditLog.create({ action: 'dashboard.user.delete', category: 'auth', description: `Deleted user ${user.username}`, userId: req.user.id, username: req.user.username, target: user.username });
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
