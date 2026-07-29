const MAX_RECORDS = 10000;

export class PerformanceCollector {
  constructor() {
    this._records = [];
    this._startup = {};
  }

  record(category, label, durationMs, metadata) {
    if (this._records.length >= MAX_RECORDS) {
      this._records.shift();
    }
    this._records.push({
      category,
      label,
      durationMs: Math.round(durationMs * 100) / 100,
      timestamp: Date.now(),
      ...(metadata ? { metadata } : {}),
    });
  }

  startTimer(category, label) {
    const start = Date.now();
    return (metadata) => {
      const duration = Date.now() - start;
      this.record(category, label, duration, metadata);
      return duration;
    };
  }

  markStartupPhase(name) {
    if (!this._startup.start) {
      this._startup.start = Date.now();
    }
    this._startup[name] = name;
  }

  getStartupReport() {
    const phases = {};
    const keys = Object.keys(this._startup);
    if (keys.length < 2) return phases;
    const startVal = this._startup[keys[0]];
    for (let i = 1; i < keys.length; i++) {
      const prevKey = keys[i - 1];
      const currKey = keys[i];
      phases[currKey] = {
        sinceStart: this._startup[currKey] - startVal,
        sincePrevious: this._startup[currKey] - this._startup[prevKey],
      };
    }
    return phases;
  }

  getRecords(category) {
    if (category) {
      return this._records.filter((r) => r.category === category);
    }
    return [...this._records];
  }

  getSummary(category, label) {
    let filtered = this._records;
    if (category) filtered = filtered.filter((r) => r.category === category);
    if (label) filtered = filtered.filter((r) => r.label === label);
    if (filtered.length === 0) return null;

    const durations = filtered.map((r) => r.durationMs).sort((a, b) => a - b);
    const len = durations.length;
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count: len,
      min: durations[0],
      max: durations[len - 1],
      avg: Math.round((sum / len) * 100) / 100,
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
    };
  }

  getAllSummaries() {
    const groups = {};
    for (const r of this._records) {
      const key = `${r.category}:${r.label}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r.durationMs);
    }
    const result = {};
    for (const [key, durations] of Object.entries(groups)) {
      const sorted = durations.sort((a, b) => a - b);
      const len = sorted.length;
      const sum = sorted.reduce((a, b) => a + b, 0);
      result[key] = {
        count: len,
        min: sorted[0],
        max: sorted[len - 1],
        avg: Math.round((sum / len) * 100) / 100,
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
      };
    }
    return result;
  }

  generateBaselineReport() {
    const summaries = this.getAllSummaries();
    const startupReport = this.getStartupReport();
    return {
      generatedAt: new Date().toISOString(),
      totalRecords: this._records.length,
      startup: Object.keys(startupReport).length > 0 ? startupReport : undefined,
      categories: [...new Set(this._records.map((r) => r.category))],
      summaries,
    };
  }

  clear() {
    this._records = [];
    this._startup = {};
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

export const perf = new PerformanceCollector();
