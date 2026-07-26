import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import { BarChart3, TrendingUp, Ticket, MessageSquare, Clock, Timer } from 'lucide-react';

const DEPTS = {
  general: { name: 'General Support', emoji: '🛟', color: '#75CFF5' },
  reports: { name: 'Reports', emoji: '🚨', color: '#ED4245' },
  hiring: { name: 'Hiring', emoji: '💼', color: '#9B59B6' },
};

const DAY_RANGES = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: 'All', value: 365 },
];

function fmtDur(ms) {
  if (!ms || ms < 0) return 'N/A';
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  if (h > 24) { const d = Math.floor(h / 24); return `${d}d ${h % 24}h`; }
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

function BarChart({ data, labels, colors, maxVal }) {
  const max = maxVal || Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-800 border border-dark-700/50 rounded-lg px-2 py-1 text-[10px] text-dark-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {val} ticket{val !== 1 ? 's' : ''}
            {labels?.[i] && <span className="text-dark-500 ml-1">{labels[i]}</span>}
          </div>
          <div
            className="w-full rounded-t-sm transition-all duration-300 min-h-[2px]"
            style={{
              height: `${(val / max) * 100}%`,
              backgroundColor: colors?.[i] || 'rgb(117,207,245)',
              opacity: val > 0 ? 1 : 0.2,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function DateBarLabels({ dates, maxLabels = 7 }) {
  const step = Math.max(1, Math.floor(dates.length / maxLabels));
  return (
    <div className="flex gap-1 h-4">
      {dates.map((d, i) => (
        <div key={i} className="flex-1 text-center">
          {i % step === 0 && (
            <span className="text-[9px] text-dark-600">
              {new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function fillDates(created, closed, days) {
  const dates = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  const createdMap = {};
  created.forEach((d) => { createdMap[d._id] = d.count; });
  const closedMap = {};
  closed.forEach((d) => { closedMap[d._id] = d.count; });
  return {
    dates,
    createdCounts: dates.map((d) => createdMap[d] || 0),
    closedCounts: dates.map((d) => closedMap[d] || 0),
  };
}

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  const fetchStats = useCallback(async (days) => {
    setLoading(true);
    try {
      const data = await api.getTicketStats({ days });
      setStats(data);
    } catch {
      toast('Failed to load analytics', 'error');
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchStats(range); }, [range, fetchStats]);

  const deptStats = {};
  (stats?.byDepartment || []).forEach((d) => { deptStats[d._id] = d; });
  const total = stats?.total || 0;
  const open = stats?.open || 0;
  const closed = stats?.closed || 0;

  const { dates, createdCounts, closedCounts } = fillDates(
    stats?.createdOverTime || [],
    stats?.closedOverTime || [],
    stats?.days || range
  );

  const maxDaily = Math.max(...createdCounts, ...closedCounts, 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Analytics" subtitle="Ticket statistics and insights" />

      <div className="flex gap-1 p-1 glass w-fit">
        {DAY_RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all duration-200
              ${range === r.value
                ? 'bg-ice-300/15 text-ice-300 border border-ice-300/20'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/30 border border-transparent'
              }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-ice-300/20 border-t-ice-300 rounded-full animate-spin" />
        </div>
      ) : !stats ? (
        <div className="glass p-16 text-center text-dark-500">No data available.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Ticket} label="Total Tickets" value={total} color="ice-300" />
            <StatCard icon={MessageSquare} label="Open" value={open} color="green-400" />
            <StatCard icon={BarChart3} label="Closed" value={closed} color="red-400" />
            <StatCard icon={Timer} label="Avg Response" value={fmtDur(stats.avgFirstResponse)} color="purple-400" />
          </div>

          {/* Tickets Created vs Closed Over Time */}
          <div className="glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Tickets Over Time</h3>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-ice-300" /> Created</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" /> Closed</span>
              </div>
            </div>
            <div className="space-y-1">
              <BarChart
                data={createdCounts}
                colors={createdCounts.map(() => 'rgb(117,207,245)')}
                maxVal={maxDaily}
              />
              <DateBarLabels dates={dates} />
            </div>
            <div className="mt-3 pt-3 border-t border-dark-700/30">
              <BarChart
                data={closedCounts}
                colors={closedCounts.map(() => 'rgb(87,242,135)')}
                maxVal={maxDaily}
              />
              <DateBarLabels dates={dates} />
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="glass p-6">
            <h3 className="section-title mb-5">Department Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(DEPTS).map(([id, dept]) => {
                const d = deptStats[id] || { count: 0, open: 0, closed: 0 };
                const pct = total > 0 ? (d.count / total * 100).toFixed(1) : 0;
                return (
                  <div key={id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{dept.emoji}</span>
                        <span className="text-sm font-medium text-dark-200">{dept.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-dark-400">{d.open || 0} open</span>
                        <span className="text-dark-500">/</span>
                        <span className="text-dark-400">{d.closed || 0} closed</span>
                        <span className="font-semibold text-dark-100 tabular-nums w-12 text-right">{d.count}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-dark-900/50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: dept.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Avg Resolution */}
            <div className="glass p-6">
              <h3 className="section-title mb-4">Resolution Metrics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-dark-700/30">
                  <span className="text-sm text-dark-400 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Avg First Response</span>
                  <span className="text-sm font-semibold text-dark-100">{fmtDur(stats.avgFirstResponse)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-dark-700/30">
                  <span className="text-sm text-dark-400 flex items-center gap-2"><Timer className="w-3.5 h-3.5" /> Avg Resolution Time</span>
                  <span className="text-sm font-semibold text-dark-100">{fmtDur(stats.avgDuration)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-dark-400 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" /> Close Rate</span>
                  <span className="text-sm font-semibold text-dark-100">{total > 0 ? ((closed / total) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
            </div>

            {/* Top Users */}
            <div className="glass p-6">
              <h3 className="section-title mb-4">Top Ticket Creators</h3>
              {(!stats.topUsers || stats.topUsers.length === 0) ? (
                <p className="text-sm text-dark-500 text-center py-4">No data yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.topUsers.map((u, i) => {
                    const maxCount = stats.topUsers[0]?.count || 1;
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-dark-300 truncate max-w-[200px]">{u._id || 'Unknown'}</span>
                          <span className="text-sm font-semibold text-dark-100 tabular-nums">{u.count}</span>
                        </div>
                        <div className="h-1.5 bg-dark-900/50 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-ice-300/60 transition-all duration-500" style={{ width: `${(u.count / maxCount) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
