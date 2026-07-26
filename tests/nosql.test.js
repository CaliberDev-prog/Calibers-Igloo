import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import sanitize from 'mongo-sanitize';

describe('mongo-sanitize middleware', () => {
  it('removes $gt operator', () => {
    const input = { username: { $gt: '' } };
    const result = sanitize(input);
    assert.deepStrictEqual(result, { username: {} });
  });

  it('removes $ne operator', () => {
    const input = { password: { $ne: '' } };
    const result = sanitize(input);
    assert.deepStrictEqual(result, { password: {} });
  });

  it('removes $regex operator', () => {
    const input = { search: { $regex: '.*' } };
    const result = sanitize(input);
    assert.deepStrictEqual(result, { search: {} });
  });

  it('removes $where operator', () => {
    const input = { $where: 'function() { return true; }' };
    const result = sanitize(input);
    assert.deepStrictEqual(result, {});
  });

  it('removes nested operators', () => {
    const input = { user: { $or: [{ a: 1 }, { b: 2 }] } };
    const result = sanitize(input);
    assert.deepStrictEqual(result, { user: {} });
  });

  it('removes $exists operator', () => {
    const input = { field: { $exists: true } };
    const result = sanitize(input);
    assert.deepStrictEqual(result, { field: {} });
  });

  it('removes $in operator', () => {
    const input = { status: { $in: ['admin', 'owner'] } };
    const result = sanitize(input);
    assert.deepStrictEqual(result, { status: {} });
  });

  it('preserves normal strings', () => {
    const input = { username: 'john_doe', password: 'secret123' };
    const result = sanitize(input);
    assert.deepStrictEqual(result, { username: 'john_doe', password: 'secret123' });
  });

  it('preserves numbers', () => {
    const input = { age: 25, count: 100 };
    const result = sanitize(input);
    assert.deepStrictEqual(result, { age: 25, count: 100 });
  });

  it('preserves booleans', () => {
    const input = { active: true, deleted: false };
    const result = sanitize(input);
    assert.deepStrictEqual(result, { active: true, deleted: false });
  });

  it('preserves null', () => {
    const input = { field: null };
    const result = sanitize(input);
    assert.deepStrictEqual(result, { field: null });
  });

  it('preserves arrays of primitives', () => {
    const input = { tags: ['admin', 'staff'], ids: [1, 2, 3] };
    const result = sanitize(input);
    assert.deepStrictEqual(result, { tags: ['admin', 'staff'], ids: [1, 2, 3] });
  });

  it('removes operators from arrays of objects', () => {
    const input = { items: [{ $gt: 0 }, { name: 'test' }] };
    const result = sanitize(input);
    assert.ok(!JSON.stringify(result).includes('$gt'));
  });

  it('handles deeply nested operators', () => {
    const input = { a: { b: { c: { $ne: null } } } };
    const result = sanitize(input);
    assert.ok(!JSON.stringify(result).includes('$'));
  });

  it('handles empty object', () => {
    const result = sanitize({});
    assert.deepStrictEqual(result, {});
  });

  it('handles empty string', () => {
    const result = sanitize('');
    assert.equal(result, '');
  });

  it('handles null input', () => {
    const result = sanitize(null);
    assert.equal(result, null);
  });

  it('handles undefined input', () => {
    const result = sanitize(undefined);
    assert.equal(result, undefined);
  });

  it('removes $set operator (common injection)', () => {
    const input = { $set: { role: 'owner' } };
    const result = sanitize(input);
    assert.deepStrictEqual(result, {});
  });

  it('removes $unset operator', () => {
    const input = { $unset: { password: 1 } };
    const result = sanitize(input);
    assert.deepStrictEqual(result, {});
  });

  it('removes $push operator', () => {
    const input = { $push: { participants: 'attacker_id' } };
    const result = sanitize(input);
    assert.deepStrictEqual(result, {});
  });

  it('removes $pull operator', () => {
    const input = { $pull: { participants: 'victim_id' } };
    const result = sanitize(input);
    assert.deepStrictEqual(result, {});
  });

  it('removes $addToSet operator', () => {
    const input = { $addToSet: { roles: 'admin' } };
    const result = sanitize(input);
    assert.deepStrictEqual(result, {});
  });

  it('removes $currentDate operator', () => {
    const input = { $currentDate: { updatedAt: true } };
    const result = sanitize(input);
    assert.deepStrictEqual(result, {});
  });

  it('prevents auth bypass via query params', () => {
    const input = { userId: { $gt: '' }, role: { $ne: '' } };
    const result = sanitize(input);
    assert.ok(!JSON.stringify(result).includes('$'));
    assert.deepStrictEqual(result, { userId: {}, role: {} });
  });

  it('prevents privilege escalation via body', () => {
    const input = { role: { $in: ['owner', 'developer'] } };
    const result = sanitize(input);
    assert.ok(!JSON.stringify(result).includes('$'));
  });
});
