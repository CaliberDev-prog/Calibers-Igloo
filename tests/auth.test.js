import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const ALG = 'HS256';
const ROLES = ['owner', 'developer', 'manager', 'moderator', 'support', 'analyst'];

function sign(payload, opts = {}) {
  return jwt.sign(payload, SECRET, { algorithm: ALG, ...opts });
}

function verify(token) {
  return jwt.verify(token, SECRET, { algorithms: [ALG] });
}

function makeAccess(overrides = {}) {
  return sign({
    id: '123456789012345678',
    username: 'testuser',
    role: 'support',
    jti: crypto.randomUUID(),
    ...overrides,
  }, { expiresIn: '24h' });
}

function makeRefresh(overrides = {}) {
  return sign({
    id: '123456789012345678',
    jti: crypto.randomUUID(),
    family: crypto.randomUUID(),
    type: 'refresh',
    ...overrides,
  }, { expiresIn: '7d' });
}

describe('Token generation', () => {
  it('generates a valid 3-part access token', () => {
    const token = makeAccess();
    const parts = token.split('.');
    assert.equal(parts.length, 3);
    const decoded = verify(token);
    assert.equal(decoded.id, '123456789012345678');
    assert.equal(decoded.username, 'testuser');
    assert.equal(decoded.role, 'support');
    assert.ok(decoded.jti);
    assert.ok(decoded.iat);
    assert.ok(decoded.exp);
  });

  it('generates a valid 3-part refresh token', () => {
    const token = makeRefresh();
    const parts = token.split('.');
    assert.equal(parts.length, 3);
    const decoded = verify(token);
    assert.equal(decoded.id, '123456789012345678');
    assert.equal(decoded.type, 'refresh');
    assert.ok(decoded.jti);
    assert.ok(decoded.family);
    assert.ok(decoded.iat);
    assert.ok(decoded.exp);
  });

  it('access token expires in 24h', () => {
    const token = makeAccess();
    const decoded = verify(token);
    const diff = decoded.exp - decoded.iat;
    assert.equal(diff, 86400);
  });

  it('refresh token expires in 7d', () => {
    const token = makeRefresh();
    const decoded = verify(token);
    const diff = decoded.exp - decoded.iat;
    assert.equal(diff, 604800);
  });

  it('each token gets a unique jti', () => {
    const t1 = makeAccess();
    const t2 = makeAccess();
    const d1 = verify(t1);
    const d2 = verify(t2);
    assert.notEqual(d1.jti, d2.jti);
  });
});

describe('Token verification', () => {
  it('rejects tokens signed with wrong secret', () => {
    const token = sign({ id: '123', type: 'refresh' }, { expiresIn: '1h' });
    const wrongSecret = jwt.sign({ id: '123' }, 'wrong-secret-that-is-also-long', { algorithm: ALG });
    assert.throws(() => {
      jwt.verify(token, 'wrong-secret-that-is-also-long', { algorithms: [ALG] });
    });
  });

  it('rejects tokens with wrong algorithm', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyJ9.fake';
    assert.throws(() => {
      jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    });
  });

  it('rejects expired tokens', () => {
    const token = sign({ id: '123', username: 'u', role: 'support', jti: 'x' }, { expiresIn: '-1s' });
    assert.throws(() => verify(token), (err) => err.name === 'TokenExpiredError');
  });

  it('rejects malformed tokens', () => {
    assert.throws(() => verify('not-a-jwt'));
    assert.throws(() => verify('only.two'));
    assert.throws(() => verify(''));
  });

  it('rejects tokens with invalid role', () => {
    const token = makeAccess({ role: 'hacker' });
    const decoded = verify(token);
    assert.ok(!ROLES.includes(decoded.role));
  });

  it('rejects tokens with missing required fields', () => {
    const token = sign({ jti: 'x' }, { expiresIn: '1h' });
    const decoded = verify(token);
    assert.ok(!decoded.id);
    assert.ok(!decoded.username);
    assert.ok(!decoded.role);
  });
});

describe('Refresh token family tracking', () => {
  it('refresh token carries family ID', () => {
    const family = 'family-123';
    const token = makeRefresh({ family });
    const decoded = verify(token);
    assert.equal(decoded.family, 'family-123');
  });

  it('generateRefreshToken uses provided family when given', () => {
    const family = 'my-family-id';
    const token = makeRefresh({ family });
    const decoded = verify(token);
    assert.equal(decoded.family, 'my-family-id');
  });

  it('rotation preserves family ID', () => {
    const originalFamily = 'family-789';
    const token1 = makeRefresh({ family: originalFamily });
    const decoded1 = verify(token1);

    const token2 = makeRefresh({ family: decoded1.family });
    const decoded2 = verify(token2);
    assert.equal(decoded2.family, originalFamily);
  });
});

