import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { asyncHandler } from '../dashboard/server/middleware/asyncHandler.js';

function createMockRes() {
  return {
    headersSent: false,
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; },
  };
}

function createMockReq() {
  return {};
}

describe('asyncHandler', () => {
  it('passes through successful handlers', async () => {
    const handler = asyncHandler(async (req, res) => {
      res.json({ ok: true });
    });
    const req = createMockReq();
    const res = createMockRes();
    const next = () => { throw new Error('next should not be called'); };
    await handler(req, res, next);
    assert.deepEqual(res.body, { ok: true });
  });

  it('calls next(error) when handler rejects', async () => {
    const handler = asyncHandler(async (req, res) => {
      throw new Error('boom');
    });
    const req = createMockReq();
    const res = createMockRes();
    let capturedError = null;
    const next = (err) => { capturedError = err; };
    await handler(req, res, next);
    assert.ok(capturedError);
    assert.equal(capturedError.message, 'boom');
  });

  it('does not send double responses when handler throws after response', async () => {
    const handler = asyncHandler(async (req, res) => {
      res.json({ partial: true });
      throw new Error('late error');
    });
    const req = createMockReq();
    const res = createMockRes();
    let capturedError = null;
    const next = (err) => { capturedError = err; };
    await handler(req, res, next);
    assert.equal(res.body.ok || res.body.partial, true);
    assert.ok(capturedError);
  });

  it('handles non-promise return values gracefully', async () => {
    const handler = asyncHandler(async (req, res) => {
      return undefined;
    });
    const req = createMockReq();
    const res = createMockRes();
    const next = () => {};
    await handler(req, res, next);
    assert.equal(res.body, null);
  });

  it('does not call next for successful handlers', async () => {
    let nextCalled = false;
    const handler = asyncHandler(async (req, res) => {
      res.json({ done: true });
    });
    const req = createMockReq();
    const res = createMockRes();
    const next = () => { nextCalled = true; };
    await handler(req, res, next);
    assert.equal(nextCalled, false);
  });

  it('preserves async error stack trace', async () => {
    const handler = asyncHandler(async (req, res) => {
      throw new Error('test error');
    });
    const req = createMockReq();
    const res = createMockRes();
    let capturedError = null;
    const next = (err) => { capturedError = err; };
    await handler(req, res, next);
    assert.ok(capturedError.stack);
    assert.ok(capturedError.stack.includes('test error'));
  });

  it('rejects when handler returns a rejected promise', async () => {
    const handler = asyncHandler(async (req, res) => {
      await Promise.reject(new Error('async rejection'));
    });
    const req = createMockReq();
    const res = createMockRes();
    let capturedError = null;
    const next = (err) => { capturedError = err; };
    handler(req, res, next);
    await new Promise(r => setTimeout(r, 10));
    assert.equal(capturedError.message, 'async rejection');
  });
});
