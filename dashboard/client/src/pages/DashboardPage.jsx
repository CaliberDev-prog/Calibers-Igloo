import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../components/Toast.jsx';
import StatCard from '../components/StatCard.jsx';
import {
  Ticket, Users, MessageSquare, Shield, Clock,
  Activity, Database, Cpu, ChevronRight, RefreshCw,
  Send, BarChart3, FileText, Snowflake, Terminal, Settings,
  CheckCircle2, ArrowUpRight, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

function DeptBar({ name, emoji, open, total, color }) {
  const pct = total > 0 ? (open / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-2.5 group">
      <span className="text-base w-7 text-center">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-dark-300 font-medium">{name}</span>
          <span className="text-dark-500 tabular-nums">{open} / {total}</span>
        </div>
        <div className="h-1.5 bg-dark-900/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ log }) {
  const categoryColors = {
    auth: { text: 'text-blue-400', bg: 'bg-blue-400/10' },
    ticket: { text: 'text-ice-300', bg: 'bg-ice-300/10' },
    message: { text: 'text-green-400', bg: 'bg-green-400/10' },
    config: { text: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    blacklist: { text: 'text-red-400', bg: 'bg-red-400/10' },
    general: { text: 'text-dark-400', bg: 'bg-dark-400/10' },
  };
  const c = categoryColors[log.category] || categoryColors.general;
  const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="flex items-center gap-3 py-2.5 group">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg}`}>
        <FileText className={`w-3.5 h-3.5 ${c.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-dark-300 truncate leading-tight">{log.description || log.action}</p>
        {log.username && <p className="text-[11px] text-dark-600 mt-0.5">by {log.username}</p>}
      </div>
      <span className="text-[10px] text-dark-600 flex-shrink-0 tabular-nums">{timeAgo(log.createdAt)}</span>
    </div>
  );
}

function RecentTicket({ ticket }) {
  const deptEmojis = { general: '🛟', reports: '🚨', hiring: '💼' };
  const statusColors = {
    open: 'text-green-400 bg-green-400/10 border-green-400/20',
    closed: 'text-red-400 bg-red-400/10 border-red-400/20',
    deleted: 'text-dark-500 bg-dark-500/10 border-dark-500/20',
    creating: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  };
  return (
    <Link
      to={`/tickets/${ticket.ticketId}`}
      className="flex items-center gap-3.5 px-4 py-3 hover:bg-dark-700/15 transition-all duration-200 group rounded-xl mx-2"
    >
      <span className="text-base w-7 text-center">{deptEmojis[ticket.departmentId] || '🎫'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-dark-200 font-mono">#{String(ticket.ticketId).padStart(4, '0')}</span>
          <span className={`badge text-[10px] ${statusColors[ticket.status] || statusColors.open}`}>
            {ticket.status}
          </span>
        </div>
        <p className="text-xs text-dark-500 truncate mt-0.5">{ticket.creatorTag || ticket.creatorId}</p>
      </div>
      <span className="text-xs text-dark-600 tabular-nums">{new Date(ticket.createdAt).toLocaleDateString()}</span>
      <ChevronRight className="w-4 h-4 text-dark-600 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

const QUICK_ACTIONS = [
  { to: '/messages', icon: Send, label: 'Send Message', desc: 'Chat & embeds', color: 'text-ice-300', bg: 'bg-ice-300/10' },
  { to: '/server', icon: Zap, label: 'Server', desc: 'Channels & roles', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { to: '/tickets', icon: Ticket, label: 'Tickets', desc: 'View & manage', color: 'text-green-400', bg: 'bg-green-400/10' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', desc: 'Stats & charts', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { to: '/audit-logs', icon: FileText, label: 'Audit Logs', desc: 'Activity feed', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { to: '/blacklists', icon: Shield, label: 'Blacklists', desc: 'Manage blocks', color: 'text-red-400', bg: 'bg-red-400/10' },
  { to: '/terminal', icon: Terminal, label: 'Terminal', desc: 'Run commands', color: 'text-orange-400', bg: 'bg-orange-400/10', ownerOnly: true },
  { to: '/settings', icon: Settings, label: 'Settings', desc: 'Config', color: 'text-dark-300', bg: 'bg-dark-400/10' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const overview = await api.getOverview();
      setData(overview);
      api.getAuditLogs({ limit: 8 }).then((d) => setAuditLogs(d.logs || [])).catch(() => {});
    } catch (err) {
      console.error('Failed to load overview:', err);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const formatUptime = (s) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    return `${h}h ${m}m`;
  };

  const formatBytes = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`;

  const deptConfigs = {
    general: { name: 'General Support', emoji: '🛟', color: 'bg-ice-300/60' },
    reports: { name: 'Reports', emoji: '🚨', color: 'bg-red-400/60' },
    hiring: { name: 'Hiring', emoji: '💼', color: 'bg-purple-400/60' },
  };

  const recentTickets = data?.recentTickets || [];
  const deptBreakdown = data?.tickets?.byDepartment || {};

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 tracking-tight">Command Center</h1>
          <p className="text-dark-400 text-sm mt-1">Welcome back, <span className="text-dark-300 font-medium">{user?.username}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-800/30 border border-dark-700/20">
            <div className={`w-2 h-2 rounded-full ${data?.database === 'connected' ? 'bg-green-400 shadow-lg shadow-green-400/30' : 'bg-red-400'}`} />
            <span className="text-xs text-dark-400">DB {data?.database || '...'}</span>
          </div>
          <button onClick={refresh} className="btn-ghost btn-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {data?.guild && (
        <div className="glass p-5 flex items-center gap-4 animate-fade-in-up glow-border">
          {data.guild.icon ? (
            <img src={data.guild.icon} alt="" className="w-14 h-14 rounded-2xl shadow-lg shadow-dark-950/30" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ice-300/20 to-ice-500/20 flex items-center justify-center">
              <Snowflake className="w-7 h-7 text-ice-300" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-dark-100 tracking-tight">{data.guild.name}</h2>
            <p className="text-sm text-dark-400">
              <span className="text-dark-300">{data.guild.memberCount?.toLocaleString()}</span> members · <span className="text-dark-300">{data.guild.onlineCount?.toLocaleString()}</span> online
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Ticket} label="Open Tickets" value={data?.tickets?.open ?? '...'} color="ice-300" delay={0} />
        <StatCard icon={MessageSquare} label="Total Tickets" value={data?.tickets?.total ?? '...'} color="blue-400" delay={50} />
        <StatCard icon={CheckCircle2} label="Closed" value={data?.tickets?.closed ?? '...'} color="green-400" delay={100} />
        <StatCard icon={Shield} label="Blacklisted" value={data?.blacklists ?? '...'} color="red-400" delay={150} />
        <StatCard icon={Clock} label="Uptime" value={data?.bot ? formatUptime(data.bot.uptime) : '...'} color="green-400" delay={200} />
        <StatCard icon={Cpu} label="Memory" value={data?.bot ? formatBytes(data.bot.memory?.heapUsed || 0) : '...'} color="purple-400" delay={250} />
      </div>

      <div>
        <p className="section-title">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.filter((a) => !a.ownerOnly || user?.role === 'owner').map((action, i) => (
            <Link
              key={action.to}
              to={action.to}
              className="glass-hover p-4 flex items-center gap-3 animate-fade-in-up group"
              style={{ animationDelay: `${i * 40}ms`, opacity: 0 }}
            >
              <div className={`w-9 h-9 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                <action.icon className={`w-[18px] h-[18px] ${action.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-dark-200 truncate">{action.label}</p>
                <p className="text-[11px] text-dark-500 truncate">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass p-6 animate-fade-in-up" style={{ animationDelay: '100ms', opacity: 0 }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-dark-200">Department Breakdown</h3>
            <Link to="/analytics" className="text-xs text-ice-300 hover:text-ice-200 transition-colors flex items-center gap-1">
              Analytics <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-0.5">
            {Object.entries(deptConfigs).map(([id, dept]) => (
              <DeptBar
                key={id}
                name={dept.name}
                emoji={dept.emoji}
                open={deptBreakdown[id] || 0}
                total={data?.tickets?.open || 0}
                color={dept.color}
              />
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-dark-700/30 grid grid-cols-3 gap-4 text-center">
            {Object.entries(deptConfigs).map(([id, dept]) => (
              <div key={id} className="py-2">
                <p className="text-xl font-bold text-dark-100 tabular-nums">{deptBreakdown[id] || 0}</p>
                <p className="text-xs text-dark-500 mt-0.5">{dept.emoji} {dept.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-6 animate-fade-in-up" style={{ animationDelay: '150ms', opacity: 0 }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-dark-200">System</h3>
            <Link to="/health" className="text-xs text-ice-300 hover:text-ice-200 transition-colors flex items-center gap-1">
              Details <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3.5">
            {[
              { icon: Database, label: 'Database', value: data?.database, isBadge: true, ok: data?.database === 'connected' },
              { icon: Cpu, label: 'Memory', value: data?.bot ? formatBytes(data.bot.memory?.heapUsed || 0) : '...' },
              { icon: Activity, label: 'Node.js', value: data?.bot?.nodeVersion || '...' },
              { icon: Clock, label: 'Uptime', value: data?.bot?.uptime != null ? formatUptime(data.bot.uptime) : '...' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4 text-dark-500" />
                  <span className="text-sm text-dark-400">{item.label}</span>
                </div>
                {item.isBadge ? (
                  <span className={`badge ${item.ok ? 'bg-green-400/10 text-green-400 border-green-400/20' : 'bg-red-400/10 text-red-400 border-red-400/20'}`}>
                    {item.value || 'unknown'}
                  </span>
                ) : (
                  <span className="text-xs text-dark-300 tabular-nums font-medium">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass overflow-hidden animate-fade-in-up" style={{ animationDelay: '200ms', opacity: 0 }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700/30">
            <h3 className="text-sm font-semibold text-dark-200">Recent Tickets</h3>
            <Link to="/tickets" className="text-xs text-ice-300 hover:text-ice-200 transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="py-1">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-ice-300/20 border-t-ice-300 rounded-full animate-spin" />
              </div>
            ) : recentTickets.length > 0 ? (
              recentTickets.slice(0, 5).map((t) => (
                <RecentTicket key={t.ticketId} ticket={t} />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-dark-800/40 border border-dark-700/20 flex items-center justify-center mx-auto mb-4">
                  <Ticket className="w-7 h-7 text-dark-600" />
                </div>
                <p className="text-dark-400 text-sm font-medium">No tickets yet</p>
                <p className="text-dark-600 text-xs mt-1">They'll appear here as they come in</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass overflow-hidden animate-fade-in-up" style={{ animationDelay: '250ms', opacity: 0 }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700/30">
            <h3 className="text-sm font-semibold text-dark-200">Activity Feed</h3>
            <Link to="/audit-logs" className="text-xs text-ice-300 hover:text-ice-200 transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-3 py-1">
            {auditLogs.length > 0 ? (
              auditLogs.slice(0, 6).map((log) => (
                <ActivityItem key={log._id} log={log} />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-dark-800/40 border border-dark-700/20 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-7 h-7 text-dark-600" />
                </div>
                <p className="text-dark-400 text-sm font-medium">No activity yet</p>
                <p className="text-dark-600 text-xs mt-1">Actions will show up here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
