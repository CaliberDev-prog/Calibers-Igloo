import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireOwner, requireStaff } from '../middleware/auth.js';

const router = Router();

const Ticket = mongoose.model('Ticket', new mongoose.Schema({}, { strict: false }));
const TicketBlacklist = mongoose.model('TicketBlacklist', new mongoose.Schema({}, { strict: false }));
const Counter = mongoose.model('Counter', new mongoose.Schema({}, { strict: false }));

const GUILD_ID = process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const OWNER_ID = process.env.DISCORD_OWNER_ID;
const STAFF_ROLES = ['1530531573332447324', '1530531568605597718'];

async function fetchGuild() {
  if (!BOT_TOKEN) return null;
  const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}?with_counts=true`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchChannel(channelId) {
  if (!BOT_TOKEN) return null;
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
  });
  if (!res.ok) return null;
  return res.json();
}

router.use(authenticate);

router.get('/overview', requireStaff, async (req, res) => {
  try {
    const [guild, openTickets, totalTickets, closedTickets, blacklists] = await Promise.all([
      fetchGuild(),
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
        name: guild.name,
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
        memberCount: guild.approximate_member_count || 0,
        onlineCount: guild.approximate_presence_count || 0,
      } : null,
      tickets: {
        open: openTickets,
        total: totalTickets,
        closed: closedTickets,
        byDepartment: byDept.reduce((acc, d) => { acc[d._id] = d.count; return acc; }, {}),
      },
      blacklists,
      database: dbState,
      bot: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      },
    });
  } catch (err) {
    console.error('[API] Overview error:', err);
    res.status(500).json({ error: 'Failed to fetch overview' });
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

    res.json({
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
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

    res.json({
      total, open, closed, deleted,
      byDepartment: byDept,
      last7Days,
      avgDuration: avgDuration[0]?.avg || 0,
    });
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

    res.json({
      entries,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
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

router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    status: 'ok',
    database: dbState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

router.get('/config', requireOwner, async (req, res) => {
  try {
    const configPath = new URL('../../src/config/tickets.js', import.meta.url);
    res.json({ message: 'Config endpoint active', path: configPath.pathname });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load config' });
  }
});

export default router;
