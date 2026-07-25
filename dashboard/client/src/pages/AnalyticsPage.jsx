import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { BarChart3, TrendingUp, Users, Ticket, MessageSquare } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getTicketStats();
        setStats(data);
      } catch {
        toast('Failed to load analytics', 'error');
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-2 border-ice-300/20 border-t-ice-300 rounded-full animate-spin" />
      </div>
    );
  }

  const deptStats = stats?.byDepartment || {};
  const total = stats?.total || 0;
  const open = stats?.open || 0;
  const closed = stats?.closed || 0;

  const deptConfigs = {
    general: { name: 'General Support', emoji: '🛟', color: 'bg-ice-300/60' },
    reports: { name: 'Reports', emoji: '🚨', color: 'bg-red-400/60' },
    hiring: { name: 'Hiring', emoji: '💼', color: 'bg-purple-400/60' },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Analytics" subtitle="Ticket statistics and insights" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Ticket} label="Total Tickets" value={total} color="ice-300" />
        <StatCard icon={MessageSquare} label="Open" value={open} color="green-400" />
        <StatCard icon={BarChart3} label="Closed" value={closed} color="red-400" />
        <StatCard icon={TrendingUp} label="Departments" value={Object.keys(deptConfigs).length} color="purple-400" />
      </div>

      <div className="glass p-6 animate-fade-in-up" style={{ animationDelay: '100ms', opacity: 0 }}>
        <h3 className="section-title mb-5">Department Breakdown</h3>
        <div className="space-y-4">
          {Object.entries(deptConfigs).map(([id, dept]) => {
            const count = deptStats[id] || 0;
            const pct = total > 0 ? (count / total * 100).toFixed(1) : 0;
            return (
              <div key={id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{dept.emoji}</span>
                    <span className="text-sm font-medium text-dark-200">{dept.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-dark-100 tabular-nums">{count}</span>
                    <span className="text-xs text-dark-500 tabular-nums">({pct}%)</span>
                  </div>
                </div>
                <div className="h-2 bg-dark-900/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${dept.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass p-6 animate-fade-in-up" style={{ animationDelay: '200ms', opacity: 0 }}>
        <h3 className="section-title mb-4">Summary</h3>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-dark-100 tabular-nums">{total}</p>
            <p className="text-xs text-dark-500 mt-1">All Time</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400 tabular-nums">{open}</p>
            <p className="text-xs text-dark-500 mt-1">Currently Open</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-dark-400 tabular-nums">{closed}</p>
            <p className="text-xs text-dark-500 mt-1">Resolved</p>
          </div>
        </div>
      </div>
    </div>
  );
}
