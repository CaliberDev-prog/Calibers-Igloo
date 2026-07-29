import { execSync } from 'child_process';
import { PerformanceCollector } from '../src/utils/performance.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = join(__dirname, '..', 'reports');

const COMMIT_SHA = (() => {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch { return 'unknown'; }
})();

const ENV = {
  commitSha: COMMIT_SHA,
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  timestamp: new Date().toISOString(),
  nodeEnv: process.env.NODE_ENV || 'development',
  pid: process.pid,
  memoryTotal: process.memoryUsage().heapTotal,
};

function simulateApiTraffic(collector, count) {
  const endpoints = [
    { method: 'GET', route: '/api/overview', p50: 45, p95: 120, p99: 300 },
    { method: 'GET', route: '/api/config', p50: 30, p95: 80, p99: 200 },
    { method: 'GET', route: '/api/tickets', p50: 60, p95: 150, p99: 400 },
    { method: 'GET', route: '/api/tickets/:id', p50: 40, p95: 100, p99: 250 },
    { method: 'GET', route: '/api/giveaways', p50: 35, p95: 90, p99: 220 },
    { method: 'GET', route: '/api/messages', p50: 50, p95: 110, p99: 280 },
    { method: 'GET', route: '/api/users', p50: 55, p95: 130, p99: 350 },
    { method: 'GET', route: '/api/blacklists', p50: 25, p95: 70, p99: 180 },
    { method: 'GET', route: '/api/audit-logs', p50: 40, p95: 95, p99: 240 },
    { method: 'GET', route: '/api/commands', p50: 20, p95: 50, p99: 150 },
    { method: 'GET', route: '/api/health', p50: 5, p95: 15, p99: 50 },
    { method: 'GET', route: '/api/discord/channels', p50: 80, p95: 200, p99: 500 },
    { method: 'GET', route: '/api/discord/roles', p50: 70, p95: 180, p99: 450 },
    { method: 'POST', route: '/api/auth/login', p50: 100, p95: 250, p99: 600 },
    { method: 'POST', route: '/api/auth/refresh', p50: 50, p95: 120, p99: 300 },
  ];

  const outlierChance = 0.01;

  for (let i = 0; i < count; i++) {
    const ep = endpoints[i % endpoints.length];
    let ms = gaussianRandom(ep.p50, (ep.p95 - ep.p50) / 1.65);
    ms = Math.max(1, Math.round(ms));
    if (Math.random() < outlierChance) {
      ms = ms * (3 + Math.random() * 3);
    }
    const statusCode = Math.random() < 0.95 ? 200 : (Math.random() < 0.5 ? 400 : 500);
    collector.record('api', `${ep.method} ${ep.route}`, ms, {
      statusCode,
      requestId: `sim-${i}`,
    });
  }
}

function simulateMongoTraffic(collector, count) {
  const operations = [
    { model: 'Ticket', op: 'find', p50: 15, p95: 60, p99: 200 },
    { model: 'Ticket', op: 'findOne', p50: 8, p95: 30, p99: 100 },
    { model: 'Ticket', op: 'findOneAndUpdate', p50: 12, p95: 40, p99: 120 },
    { model: 'Ticket', op: 'insertOne', p50: 10, p95: 35, p99: 110 },
    { model: 'Ticket', op: 'countDocuments', p50: 20, p95: 70, p99: 250 },
    { model: 'DashboardUser', op: 'findOne', p50: 5, p95: 20, p99: 80 },
    { model: 'Giveaway', op: 'find', p50: 10, p95: 40, p99: 150 },
    { model: 'AuditLog', op: 'find', p50: 25, p95: 80, p99: 300 },
  ];

  for (let i = 0; i < count; i++) {
    const op = operations[i % operations.length];
    let ms = gaussianRandom(op.p50, (op.p95 - op.p50) / 1.65);
    ms = Math.max(1, Math.round(ms));
    if (ms > 100) {
      collector.record('slow_query', `${op.model}.${op.op}`, ms, { model: op.model, operation: op.op });
    }
    collector.record('mongodb', `${op.model}.${op.op}`, ms);
  }
}

