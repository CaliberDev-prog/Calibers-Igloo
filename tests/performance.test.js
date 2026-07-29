import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PerformanceCollector } from '../src/utils/performance.js';

describe('PerformanceCollector', () => {
  it('records timing entries', () => {
    const c = new PerformanceCollector();
    c.record('api', 'GET /test', 150);
    const records = c.getRecords();
    assert.equal(records.length, 1);
    assert.equal(records[0].category, 'api');
    assert.equal(records[0].label, 'GET /test');
    assert.equal(records[0].durationMs, 150);
    assert.ok(records[0].timestamp);
  });

  it('record accepts optional metadata', () => {
    const c = new PerformanceCollector();
    c.record('api', 'POST /test', 200, { statusCode: 201, requestId: 'abc' });
    const records = c.getRecords();
    assert.equal(records[0].metadata.statusCode, 201);
    assert.equal(records[0].metadata.requestId, 'abc');
  });

  it('filters by category', () => {
    const c = new PerformanceCollector();
    c.record('api', 'GET /a', 10);
    c.record('mongodb', 'find', 20);
    c.record('api', 'GET /b', 30);
    const api = c.getRecords('api');
    const mongo = c.getRecords('mongodb');
    assert.equal(api.length, 2);
    assert.equal(mongo.length, 1);
  });

  it('startTimer returns end function', () => {
    const c = new PerformanceCollector();
    const end = c.startTimer('command', 'ping');
    end();
    const records = c.getRecords('command');
    assert.equal(records.length, 1);
    assert.equal(records[0].label, 'ping');
    assert.ok(records[0].durationMs >= 0);
  });

  it('startTimer end function accepts metadata', () => {
    const c = new PerformanceCollector();
    const end = c.startTimer('command', 'test');
    end({ success: true });
    assert.equal(c.getRecords('command')[0].metadata.success, true);
  });

  it('startTimer returns correct duration', () => {
    const c = new PerformanceCollector();
    const end = c.startTimer('test', 'delay');
    const duration = end();
    assert.equal(c.getRecords('test')[0].durationMs, duration);
  });

  it('getSummary returns null for empty group', () => {
    const c = new PerformanceCollector();
    assert.equal(c.getSummary('api'), null);
    assert.equal(c.getSummary('api', 'GET /x'), null);
  });

  it('getSummary computes p50/p95/p99', () => {
    const c = new PerformanceCollector();
    for (let i = 0; i < 100; i++) {
      c.record('api', 'GET /test', 10 + i);
    }
    const s = c.getSummary('api', 'GET /test');
    assert.equal(s.count, 100);
    assert.equal(s.min, 10);
    assert.equal(s.max, 109);
    assert.ok(s.avg > 59 && s.avg < 60);
    assert.equal(s.p50, 59);
    assert.equal(s.p95, 104);
    assert.equal(s.p99, 108);
  });

  it('getSummary works without label filter', () => {
    const c = new PerformanceCollector();
    c.record('api', 'GET /a', 10);
    c.record('api', 'GET /b', 20);
    const s = c.getSummary('api');
    assert.equal(s.count, 2);
    assert.equal(s.min, 10);
    assert.equal(s.max, 20);
  });

  it('getAllSummaries groups by category:label', () => {
    const c = new PerformanceCollector();
    c.record('api', 'GET /a', 10);
    c.record('api', 'GET /a', 20);
    c.record('api', 'GET /b', 30);
    c.record('command', 'ping', 5);
    const groups = c.getAllSummaries();
    assert.equal(Object.keys(groups).length, 3);
    assert.ok(groups['api:GET /a']);
    assert.ok(groups['api:GET /b']);
    assert.ok(groups['command:ping']);
    assert.equal(groups['api:GET /a'].count, 2);
    assert.equal(groups['command:ping'].min, 5);
  });

  it('generateBaselineReport returns structured report', () => {
    const c = new PerformanceCollector();
    c.record('api', 'GET /test', 50);
    c.record('command', 'ping', 10);
    const report = c.generateBaselineReport();
    assert.ok(report.generatedAt);
    assert.equal(report.totalRecords, 2);
    assert.deepEqual(report.categories, ['api', 'command']);
    assert.ok(report.summaries['api:GET /test']);
    assert.ok(report.summaries['command:ping']);
  });

  it('enforces MAX_RECORDS limit', () => {
    const c = new PerformanceCollector();
    for (let i = 0; i < 10005; i++) {
      c.record('test', 'overflow', i);
    }
    assert.equal(c.getRecords().length, 10000);
    assert.equal(c.getRecords('test')[0].durationMs, 5);
  });

  it('clear resets all records and startup', () => {
    const c = new PerformanceCollector();
    c.record('api', 'GET /test', 10);
    c.markStartupPhase('start');
    c.clear();
    assert.equal(c.getRecords().length, 0);
    assert.deepEqual(c.getStartupReport(), {});
  });

  it('handles single record percentile', () => {
    const c = new PerformanceCollector();
    c.record('api', 'GET /single', 42);
    const s = c.getSummary('api', 'GET /single');
    assert.equal(s.p50, 42);
    assert.equal(s.p95, 42);
    assert.equal(s.p99, 42);
  });

  it('generateBaselineReport includes startup when available', () => {
    const c = new PerformanceCollector();
    c.markStartupPhase('start');
    c.markStartupPhase('done');
    c.record('api', 'GET /test', 10);
    const report = c.generateBaselineReport();
    assert.ok(report.startup);
  });

  it('generateBaselineReport omits startup when empty', () => {
    const c = new PerformanceCollector();
    c.record('api', 'GET /test', 10);
    const report = c.generateBaselineReport();
    assert.equal(report.startup, undefined);
  });
});

describe('PerformanceCollector startup tracking', () => {
  it('marks startup phases', () => {
    const c = new PerformanceCollector();
    c.markStartupPhase('processStart');
    c.markStartupPhase('mongoConnect');
    c.markStartupPhase('clientReady');
    const report = c.getStartupReport();
    assert.ok(report.mongoConnect);
    assert.ok(report.clientReady);
    assert.ok(report.mongoConnect.sinceStart >= 0);
    assert.ok(report.clientReady.sincePrevious >= 0);
  });

  it('getStartupReport returns empty for single phase', () => {
    const c = new PerformanceCollector();
    c.markStartupPhase('start');
    assert.deepEqual(c.getStartupReport(), {});
  });

  it('getStartupReport returns empty with no phases', () => {
    const c = new PerformanceCollector();
    assert.deepEqual(c.getStartupReport(), {});
  });
});
