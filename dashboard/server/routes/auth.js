import { Router } from 'express';
import DashboardUser from '../models/DashboardUser.js';
import { generateToken, authenticate } from '../middleware/auth.js';

const router = Router();

const OWNER_ID = process.env.OWNER_ID;

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const user = await DashboardUser.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await user.checkPassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const effectiveRole = user.userId === OWNER_ID ? 'owner' : user.role;
    const token = generateToken({
      id: user.userId,
      username: user.username,
      role: effectiveRole,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: { id: user.userId, username: user.username, role: effectiveRole },
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ success: true });
});

export default router;