function simulateCommandTraffic(collector, count) {
  const commands = [
    { name: 'ticket', p50: 200, p95: 600, p99: 2000 },
    { name: 'setup', p50: 1500, p95: 4000, p99: 8000 },
    { name: 'ping', p50: 50, p95: 150, p99: 400 },
    { name: 'panel', p50: 300, p95: 800, p99: 2500 },
    { name: 'moderation', p50: 250, p95: 700, p99: 2200 },
    { name: 'reminder', p50: 100, p95: 300, p99: 1000 },
  ];

  for (let i = 0; i < count; i++) {
    const cmd = commands[i % commands.length];
    let ms = gaussianRandom(cmd.p50, (cmd.p95 - cmd.p50) / 1.65);
    ms = Math.max(5, Math.round(ms));
    const success = Math.random() < 0.92;
    collector.record('command', cmd.name, ms, { success });
  }
}

function gaussianRandom(mean, stddev) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

function recordColdStart(collector) {
  const now = Date.now();
  collector._startup = {
    processStart: now,
    importsLoaded: now + 12,
    mongodbConnect: now + 450,
    clientReady: now + 820,
  };
  collector.record('startup', 'total', 820, { type: 'cold' });
  collector.record('startup', 'mongodb-connect', 438, { type: 'cold' });
  collector.record('startup', 'module-load', 12, { type: 'cold' });
}

function recordWarmStart(collector) {
  const now = Date.now();
  collector._startup = {
    processStart: now,
    importsLoaded: now + 8,
    mongodbConnect: now + 120,
    clientReady: now + 200,
  };
  collector.record('startup', 'total', 200, { type: 'warm' });
  collector.record('startup', 'mongodb-connect', 112, { type: 'warm' });
  collector.record('startup', 'module-load', 8, { type: 'warm' });
}

function generateReport(collectorCold, collectorWarm, collectorTraffic) {
  const coldReport = collectorCold.generateBaselineReport();
  const warmReport = collectorWarm.generateBaselineReport();
  const trafficReport = collectorTraffic.generateBaselineReport();

  return {
    environment: ENV,
    methodology: {
      description: 'Synthetic baseline using gaussian-distributed timing data simulating real traffic patterns.',
      outlierRate: '1% of requests received 3-6x normal latency to simulate real-world tail latency',
      successRate: '92% for commands, 95% for API requests',
      concurrency: 'Requests generated sequentially (no concurrent load)',
      datasetSize: `${collectorTraffic.getRecords().length} total simulated requests`,
    },
    coldStart: coldReport,
    warmStart: warmReport,
    traffic: trafficReport,
    summary: {
      api: trafficReport.summaries ? summarizeCategory(trafficReport, 'api') : null,
      mongodb: trafficReport.summaries ? summarizeCategory(trafficReport, 'mongodb') : null,
      command: trafficReport.summaries ? summarizeCategory(trafficReport, 'command') : null,
    },
    budgetStatus: computeBudgetStatus(trafficReport),
    knownLimitations: [
      'Synthetic data approximates real traffic distributions but is not actual production traffic',
      'No concurrent request testing (all requests sequential)',
      'MongoDB timings estimated based on typical Atlas M0 cluster performance',
      'Cold/warm start times estimated for typical Render free-tier cold boot',
      'No rate-limited or throttled request testing',
      'Static asset delivery and CDN caching not measured',
      'Client-side rendering performance not measured',
    ],
  };
}

function summarizeCategory(report, category) {
  const result = {};
  if (!report.summaries) return result;
  for (const [key, summary] of Object.entries(report.summaries)) {
    if (key.startsWith(`${category}:`)) {
      result[key] = summary;
    }
  }
  return result;
}

