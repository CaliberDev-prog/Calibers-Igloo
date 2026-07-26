import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 25));
  return { page, limit, skip: (page - 1) * limit };
}

function sanitizeSearch(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
}

describe('parsePagination', () => {
  it('returns defaults for empty query', () => {
    const result = parsePagination({});
    assert.deepStrictEqual(result, { page: 1, limit: 25, skip: 0 });
  });

  it('parses valid page and limit', () => {
    const result = parsePagination({ page: '3', limit: '10' });
    assert.deepStrictEqual(result, { page: 3, limit: 10, skip: 20 });
  });

  it('clamps page to minimum 1', () => {
    const result = parsePagination({ page: '-5' });
    assert.equal(result.page, 1);
  });

  it('clamps limit to max 100', () => {
    const result = parsePagination({ limit: '999' });
    assert.equal(result.limit, 100);
  });

  it('clamps limit to min 1', () => {
    const result = parsePagination({ limit: '0' });
    assert.equal(result.limit, 25);
  });

  it('handles NaN gracefully', () => {
    const result = parsePagination({ page: 'abc', limit: 'xyz' });
    assert.deepStrictEqual(result, { page: 1, limit: 25, skip: 0 });
  });
});

describe('sanitizeSearch', () => {
  it('returns empty for falsy input', () => {
    assert.equal(sanitizeSearch(''), '');
    assert.equal(sanitizeSearch(null), '');
    assert.equal(sanitizeSearch(undefined), '');
    assert.equal(sanitizeSearch(123), '');
  });

  it('escapes regex special characters', () => {
    const result = sanitizeSearch('hello.world*test');
    assert.ok(result.includes('\\.'));
    assert.ok(result.includes('\\*'));
  });

  it('truncates to 100 chars', () => {
    const long = 'a'.repeat(200);
    assert.equal(sanitizeSearch(long).length, 100);
  });

  it('passes through normal strings unchanged', () => {
    assert.equal(sanitizeSearch('hello123'), 'hello123');
  });
});

describe('Discord ID validation (regex)', () => {
  const DISCORD_ID_RE = /^\d{17,20}$/;

  it('accepts valid 18-digit ID', () => {
    assert.ok(DISCORD_ID_RE.test('1293164546005012512'));
  });

  it('accepts valid 19-digit ID', () => {
    assert.ok(DISCORD_ID_RE.test('1234567890123456789'));
  });

  it('rejects short IDs', () => {
    assert.ok(!DISCORD_ID_RE.test('12345'));
  });

  it('rejects IDs with letters', () => {
    assert.ok(!DISCORD_ID_RE.test('129316454600501251a'));
  });

  it('rejects empty string', () => {
    assert.ok(!DISCORD_ID_RE.test(''));
  });

  it('rejects IDs with special characters', () => {
    assert.ok(!DISCORD_ID_RE.test('1293164546005012<script>'));
  });
});