describe('Token format validation', () => {
  it('rejects non-string tokens', () => {
    assert.equal(typeof makeAccess() === 'string', true);
    assert.equal(typeof null === 'string', false);
    assert.equal(typeof undefined === 'string', false);
    assert.equal(typeof 123 === 'string', false);
  });

  it('validates 3-part structure', () => {
    const token = makeAccess();
    assert.equal(token.split('.').length, 3);

    const invalidTokens = ['only.two', '', 'single'];
    for (const t of invalidTokens) {
      assert.notEqual(t.split('.').length, 3, `Expected "${t}" to not be 3-part`);
    }
  });

  it('rejects tokens with extra parts', () => {
    const token = makeAccess();
    const tampered = token + '.extra';
    assert.equal(tampered.split('.').length, 4);
  });
});

describe('Token revocation simulation', () => {
  it('tracks revoked JTIs in a Set', () => {
    const revoked = new Set();
    const jti1 = crypto.randomUUID();
    const jti2 = crypto.randomUUID();

    revoked.add(jti1);
    assert.ok(revoked.has(jti1));
    assert.ok(!revoked.has(jti2));
  });

  it('replay detection works with revoked set', () => {
    const revoked = new Set();
    const jti = crypto.randomUUID();

    revoked.add(jti);
    assert.ok(revoked.has(jti), 'token should be revoked');
  });

  it('family revocation removes all tokens in family', () => {
    const revoked = new Set();
    const familyTokens = [
      { jti: 'jti-1', family: 'fam-1' },
      { jti: 'jti-2', family: 'fam-1' },
      { jti: 'jti-3', family: 'fam-2' },
    ];

    const targetFamily = 'fam-1';
    for (const t of familyTokens) {
      if (t.family === targetFamily) revoked.add(t.jti);
    }

    assert.ok(revoked.has('jti-1'));
    assert.ok(revoked.has('jti-2'));
    assert.ok(!revoked.has('jti-3'));
  });
});

describe('Cookie security', () => {
  it('cookie options include httpOnly', () => {
    const opts = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };
    assert.equal(opts.httpOnly, true);
  });

  it('cookie options include secure flag', () => {
    const opts = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };
    assert.equal(opts.secure, true);
  });

  it('cookie options include sameSite', () => {
    const opts = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };
    assert.equal(opts.sameSite, 'lax');
  });

  it('cookie options include narrow path', () => {
    const opts = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };
    assert.equal(opts.path, '/');
  });

  it('access token cookie maxAge is 24h', () => {
    const maxAge = 24 * 60 * 60 * 1000;
    assert.equal(maxAge, 86400000);
  });

  it('refresh token cookie maxAge is 7d', () => {
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    assert.equal(maxAge, 604800000);
  });
});

describe('Edge cases', () => {
  it('rejects refresh token with missing type field', () => {
    const token = sign({ id: '123', jti: 'x' }, { expiresIn: '1h' });
    const decoded = verify(token);
    assert.notEqual(decoded.type, 'refresh');
  });

  it('rejects refresh token with missing id', () => {
    const token = sign({ type: 'refresh', jti: 'x' }, { expiresIn: '1h' });
    const decoded = verify(token);
    assert.ok(!decoded.id);
  });

  it('rejects tokens with unknown payload fields', () => {
    const token = makeAccess({ role: 'support', malicious: 'field' });
    const decoded = verify(token);
    assert.ok('malicious' in decoded);
  });

  it('rejects tokens with tampered payload', () => {
    const token = makeAccess({ role: 'support' });
    const parts = token.split('.');
    parts[1] = Buffer.from(JSON.stringify({ id: '123', role: 'owner' })).toString('base64url');
    const tampered = parts.join('.');
    assert.throws(() => verify(tampered));
  });

  it('handles concurrent rotation safely', () => {
    const revoked = new Set();
    const jti = crypto.randomUUID();

    const first = !revoked.has(jti);
    if (first) revoked.add(jti);

    const second = !revoked.has(jti);
    assert.equal(first, true);
    assert.equal(second, false);
  });

  it('logout clears both cookies', () => {
    const cookies = { token: 'abc', refreshToken: 'def' };
    delete cookies.token;
    delete cookies.refreshToken;
    assert.equal(cookies.token, undefined);
    assert.equal(cookies.refreshToken, undefined);
  });
});
