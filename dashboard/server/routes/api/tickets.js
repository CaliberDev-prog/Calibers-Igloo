import { Router } from 'express';
import { requireOwner, requireStaff } from '../../middleware/auth.js';
import * as discord from '../../services/discord.js';
import AuditLog from '../../models/AuditLog.js';
import Ticket from '../../models/Ticket.js';
import { parseTicketId, isDiscordId } from '../../../utils/validation.js';
import { sanitizeSearch, parsePagination } from '../../../utils/pagination.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();

router.get('/', requireStaff, asyncHandler(async (req, res) => {
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
}));

router.get('/stats/overview', requireStaff, asyncHandler(async (req, res) => {
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
}));

router.get('/:ticketId', requireStaff, asyncHandler(async (req, res) => {
  const ticketId = parseTicketId(req.params.ticketId);
  if (ticketId === null) return res.status(400).json({ error: 'Invalid ticket ID' });
  const ticket = await Ticket.findOne({ ticketId }).lean();
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ ticket });
}));

router.get('/:ticketId/transcript', requireStaff, asyncHandler(async (req, res) => {
  const ticketId = parseTicketId(req.params.ticketId);
  if (ticketId === null) return res.status(400).json({ error: 'Invalid ticket ID' });
  const ticket = await Ticket.findOne({ ticketId }).lean();
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
}));

router.get('/:ticketId/transcript/download', requireStaff, asyncHandler(async (req, res) => {
  const ticketId = parseTicketId(req.params.ticketId);
  if (ticketId === null) return res.status(400).json({ error: 'Invalid ticket ID' });
  const ticket = await Ticket.findOne({ ticketId }).lean();
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (!ticket.transcript?.generated) return res.status(404).json({ error: 'No transcript available' });
  const transcriptChannelId = process.env.TRANSCRIPT_CHANNEL_ID || process.env.LOG_CHANNEL_ID;
  if (!transcriptChannelId || !ticket.transcript.logMessageId) {
    return res.status(404).json({ error: 'Transcript channel or message not available' });
  }
  const message = await discord.getMessage(transcriptChannelId, ticket.transcript.logMessageId);
  const attachment = message.attachments?.[0];
  if (!attachment) return res.status(404).json({ error: 'Transcript file not found' });

  const MAX_TRANSCRIPT_BYTES = 5 * 1024 * 1024;
  if (attachment.size > MAX_TRANSCRIPT_BYTES) {
    return res.status(413).json({ error: 'Transcript file too large' });
  }

  const fetchRes = await fetch(attachment.url, { signal: AbortSignal.timeout(10000) });
  if (!fetchRes.ok) return res.status(500).json({ error: 'Failed to fetch transcript file' });

  const contentLength = fetchRes.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_TRANSCRIPT_BYTES) {
    return res.status(413).json({ error: 'Transcript file too large' });
  }

  const html = await fetchRes.text();
  if (Buffer.byteLength(html, 'utf-8') > MAX_TRANSCRIPT_BYTES) {
    return res.status(413).json({ error: 'Transcript file too large' });
  }

  const safeFilename = (ticket.transcript.filename || 'transcript.html')
    .replace(/\0/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .slice(0, 100);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', "sandbox allow-forms allow-scripts; object-src 'none';");
  res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(html);
}));

router.post('/:ticketId/close', requireStaff, asyncHandler(async (req, res) => {
  const ticketId = parseTicketId(req.params.ticketId);
  if (ticketId === null) return res.status(400).json({ error: 'Invalid ticket ID' });
  const ticket = await Ticket.findOne({ ticketId });
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
}));

router.patch('/:ticketId', requireOwner, asyncHandler(async (req, res) => {
  const ticketId = parseTicketId(req.params.ticketId);
  if (ticketId === null) return res.status(400).json({ error: 'Invalid ticket ID' });
  const { departmentId, notes, claimedBy } = req.body;
  const ticket = await Ticket.findOne({ ticketId });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (departmentId !== undefined) ticket.departmentId = departmentId;
  if (notes !== undefined) ticket.notes = String(notes).slice(0, 5000);
  if (claimedBy !== undefined) ticket.claimedBy = String(claimedBy).slice(0, 100);
  await ticket.save();
  res.json({ ticket });
}));

router.post('/:ticketId/participants', requireStaff, asyncHandler(async (req, res) => {
  const ticketId = parseTicketId(req.params.ticketId);
  if (ticketId === null) return res.status(400).json({ error: 'Invalid ticket ID' });
  const { userId } = req.body;
  if (!userId || !/^\d{17,20}$/.test(String(userId).trim())) return res.status(400).json({ error: 'Valid Discord user ID required' });
  const ticket = await Ticket.findOne({ ticketId: parseInt(req.params.ticketId) });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (!ticket.participants) ticket.participants = [];
  if (!ticket.participants.includes(userId)) ticket.participants.push(userId);
  await ticket.save();
  res.json({ ticket });
}));

router.delete('/:ticketId/participants/:userId', requireStaff, asyncHandler(async (req, res) => {
  const ticketId = parseTicketId(req.params.ticketId);
  if (ticketId === null) return res.status(400).json({ error: 'Invalid ticket ID' });
  if (!isDiscordId(req.params.userId)) return res.status(400).json({ error: 'Invalid user ID format' });
  const ticket = await Ticket.findOne({ ticketId });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  ticket.participants = (ticket.participants || []).filter(u => u !== req.params.userId);
  await ticket.save();
  res.json({ ticket });
}));

export default router;