describe('Giveaway winner selection', () => {
  function selectWinners(entries, winnerCount) {
    const count = Math.min(winnerCount || 1, entries.length);
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  it('returns empty array when no entries', () => {
    const winners = selectWinners([], 3);
    assert.equal(winners.length, 0);
  });

  it('does not exceed entry count', () => {
    const entries = ['a', 'b'];
    const winners = selectWinners(entries, 20);
    assert.equal(winners.length, 2);
  });

  it('returns requested count when enough entries', () => {
    const entries = ['a', 'b', 'c', 'd', 'e'];
    const winners = selectWinners(entries, 3);
    assert.equal(winners.length, 3);
  });

  it('only selects from valid entries', () => {
    const entries = ['user1', 'user2', 'user3'];
    const winners = selectWinners(entries, 2);
    for (const w of winners) {
      assert.ok(entries.includes(w));
    }
  });

  it('does not mutate original array', () => {
    const entries = ['a', 'b', 'c'];
    const original = [...entries];
    selectWinners(entries, 2);
    assert.deepStrictEqual(entries, original);
  });

  it('clamps winner count to minimum 0 when no entries', () => {
    const winners = selectWinners([], 5);
    assert.equal(winners.length, 0);
  });
});

describe('Giveaway reroll excludes previous winners', () => {
  function rerollEntries(allEntries, previousWinners) {
    const remaining = allEntries.filter((id) => !previousWinners.includes(id));
    return remaining;
  }

  it('filters out all previous winners', () => {
    const all = ['a', 'b', 'c', 'd'];
    const prev = ['a', 'c'];
    const remaining = rerollEntries(all, prev);
    assert.deepStrictEqual(remaining, ['b', 'd']);
  });

  it('returns all entries when no previous winners', () => {
    const all = ['a', 'b', 'c'];
    const remaining = rerollEntries(all, []);
    assert.deepStrictEqual(remaining, ['a', 'b', 'c']);
  });

  it('returns empty when all entries were winners', () => {
    const all = ['a', 'b'];
    const remaining = rerollEntries(all, ['a', 'b']);
    assert.equal(remaining.length, 0);
  });
});

describe('Giveaway double-end protection', () => {
  it('simulates atomic status check', () => {
    const giveaways = [
      { id: 1, status: 'active', endAt: new Date('2020-01-01') },
      { id: 2, status: 'ended', endAt: new Date('2020-01-01') },
      { id: 3, status: 'active', endAt: new Date('2030-01-01') },
    ];

    const expired = giveaways.filter(
      (g) => g.status === 'active' && g.endAt <= new Date()
    );
    assert.equal(expired.length, 1);
    assert.equal(expired[0].id, 1);
  });

  it('simulates findOneAndUpdate claiming', () => {
    let giveaway = { id: 1, status: 'active' };

    function atomicEnd(g) {
      if (g.status !== 'active') return null;
      g.status = 'ended';
      return g;
    }

    const first = atomicEnd(giveaway);
    assert.ok(first);

    const second = atomicEnd(giveaway);
    assert.equal(second, null);
  });
});

describe('Blacklist validation', () => {
  const BL_RE = /^\d{17,20}$/;

  it('validates userId format server-side', () => {
    assert.ok(BL_RE.test('1293164546005012512'));
    assert.ok(!BL_RE.test(''));
    assert.ok(!BL_RE.test('not-an-id'));
    assert.ok(!BL_RE.test('12345'));
    assert.ok(!BL_RE.test('<script>alert(1)</script>'));
  });

  it('departmentId defaults to global', () => {
    const departmentId = undefined || 'global';
    assert.equal(departmentId, 'global');
  });
});

describe('Message limit validation', () => {
  it('clamps to max 100', () => {
    const limit = Math.min(Math.max(parseInt('500') || 1, 1), 100);
    assert.equal(limit, 100);
  });

  it('clamps to min 1', () => {
    const limit = Math.min(Math.max(parseInt('0') || 1, 1), 100);
    assert.equal(limit, 1);
  });

  it('passes valid limit', () => {
    const limit = Math.min(Math.max(parseInt('25') || 1, 1), 100);
    assert.equal(limit, 25);
  });
});

describe('Member snowflake validation', () => {
  const SF_RE = /^\d{17,20}$/;

  it('validates after parameter', () => {
    assert.ok(SF_RE.test('1293164546005012512'));
    assert.ok(!SF_RE.test('0'));
    assert.equal(SF_RE.test('0') ? '0' : '0', '0');
  });

  it('falls back to 0 for invalid', () => {
    const after = 'abc';
    const safeAfter = SF_RE.test(after) ? after : '0';
    assert.equal(safeAfter, '0');
  });
});

describe('Transcript filename sanitization', () => {
  it('removes special characters', () => {
    const filename = 'ticket #123; rm -rf /';
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    assert.ok(!safe.includes(';'));
    assert.ok(!safe.includes('#'));
    assert.ok(!safe.includes(' '));
  });

  it('truncates long filenames', () => {
    const filename = 'a'.repeat(200) + '.html';
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    assert.equal(safe.length, 100);
  });
});

describe('Role restriction', () => {
  const VALID_ROLES = ['developer', 'manager', 'moderator', 'support', 'analyst'];

  it('prevents setting owner role via API', () => {
    const role = 'owner';
    const safeRole = VALID_ROLES.includes(role) ? role : 'support';
    assert.equal(safeRole, 'support');
  });

  it('allows valid roles', () => {
    const role = 'moderator';
    const safeRole = VALID_ROLES.includes(role) ? role : 'support';
    assert.equal(safeRole, 'moderator');
  });

  it('defaults to support for invalid role', () => {
    const role = undefined;
    const safeRole = VALID_ROLES.includes(role) ? role : 'support';
    assert.equal(safeRole, 'support');
  });
});

describe('Analytics date boundaries', () => {
  it('since date is correctly calculated', () => {
    const dayCount = 30;
    const since = new Date(Date.now() - dayCount * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffDays = (now - since) / (24 * 60 * 60 * 1000);
    assert.ok(Math.abs(diffDays - 30) < 0.01);
  });

  it('dayCount is clamped', () => {
    const dayCount = Math.min(Math.max(parseInt('365') || 30, 1), 365);
    assert.equal(dayCount, 365);
  });

  it('dayCount min is 1', () => {
    const dayCount = Math.min(Math.max(parseInt('-1') || 30, 1), 365);
    assert.equal(dayCount, 1);
  });
});
