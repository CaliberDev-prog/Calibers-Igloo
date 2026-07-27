import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Rate limiting configuration', () => {
  it('has rate limiter for login endpoint', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/index.js', 'utf8');
    assert.ok(content.includes('loginLimiter'), 'Login limiter defined');
    assert.ok(content.includes("'max': 15") || content.includes('max: 15'), 'Login max 15');
  });

  it('has rate limiter for refresh endpoint', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/index.js', 'utf8');
    assert.ok(content.includes('refreshLimiter'), 'Refresh limiter defined');
    assert.ok(content.includes("/api/auth/refresh'"), 'Applied to refresh route');
  });

  it('has global API rate limiter', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/index.js', 'utf8');
    assert.ok(content.includes('apiLimiter'), 'Global API limiter defined');
    assert.ok(content.includes('max: 500'), 'Global max 500');
  });
});

describe('CSRF protection — Origin and Content-Type checks', () => {
  it('origin check exists for state-changing API requests', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/index.js', 'utf8');
    assert.ok(content.includes('req.headers.origin'), 'Checks Origin header');
    assert.ok(content.includes('CLIENT_URL'), 'Compares against CLIENT_URL');
  });

  it('Content-Type check for non-JSON requests', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/index.js', 'utf8');
    assert.ok(content.includes('415'), 'Returns 415 for wrong Content-Type');
    assert.ok(content.includes('Unsupported Media Type'), '415 message present');
  });

  it('CSRF checks skip auth endpoints', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/index.js', 'utf8');
    assert.ok(content.includes('!req.path.startsWith'), 'Skips certain paths');
  });

  it('CSRF checks only apply in production', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/index.js', 'utf8');
    const csrfSection = content.slice(content.indexOf('req.headers.origin') - 200);
    assert.ok(csrfSection.includes('IS_PROD'), 'CSRF check gated on IS_PROD');
  });
});

describe('Audit logging — auth events', () => {
  it('auth.js imports AuditLog model', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/auth.js', 'utf8');
    assert.ok(content.includes('AuditLog'), 'AuditLog imported');
  });

  it('failed login is logged', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/auth.js', 'utf8');
    assert.ok(content.includes('auth.login_failed'), 'Failed login logged');
  });

  it('successful login is logged', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/auth.js', 'utf8');
    assert.ok(content.includes('auth.login_success'), 'Successful login logged');
  });

  it('token replay is logged', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/auth.js', 'utf8');
    assert.ok(content.includes('auth.token_replay'), 'Replay detection logged');
  });

  it('IP address is captured in audit logs', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/auth.js', 'utf8');
    assert.ok(content.includes('getClientIp'), 'IP extraction function used');
    assert.ok(content.includes('x-forwarded-for'), 'X-Forwarded-For header checked');
  });

  it('audit logging failures do not crash auth flow', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/auth.js', 'utf8');
    assert.ok(content.includes('.catch(() => null)'), 'Audit log errors silenced');
  });
});

describe('Secure error responses', () => {
  it('DashboardUser toJSON strips __v', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/models/DashboardUser.js', 'utf8');
    assert.ok(content.includes("delete ret.__v"), '__v removed from JSON output');
  });

  it('DashboardUser toJSON strips passwordHash', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/models/DashboardUser.js', 'utf8');
    assert.ok(content.includes("delete ret.passwordHash"), 'passwordHash removed from JSON output');
  });

  it('api.js never sends stack traces to clients', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/api.js', 'utf8');
    assert.ok(!content.includes('err.stack'), 'No stack traces in responses');
    assert.ok(!content.includes('err.message'), 'No raw error messages in responses');
  });

  it('auth.js never sends stack traces to clients', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/auth.js', 'utf8');
    assert.ok(!content.includes('err.stack'), 'No stack traces in responses');
  });
});
