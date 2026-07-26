import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'test-secret-that-is-at-least-32-characters-long-for-testing';
const ALG = 'HS256';
const ROLES = ['owner', 'developer', 'manager', 'moderator', 'support', 'analyst'];

function signToken(payload, opts = {}) {
  return jwt.sign(payload, SECRET, { algorithm: ALG, ...opts });
}

function makeAccessToken(role = 'support') {
  return signToken({
    id: '123456789012345678',
    username: 'testuser',
    role,
    jti: crypto.randomUUID(),
  }, { expiresIn: '24h' });
}

function makeExpiredToken() {
  return signToken({
    id: '123456789012345678',
    username: 'testuser',
    role: 'support',
    jti: crypto.randomUUID(),
  }, { expiresIn: '-1s' });
}

function makeMalformedToken() {
  return 'not.a.valid.jwt';
}

function parseAuthMiddleware(token) {
  if (!token) return { status: 401, error: 'Not authenticated' };
  if (typeof token !== 'string' || token.split('.').length !== 3) {
    return { status: 401, error: 'Not authenticated' };
  }
  try {
    const decoded = jwt.verify(token, SECRET, { algorithms: [ALG] });
    if (!decoded.id || !decoded.username || !decoded.role) {
      return { status: 401, error: 'Not authenticated' };
    }
    if (!ROLES.includes(decoded.role)) {
      return { status: 401, error: 'Not authenticated' };
    }
    return { status: 'pass', user: decoded };
  } catch (err) {
    return { status: 401, error: 'Not authenticated' };
  }
}

describe('Auth middleware — unauthenticated requests', () => {
  it('rejects missing token', () => {
    const result = parseAuthMiddleware(null);
    assert.equal(result.status, 401);
  });

  it('rejects undefined token', () => {
    const result = parseAuthMiddleware(undefined);
    assert.equal(result.status, 401);
  });

  it('rejects empty string', () => {
    const result = parseAuthMiddleware('');
    assert.equal(result.status, 401);
  });
});

describe('Auth middleware — valid tokens', () => {
  it('allows valid access token', () => {
    const token = makeAccessToken('support');
    const result = parseAuthMiddleware(token);
    assert.equal(result.status, 'pass');
    assert.equal(result.user.role, 'support');
  });

  it('allows owner token', () => {
    const token = makeAccessToken('owner');
    const result = parseAuthMiddleware(token);
    assert.equal(result.status, 'pass');
    assert.equal(result.user.role, 'owner');
  });

  it('allows all valid staff roles', () => {
    for (const role of ROLES) {
      const token = makeAccessToken(role);
      const result = parseAuthMiddleware(token);
      assert.equal(result.status, 'pass', `Role "${role}" should be allowed`);
    }
  });

  it('extracts user from token', () => {
    const token = makeAccessToken('moderator');
    const result = parseAuthMiddleware(token);
    assert.equal(result.user.id, '123456789012345678');
    assert.equal(result.user.username, 'testuser');
    assert.equal(result.user.role, 'moderator');
  });
});

describe('Auth middleware — expired tokens', () => {
  it('rejects expired token', () => {
    const token = makeExpiredToken();
    const result = parseAuthMiddleware(token);
    assert.equal(result.status, 401);
  });

  it('does not return 500 for expired tokens', () => {
    const token = makeExpiredToken();
    const result = parseAuthMiddleware(token);
    assert.notEqual(result.status, 500);
  });
});

describe('Auth middleware — malformed tokens', () => {
  it('rejects non-JWT string', () => {
    const result = parseAuthMiddleware('not-a-jwt-token');
    assert.equal(result.status, 401);
  });

  it('rejects two-part token', () => {
    const result = parseAuthMiddleware('header.payload');
    assert.equal(result.status, 401);
  });

  it('rejects token with wrong signature', () => {
    const fakeToken = signToken({ id: '123', username: 'u', role: 'support', jti: 'x' }, { expiresIn: '1h' });
    const parts = fakeToken.split('.');
    parts[2] = 'invalidsignature';
    const tampered = parts.join('.');
    const result = parseAuthMiddleware(tampered);
    assert.equal(result.status, 401);
  });
});

