import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireOwner } from '../../middleware/auth.js';
import { revokeAllUserTokens } from '../../middleware/auth.js';
import AuditLog from '../../models/AuditLog.js';
import DashboardUser from '../../models/DashboardUser.js';
import { isObjectId } from '../../utils/validation.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();

router.get('/', requireOwner, asyncHandler(async (req, res) => {
  const users = await DashboardUser.find({}, { passwordHash: 0 }).lean();
  res.json({ users });
}));

router.post('/', requireOwner, asyncHandler(async (req, res) => {
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
}));

router.patch('/:userId', requireOwner, asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.userId)) return res.status(400).json({ error: 'Invalid user ID format' });
  const { role } = req.body;
  const user = await DashboardUser.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'owner') return res.status(400).json({ error: 'Cannot change owner role' });
  if (role === 'owner') return res.status(400).json({ error: 'Cannot assign owner role' });
  const VALID_ROLES = ['developer', 'manager', 'moderator', 'support', 'analyst'];
  const roleChanged = role && VALID_ROLES.includes(role) && user.role !== role;
  if (role && VALID_ROLES.includes(role)) user.role = role;
  await user.save();
  if (roleChanged) await revokeAllUserTokens(user.userId, 'role_change');
  await AuditLog.create({ action: 'dashboard.user.update', category: 'auth', description: `Updated user ${user.username}`, userId: req.user.id, username: req.user.username, target: user.username });
  res.json({ user: { _id: user._id, username: user.username, role: user.role } });
}));

router.delete('/:userId', requireOwner, asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.userId)) return res.status(400).json({ error: 'Invalid user ID format' });
  const user = await DashboardUser.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'owner') return res.status(400).json({ error: 'Cannot delete owner' });
  if (req.user.id === user._id.toString()) return res.status(400).json({ error: 'Cannot delete yourself' });
  await revokeAllUserTokens(user.userId, 'admin_revoke');
  await DashboardUser.findByIdAndDelete(req.params.userId);
  await AuditLog.create({ action: 'dashboard.user.delete', category: 'auth', description: `Deleted user ${user.username}`, userId: req.user.id, username: req.user.username, target: user.username });
  res.json({ success: true });
}));

export default router;
