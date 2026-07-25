import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireOwner, requireStaff } from '../middleware/auth.js';
import * as discord from '../services/discord.js';

const router = Router();

const Ticket = mongoose.model('Ticket', new mongoose.Schema({}, { strict: false }));
const TicketBlacklist = mongoose.model('TicketBlacklist', new mongoose.Schema({}, { strict: false }));
const Counter = mongoose.model('Counter', new mongoose.Schema({}, { strict: false }));

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
      bot: { uptime: process.uptime(), memory: process.memoryUsage(), nodeVersion: process.version },
    });
  } catch (err) {
    console.error('[API] Overview error:', err);
    res.status(500).json({ error: 'Failed to fetch overview' });
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

router.get('/roles', requireStaff, async (req, res) => {
  try {
    const roles = await discord.getRoles();
    res.json({ roles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

router.get('/tickets', requireStaff, async (req, res) => {
  try {
    const { status, department, search, page = 1, limit = 25, sort = 'createdAt', order = 'desc' } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (department && department !== 'all') filter.departmentId = department;
    if (search) {
      filter.$or = [
        { channelId: { $regex: search, $options: 'i' } },
        { creatorId: { $regex: search, $options: 'i' } },
        { creatorTag: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sort]: order === 'desc' ? -1 : 1 };
    const [tickets, total] = await Promise.all([
      Ticket.find(filter).sort(sortObj).skip(skip).limit(parseInt(limit)).lean(),
      Ticket.countDocuments(filter),
    ]);
    res.json({ tickets, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    console.error('[API] Tickets error:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
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
    await ticket.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to close ticket' });
  }
});

router.get('/tickets/stats/overview', requireStaff, async (req, res) => {
  try {
    const total = await Ticket.countDocuments();
    const open = await Ticket.countDocuments({ status: 'open' });
    const closed = await Ticket.countDocuments({ status: 'closed' });
    const deleted = await Ticket.countDocuments({ status: 'deleted' });
    const byDept = await Ticket.aggregate([
      { $group: { _id: '$departmentId', count: { $sum: 1 }, open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } } } },
    ]);
    const last7Days = await Ticket.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const avgDuration = await Ticket.aggregate([
      { $match: { status: 'closed', closedAt: { $exists: true } } },
      { $project: { duration: { $subtract: ['$closedAt', '$createdAt'] } } },
      { $group: { _id: null, avg: { $avg: '$duration' } } },
    ]);
    const topUsers = await Ticket.aggregate([
      { $group: { _id: '$creatorTag', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);
    res.json({ total, open, closed, deleted, byDepartment: byDept, last7Days, avgDuration: avgDuration[0]?.avg || 0, topUsers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/blacklists', requireStaff, async (req, res) => {
  try {
    const { userId, department, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (department && department !== 'all') filter.departmentId = department;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [entries, total] = await Promise.all([
      TicketBlacklist.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      TicketBlacklist.countDocuments(filter),
    ]);
    res.json({ entries, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
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

router.get('/messages/:channelId', requireStaff, async (req, res) => {
  try {
    const { before, limit = 50 } = req.query;
    const messages = await discord.getMessages(req.params.channelId, parseInt(limit), before);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/messages/:channelId', requireStaff, async (req, res) => {
  try {
    const { content, embed } = req.body;
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

router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    status: 'ok',
    database: dbState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  });
});

export default router;
