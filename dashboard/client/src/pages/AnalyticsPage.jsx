import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { BarChart3, TrendingUp, Clock, Users, MessageSquare, Crown } from 'lucide-react';

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getTicketStats();
        setStats(data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    })();
  }, []);

  const formatMs = (ms) => {
    if (!ms) return 'N/A';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const DEPT_NAMES = { general: 'General Support', reports: 'Reports', hiring: 'Hiring' };
  const DEPT_EMOJIS = { general: '🛟', reports: '🚨', hiring: '💼' };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
      </div>
    );
  }

  const maxDayCount = stats?.last7Days?.length
    ? Math.max(...stats.last7Days.map((d) => d.count), 1)
    : 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-100">Analytics</h1>
        <p className="text-dark-400 text-sm mt-1">Ticket statistics and insights</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card" style={{ animationDelay: '0ms' }}>
          <MessageSquare className="w-5 h-5 text-ice-300 mb-1" />
          <p className="text-2xl font-bold text-dark-100">{stats?.total || 0}</p>
          <p className="text-sm text-dark-400">Total Tickets</p>
        </div>
        <div className="stat-card" style={{ animationDelay: '50ms' }}>
          <BarChart3 className="w-5 h-5 text-green-400 mb-1" />
          <p className="text-2xl font-bold text-dark-100">{stats?.open || 0}</p>
          <p className="text-sm text-dark-400">Open</p>
        </div>
        <div className="stat-card" style={{ animationDelay: '100ms' }}>
          <TrendingUp className="w-5 h-5 text-red-400 mb-1" />
          <p className="text-2xl font-bold text-dark-100">{stats?.closed || 0}</p>
          <p className="text-sm text-dark-400">Closed</p>
        </div>
        <div className="stat-card" style={{ animationDelay: '150ms' }}>
          <Clock className="w-5 h-5 text-yellow-400 mb-1" />
          <p className="text-2xl font-bold text-dark-100">{formatMs(stats?.avgDuration)}</p>
          <p className="text-sm text-dark-400">Avg Duration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <h3 className="text-sm font-semibold text-dark-200 mb-4">By Department</h3>
          <div className="space-y-3">
            {(stats?.byDepartment || []).map((d) => {
              const pct = stats?.total > 0 ? (d.count / stats.total) * 100 : 0;
              return (
                <div key={d._id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-300">{DEPT_EMOJIS[d._id] || '🎫'} {DEPT_NAMES[d._id] || d._id}</span>
                    <span className="text-dark-400">{d.count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2.5 bg-dark-800 rounded-full overflow-hidden">
                    <div className="h-full bg-ice-300/60 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {(!stats?.byDepartment || stats.byDepartment.length === 0) && (
              <p className="text-dark-500 text-sm text-center py-4">No data yet</p>
            )}
          </div>
        </div>

        <div className="glass p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <h3 className="text-sm font-semibold text-dark-200 mb-4">Last 7 Days</h3>
          {stats?.last7Days?.length > 0 ? (
            <>
              <div className="space-y-3">
                {stats.last7Days.map((d) => {
                  const pct = maxDayCount > 0 ? (d.count / maxDayCount) * 100 : 0;
                  return (
                    <div key={d._id} className="flex items-center gap-3">
                      <span className="text-xs text-dark-500 w-20 text-right flex-shrink-0">
                        {new Date(d._id).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex-1 h-10 bg-dark-800 rounded-xl overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-ice-300/40 to-ice-300/70 rounded-xl transition-all duration-700 flex items-center px-3"
                          style={{ width: `${Math.max(pct, 10)}%` }}
                        >
                          <span className="text-xs text-dark-100 font-semibold">{d.count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-dark-700/30 flex items-center justify-between text-xs text-dark-500">
                <span>Total: {stats.last7Days.reduce((s, d) => s + d.count, 0)} tickets</span>
                <span>Avg: {(stats.last7Days.reduce((s, d) => s + d.count, 0) / stats.last7Days.length).toFixed(1)}/day</span>
              </div>
            </>
          ) : (
            <p className="text-dark-500 text-sm text-center py-4">No data yet</p>
          )}
        </div>
      </div>

      {stats?.topUsers?.length > 0 && (
        <div className="glass p-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-semibold text-dark-200">Top Users</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.topUsers.map((u, i) => (
              <div key={u._id || i} className="flex items-center gap-3 bg-dark-900/40 rounded-xl p-3 border border-dark-700/30">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-yellow-400/20 text-yellow-400' :
                  i === 1 ? 'bg-dark-400/20 text-dark-300' :
                  'bg-orange-400/20 text-orange-400'
                }`}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-dark-200 font-medium truncate">{u.tag || u._id}</p>
                  <p className="text-xs text-dark-500">{u.count} ticket{u.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass p-4 animate-fade-in" style={{ animationDelay: '350ms' }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-dark-100">{stats?.total || 0}</p>
            <p className="text-xs text-dark-500">Total</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-400">{stats?.open || 0}</p>
            <p className="text-xs text-dark-500">Open</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-400">{stats?.closed || 0}</p>
            <p className="text-xs text-dark-500">Closed</p>
          </div>
          <div>
            <p className="text-lg font-bold text-ice-300">{stats?.topUsers?.length || 0}</p>
            <p className="text-xs text-dark-500">Active Users</p>
          </div>
        </div>
      </div>
    </div>
  );
}
