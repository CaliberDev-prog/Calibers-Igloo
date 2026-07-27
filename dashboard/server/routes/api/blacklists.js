import { Router } from 'express';
import { requireOwner, requireStaff } from '../../middleware/auth.js';
import AuditLog from '../../models/AuditLog.js';
import TicketBlacklist from '../../models/TicketBlacklist.js';
import { isObjectId } from '../../../utils/validation.js';
import { parsePagination } from '../../../utils/pagination.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();

router.get('/', requireStaff, asyncHandler(async (req, res) => {
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
}));

router.delete('/:id', requireOwner, asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ID format' });
  await TicketBlacklist.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

router.post('/', requireOwner, asyncHandler(async (req, res) => {
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
}));

router.patch('/:id', requireOwner, asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ID format' });
  const { reason, departmentId } = req.body;
  const entry = await TicketBlacklist.findById(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Blacklist entry not found' });
  if (reason !== undefined) entry.reason = String(reason).slice(0, 500);
  if (departmentId !== undefined) entry.departmentId = String(departmentId).slice(0, 50);
  await entry.save();
  res.json({ entry });
}));

export default router;
