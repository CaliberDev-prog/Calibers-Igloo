import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { BarChart3, TrendingUp, Clock, Users, MessageSquare } from 'lucide-react';

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-100">Analytics</h1>
        <p className="text-dark-400 text-sm mt-1">Ticket statistics and insights</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <MessageSquare className="w-5 h-5 text-ice-300 mb-1" />
          <p className="text-2xl font-bold text-dark-100">{stats?.total || 0}</p>
          <p className="text-sm text-dark-400">Total Tickets</p>
        </div>
        <div className="stat-card">
          <BarChart3 className="w-5 h-5 text-green-400 mb-1" />
          <p className="text-2xl font-bold text-dark-100">{stats?.open || 0}</p>
          <p className="text-sm text-dark-400">Open</p>
        </div>
        <div className="stat-card">
          <TrendingUp className="w-5 h-5 text-red-400 mb-1" />
          <p className="text-2xl font-bold text-dark-100">{stats?.closed || 0}</p>
          <p className="text-sm text-dark-400">Closed</p>
        </div>
        <div className="stat-card">
          <Clock className="w-5 h-5 text-yellow-400 mb-1" />
          <p className="text-2xl font-bold text-dark-100">{formatMs(stats?.avgDuration)}</p>
          <p className="text-sm text-dark-400">Avg Duration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-6">
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
                  <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
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

        <div className="glass p-6">
          <h3 className="text-sm font-semibold text-dark-200 mb-4">Last 7 Days</h3>
          {stats?.last7Days?.length > 0 ? (
            <div className="space-y-2">
              {stats.last7Days.map((d) => {
                const maxCount = Math.max(...stats.last7Days.map(x => x.count));
                const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                return (
                  <div key={d._id} className="flex items-center gap-3">
                    <span className="text-xs text-dark-500 w-20 text-right">{d._id.slice(5)}</span>
                    <div className="flex-1 h-6 bg-dark-800 rounded-lg overflow-hidden">
                      <div className="h-full bg-ice-300/40 rounded-lg transition-all duration-700 flex items-center px-2" style={{ width: `${Math.max(pct, 8)}%` }}>
                        <span className="text-xs text-dark-200 font-medium">{d.count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-dark-500 text-sm text-center py-4">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
