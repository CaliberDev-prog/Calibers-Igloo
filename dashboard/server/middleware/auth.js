import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[AUTH] FATAL: Missing JWT_SECRET environment variable');
  process.exit(1);
}

if (JWT_SECRET.length < 32) {
  console.error('[AUTH] FATAL: JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

const JWT_ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';
const STAFF_ROLES = ['owner', 'developer', 'manager', 'moderator', 'support', 'analyst'];

const ALLOWED_TOKEN_FIELDS = new Set(['id', 'username', 'role', 'iat', 'exp', 'jti']);

export { STAFF_ROLES, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY };

export function authenticate(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  if (typeof token !== 'string' || token.split('.').length !== 3) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });

    const tokenKeys = Object.keys(decoded);
    const unknownKeys = tokenKeys.filter(k => !ALLOWED_TOKEN_FIELDS.has(k));
    if (unknownKeys.length > 0) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    if (!decoded.id || !decoded.username || !decoded.role) {
      return res.status(401).json({ error: 'Invalid token claims' });
    }

    if (!STAFF_ROLES.includes(decoded.role)) {
      return res.status(401).json({ error: 'Invalid role in token' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Token verification failed' });
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

export function generateAccessToken(user) {
  return jwt.sign({
    id: user.id,
    username: user.username,
    role: user.role,
    jti: crypto.randomUUID(),
  }, JWT_SECRET, { algorithm: JWT_ALGORITHM, expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(user) {
  return jwt.sign({
    id: user.id,
    jti: crypto.randomUUID(),
    type: 'refresh',
  }, JWT_SECRET, { algorithm: JWT_ALGORITHM, expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyRefreshToken(token) {
  if (typeof token !== 'string' || token.split('.').length !== 3) {
    return null;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
    if (decoded.type !== 'refresh' || !decoded.id) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function generateToken(user) {
  return generateAccessToken(user);
}
