import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'calibers-igloo-dashboard-jwt-secret';
const OWNER_ID = process.env.DISCORD_OWNER_ID || '1293164546005012512';
const STAFF_ROLES = ['1530531573332447324', '1530531568605597718'];

export function authenticate(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireOwner(req, res, next) {
  if (req.user.id !== OWNER_ID) return res.status(403).json({ error: 'Owner only' });
  next();
}

export function requireStaff(req, res, next) {
  if (req.user.id === OWNER_ID) return next();
  const hasRole = req.user.roles?.some(r => STAFF_ROLES.includes(r));
  if (!hasRole) return res.status(403).json({ error: 'Staff only' });
  next();
}

export function generateToken(user) {
  return jwt.sign({
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    avatar: user.avatar,
    roles: user.roles || [],
  }, JWT_SECRET, { expiresIn: '7d' });
}
