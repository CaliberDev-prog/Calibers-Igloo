import { Router } from 'express';
import mongoose from 'mongoose';
import { requireStaff } from '../../middleware/auth.js';
import * as discord from '../../services/discord.js';
import Ticket from '../../models/Ticket.js';
import TicketBlacklist from '../../models/TicketBlacklist.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();

router.get('/', requireStaff, asyncHandler(async (req, res) => {
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
      const fetchRes = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bot ${token}` },
      });
      if (fetchRes.ok) botUser = await fetchRes.json();
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
}));

export default router;
