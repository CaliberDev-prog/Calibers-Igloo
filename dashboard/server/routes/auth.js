import { Router } from 'express';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { generateToken } from '../middleware/auth.js';

const router = Router();

const DISCORD_API = 'https://discord.com/api/v10';
const SCOPES = ['identify', 'guilds', 'guilds.members.read'];

router.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${process.env.CLIENT_URL}/login?error=no_code`);

  try {
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
        scope: SCOPES.join(' '),
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description);

    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = await userRes.json();

    const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const guilds = await guildsRes.json();

    const targetGuild = guilds.find(g => g.id === process.env.DISCORD_GUILD_ID);
    if (!targetGuild) return res.redirect(`${process.env.CLIENT_URL}/login?error=no_access`);

    const botToken = process.env.DISCORD_BOT_TOKEN;
    let member = null;
    if (botToken) {
      const memberRes = await fetch(
        `${DISCORD_API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${user.id}`,
        { headers: { Authorization: `Bot ${botToken}` } }
      );
      if (memberRes.ok) member = await memberRes.json();
    }

    const userData = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator || '0',
      avatar: user.avatar,
      roles: member?.roles || [],
    };

    const token = generateToken(userData);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  } catch (err) {
    console.error('[AUTH] Callback error:', err);
    res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
  }
});

router.get('/me', async (req, res) => {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: decoded });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

export default router;
