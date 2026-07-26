import { Router } from 'express';
import DashboardUser from '../models/DashboardUser.js';
import {
  generateAccessToken, generateRefreshToken, verifyRefreshToken,
  authenticate, isTokenRevoked, revokeToken, revokeAllUserTokens,
} from '../middleware/auth.js';

const router = Router();

const OWNER_ID = process.env.OWNER_ID;
const IS_PROD = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: 'lax',
  path: '/',
};

function clearAuthCookies(res) {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
}

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
    const tokenPayload = { id: user.userId, username: user.username, role: effectiveRole };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.cookie('token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: { id: user.userId, username: user.username, role: effectiveRole },
    });
  } catch (err) {
    console.error('[AUTH] Login error');
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: 'Not authenticated' });

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const alreadyRevoked = await isTokenRevoked(decoded.jti);
    if (alreadyRevoked) {
      await revokeAllUserTokens(decoded.id, 'replay');
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await DashboardUser.findOne({ userId: decoded.id });
    if (!user) {
      await revokeAllUserTokens(decoded.id, 'replay');
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await revokeToken(decoded.jti, decoded.id, 'rotation');

    const effectiveRole = user.userId === OWNER_ID ? 'owner' : user.role;
    const tokenPayload = { id: user.userId, username: user.username, role: effectiveRole };
    const family = decoded.family || decoded.jti;

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload, family);

    res.cookie('token', newAccessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[AUTH] Refresh error');
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded) {
      await revokeToken(decoded.jti, decoded.id, 'logout');
    }
  }
  clearAuthCookies(res);
  res.json({ success: true });
});

export default router;
