import { Router } from 'express';
import { requireOwner, requireStaff } from '../../middleware/auth.js';
import AuditLog from '../../models/AuditLog.js';
import { sanitizeSearch, parsePagination } from '../../utils/pagination.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();

router.get('/', requireStaff, asyncHandler(async (req, res) => {
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
}));

router.post('/', requireOwner, asyncHandler(async (req, res) => {
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
}));

export default router;