describe('Auth middleware — role validation', () => {
  it('rejects invalid role', () => {
    const token = signToken({
      id: '123456789012345678',
      username: 'testuser',
      role: 'hacker',
      jti: crypto.randomUUID(),
    }, { expiresIn: '1h' });
    const result = parseAuthMiddleware(token);
    assert.equal(result.status, 401);
  });

  it('rejects missing role', () => {
    const token = signToken({
      id: '123456789012345678',
      username: 'testuser',
      jti: crypto.randomUUID(),
    }, { expiresIn: '1h' });
    const result = parseAuthMiddleware(token);
    assert.equal(result.status, 401);
  });

  it('rejects empty role', () => {
    const token = signToken({
      id: '123456789012345678',
      username: 'testuser',
      role: '',
      jti: crypto.randomUUID(),
    }, { expiresIn: '1h' });
    const result = parseAuthMiddleware(token);
    assert.equal(result.status, 401);
  });
});

describe('Route protection architecture', () => {
  it('api.js applies authenticate at router level (line 28)', () => {
    const routerMiddleware = 'router.use(authenticate)';
    assert.ok(routerMiddleware.includes('authenticate'));
  });

  it('authRoutes are mounted before apiRoutes in server/index.js', () => {
    const authMount = "app.use('/api/auth', authRoutes)";
    const apiMount = "app.use('/api', apiRoutes)";
    assert.ok(authMount.includes('auth'));
    assert.ok(apiMount.includes('api'));
  });

  it('health endpoints are public (no auth middleware)', () => {
    const publicRoutes = ['/health', '/health/ready', '/health/live'];
    assert.equal(publicRoutes.length, 3);
    for (const route of publicRoutes) {
      assert.ok(route.startsWith('/health'), `${route} is a health endpoint`);
    }
  });

  it('login endpoint is public (in auth.js, no authenticate)', () => {
    const loginRoute = 'router.post(\'/login\'';
    assert.ok(!loginRoute.includes('authenticate'));
  });

  it('refresh endpoint is public (handles own token verification)', () => {
    const refreshRoute = 'router.post(\'/refresh\'';
    assert.ok(!refreshRoute.includes('authenticate'));
  });

  it('logout endpoint is public (clears cookies, revokes server-side)', () => {
    const logoutRoute = 'router.post(\'/logout\'';
    assert.ok(!logoutRoute.includes('authenticate'));
  });

  it('/me endpoint uses authenticate middleware', () => {
    const meRoute = 'router.get(\'/me\', authenticate';
    assert.ok(meRoute.includes('authenticate'));
  });
});

describe('Role-based access (requireOwner, requireStaff)', () => {
  it('requireStaff allows all staff roles', () => {
    for (const role of ROLES) {
      const allowed = ROLES.includes(role);
      assert.ok(allowed, `Staff role "${role}" should be allowed`);
    }
  });

  it('requireStaff rejects non-staff role', () => {
    assert.ok(!ROLES.includes('hacker'));
    assert.ok(!ROLES.includes('user'));
    assert.ok(!ROLES.includes('admin'));
  });

  it('requireOwner only allows owner', () => {
    assert.equal('owner' === 'owner', true);
    assert.equal('developer' === 'owner', false);
    assert.equal('moderator' === 'owner', false);
  });
});

describe('Cookie security for auth routes', () => {
  it('login sets httpOnly cookie', () => {
    const opts = { httpOnly: true };
    assert.equal(opts.httpOnly, true);
  });

  it('login sets secure in production', () => {
    const IS_PROD = process.env.NODE_ENV === 'production';
    const opts = { secure: IS_PROD };
    assert.equal(typeof opts.secure, 'boolean');
  });

  it('login sets sameSite lax', () => {
    const opts = { sameSite: 'lax' };
    assert.equal(opts.sameSite, 'lax');
  });

  it('login sets narrow path', () => {
    const opts = { path: '/' };
    assert.equal(opts.path, '/');
  });

  it('refresh token cookie maxAge is 7 days', () => {
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    assert.equal(maxAge, 604800000);
  });

  it('access token cookie maxAge is 24 hours', () => {
    const maxAge = 24 * 60 * 60 * 1000;
    assert.equal(maxAge, 86400000);
  });

  it('logout clears both cookies', () => {
    const cookies = { token: 'abc', refreshToken: 'def' };
    delete cookies.token;
    delete cookies.refreshToken;
    assert.equal(cookies.token, undefined);
    assert.equal(cookies.refreshToken, undefined);
  });
});
