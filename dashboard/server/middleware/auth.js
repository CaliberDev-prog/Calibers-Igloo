import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[AUTH] FATAL: Missing JWT_SECRET environment variable');
  process.exit(1);
}

const JWT_ALGORITHM = 'HS256';
const STAFF_ROLES = ['owner', 'developer', 'manager', 'moderator', 'support', 'analyst'];

export { STAFF_ROLES };

export function authenticate(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireOwner(req, res, next) {
  if (!req.user || req.user.role !== 'owner') return res.status(403).json({ error: 'Owner access required' });
  next();
}

export function requireStaff(req, res, next) {
  if (!req.user || !STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
}

export function generateToken(user) {
  return jwt.sign({
    id: user.id,
    username: user.username,
    role: user.role,
  }, JWT_SECRET, { algorithm: JWT_ALGORITHM, expiresIn: '7d' });
}