function computeBudgetStatus(report) {
  const budgets = [
    { id: 'api-p50', name: 'API p50 < 200ms', target: 'p50', max: 200, status: 'unknown' },
    { id: 'api-p95', name: 'API p95 < 500ms', target: 'p95', max: 500, status: 'unknown' },
    { id: 'api-p99', name: 'API p99 < 2s', target: 'p99', max: 2000, status: 'unknown' },
    { id: 'mongo-p95', name: 'MongoDB p95 < 100ms', target: 'p95', max: 100, status: 'unknown' },
    { id: 'command', name: 'Bot command < 3s', target: 'p95', max: 3000, status: 'unknown' },
    { id: 'health', name: 'Health endpoint < 100ms', target: 'p95', max: 100, status: 'unknown' },
  ];

  if (!report.summaries) return budgets;

  for (const budget of budgets) {
    if (budget.id === 'health') {
      const health = Object.entries(report.summaries)
        .find(([k]) => k.includes('GET /api/health') || k.includes('GET /health'));
      if (health) {
        budget.status = health[1][budget.target] <= budget.max ? 'pass' : 'fail';
        budget.actual = health[1][budget.target];
      }
      continue;
    }
    if (budget.id === 'command') {
      const all = Object.entries(report.summaries).filter(([k]) => k.startsWith('command:'));
      if (all.length > 0) {
        const worst = Math.max(...all.map(([, s]) => s[budget.target]));
        budget.status = worst <= budget.max ? 'pass' : 'fail';
        budget.actual = worst;
      }
      continue;
    }
    if (budget.id === 'mongo-p95') {
      const all = Object.entries(report.summaries).filter(([k]) => k.startsWith('mongodb:'));
      if (all.length > 0) {
        const worst = Math.max(...all.map(([, s]) => s.p95));
        budget.status = worst <= budget.max ? 'pass' : 'fail';
        budget.actual = worst;
      }
      continue;
    }
    if (budget.id.startsWith('api-')) {
      const all = Object.entries(report.summaries).filter(([k]) => k.startsWith('api:'));
      if (all.length > 0) {
        const values = all.map(([, s]) => s[budget.target]);
        const sum = values.reduce((a, b) => a + b, 0);
        budget.actual = Math.round(sum / values.length);
        budget.status = budget.actual <= budget.max ? 'pass' : 'fail';
      }
      continue;
    }
  }
  return budgets;
}

function formatReport(report) {
  const lines = [];
  lines.push('# Performance Baseline Report');
  lines.push('');
  lines.push(`Generated: ${report.environment.timestamp}`);
  lines.push(`Commit SHA: \`${report.environment.commitSha}\``);
  lines.push(`Node: ${report.environment.nodeVersion}`);
  lines.push(`Platform: ${report.environment.platform} (${report.environment.arch})`);
  lines.push(`Environment: ${report.environment.nodeEnv}`);
  lines.push('');

  lines.push('## Methodology');
  lines.push('');
  lines.push(report.methodology.description);
  lines.push('');
  lines.push(`- Outlier rate: ${report.methodology.outlierRate}`);
  lines.push(`- Dataset: ${report.methodology.datasetSize}`);
  lines.push(`- Concurrency: ${report.methodology.concurrency}`);
  lines.push('');

  lines.push('## Cold Start Timing');
  lines.push('');
  lines.push('| Phase | Duration (ms) | Since Previous (ms) |');
  lines.push('|-------|---------------|---------------------|');
  if (report.coldStart.startup) {
    for (const [phase, data] of Object.entries(report.coldStart.startup)) {
      lines.push(`| ${phase} | ${data.sinceStart} | ${data.sincePrevious} |`);
    }
  }
  lines.push('');

  lines.push('## Warm Start Timing');
  lines.push('');
  lines.push('| Phase | Duration (ms) | Since Previous (ms) |');
  lines.push('|-------|---------------|---------------------|');
  if (report.warmStart.startup) {
    for (const [phase, data] of Object.entries(report.warmStart.startup)) {
      lines.push(`| ${phase} | ${data.sinceStart} | ${data.sincePrevious} |`);
    }
  }
  lines.push('');

  lines.push('## API Endpoint Response Times');
  lines.push('');
  lines.push('| Endpoint | Count | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) |');
  lines.push('|----------|-------|----------|----------|----------|----------|');
  if (report.summary.api) {
    const sorted = Object.entries(report.summary.api).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [key, s] of sorted) {
      const label = key.replace('api:', '');
      lines.push(`| ${label} | ${s.count} | ${s.avg} | ${s.p50} | ${s.p95} | ${s.p99} |`);
    }
  }
  lines.push('');

  lines.push('## MongoDB Query Durations');
  lines.push('');
  lines.push('| Operation | Count | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) |');
  lines.push('|-----------|-------|----------|----------|----------|----------|');
  if (report.summary.mongodb) {
    const sorted = Object.entries(report.summary.mongodb).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [key, s] of sorted) {
      const label = key.replace('mongodb:', '');
      lines.push(`| ${label} | ${s.count} | ${s.avg} | ${s.p50} | ${s.p95} | ${s.p99} |`);
    }
  }
  lines.push('');

  lines.push('## Command Execution Times');
  lines.push('');
  lines.push('| Command | Count | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) |');
  lines.push('|---------|-------|----------|----------|----------|----------|');
  if (report.summary.command) {
    const sorted = Object.entries(report.summary.command).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [key, s] of sorted) {
      const label = key.replace('command:', '');
      lines.push(`| ${label} | ${s.count} | ${s.avg} | ${s.p50} | ${s.p95} | ${s.p99} |`);
    }
  }
  lines.push('');

  lines.push('## Budget Compliance');
  lines.push('');
  lines.push('| Budget | Target | Actual | Status |');
  lines.push('|--------|--------|--------|--------|');
  for (const b of report.budgetStatus) {
    const actual = b.actual !== undefined ? `${b.actual}ms` : 'N/A';
    const maxStr = `${b.max}ms`;
    const statusSymbol = b.status === 'pass' ? 'PASS' : (b.status === 'fail' ? 'FAIL' : 'N/A');
    lines.push(`| ${b.name} | ${maxStr} | ${actual} | ${statusSymbol} |`);
  }
  lines.push('');

  lines.push('## Slow Request and Query Summary');
  lines.push('');
  const slowRequests = report.traffic.records
    ? report.traffic.records.filter(r => r.category === 'slow_request').length
    : 0;
  const slowQueries = report.traffic.totalRecords
    ? report.traffic.records ? report.traffic.records.filter(r => r.category === 'slow_query').length : 0
    : Object.entries(report.traffic.summaries || {})
        .filter(([k]) => k.startsWith('slow_query:'))
        .reduce((sum, [, s]) => sum + s.count, 0);
  const errorCount = report.traffic.records
    ? report.traffic.records.filter(r => r.metadata && r.metadata.statusCode && r.metadata.statusCode >= 400).length
    : 'N/A';
  lines.push(`- Slow requests (>2s): ${slowRequests}`);
  lines.push(`- Slow queries (>100ms): ${slowQueries}`);
  lines.push(`- Error responses (4xx/5xx): ${errorCount}`);
  lines.push('');

  lines.push('## Known Limitations');
  lines.push('');
  for (const lim of report.knownLimitations) {
    lines.push(`- ${lim}`);
  }
  lines.push('');

  lines.push('## How to Run Against Live Deployment');
  lines.push('');
  lines.push('1. Deploy the current commit to Render.');
  lines.push('2. Authenticate as owner and generate a JWT token.');
  lines.push('3. Hit the API with realistic traffic for 5-10 minutes.');
  lines.push('4. Call \`GET /api/performance/metrics\` with owner token to get the live report.');
  lines.push('5. Compare against this synthetic baseline.');
  lines.push('');

  return lines.join('\n');
}

const API_COUNT = 3000;
const MONGO_COUNT = 2000;
const COMMAND_COUNT = 500;

const coldCollector = new PerformanceCollector();
const warmCollector = new PerformanceCollector();
const trafficCollector = new PerformanceCollector();

recordColdStart(coldCollector);
recordWarmStart(warmCollector);

console.log(`[BASELINE] Generating ${API_COUNT} API request samples...`);
simulateApiTraffic(trafficCollector, API_COUNT);

console.log(`[BASELINE] Generating ${MONGO_COUNT} MongoDB query samples...`);
simulateMongoTraffic(trafficCollector, MONGO_COUNT);

console.log(`[BASELINE] Generating ${COMMAND_COUNT} command execution samples...`);
simulateCommandTraffic(trafficCollector, COMMAND_COUNT);

const totalRecords = API_COUNT + MONGO_COUNT + COMMAND_COUNT;
console.log(`[BASELINE] Total records: ${totalRecords}`);

const report = generateReport(coldCollector, warmCollector, trafficCollector);

const markdown = formatReport(report);

if (!existsSync(REPORT_DIR)) {
  mkdirSync(REPORT_DIR, { recursive: true });
}

const reportPath = join(REPORT_DIR, `baseline-${COMMIT_SHA.slice(0, 8)}.md`);
writeFileSync(reportPath, markdown, 'utf8');

const jsonPath = join(REPORT_DIR, `baseline-${COMMIT_SHA.slice(0, 8)}.json`);
writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

console.log(`\n[BASELINE] Report written to:`);
console.log(`  ${reportPath}`);
console.log(`  ${jsonPath}`);
console.log(`\n${markdown}`);
