import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  Ticket, Users, MessageSquare, Shield, Server, Clock,
  Activity, TrendingUp, Database, Cpu, ChevronRight, RefreshCw,
  Send, ExternalLink, Hash, Zap, BarChart3, Eye, FileText,
  Snowflake, UserPlus, Terminal, Settings, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

function StatCard({ icon: Icon, label, value, color = 'ice', delay = 0 }) {
  return (
    <div className="glass p-5 hover:border-dark-600/50 transition-all duration-300 animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-dark-100 mt-3">{value}</p>
      <p className="text-sm text-dark-400">{label}</p>
    </div>
  );
}

function DeptBar({ name, emoji, open, total }) {
  const pct = total > 0 ? (open / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-lg">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-dark-300 truncate">{name}</span>
          <span className="text-dark-500">{open} open / {total} total</span>
        </div>
        <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-ice-300/50 to-ice-300/80 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ log }) {
  const categoryColors = {
    auth: 'text-blue-400', ticket: 'text-ice-300', message: 'text-green-400',
    config: 'text-yellow-400', blacklist: 'text-red-400', general: 'text-dark-400',
  };
  const categoryBg = {
    auth: 'bg-blue-400/10', ticket: 'bg-ice-300/10', message: 'bg-green-400/10',
    config: 'bg-yellow-400/10', blacklist: 'bg-red-400/10', general: 'bg-dark-400/10',
  };
  const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div className="flex items-center gap-3 py-2.5 group">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${categoryBg[log.category] || 'bg-dark-800/50'}`}>
        <FileText className={`w-4 h-4 ${categoryColors[log.category] || 'text-dark-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-dark-300 truncate">{log.description || log.action}</p>
        {log.username && <p className="text-[10px] text-dark-600">by {log.username}</p>}
      </div>
      <span className="text-[10px] text-dark-600 flex-shrink-0">{timeAgo(log.createdAt)}</span>
    </div>
  );
}

function RecentTicket({ ticket }) {
  const deptEmojis = { general: '🛟', reports: '🚨', hiring: '💼' };
  const statusColors = {
    open: 'text-green-400 bg-green-400/10',
    closed: 'text-red-400 bg-red-400/10',
    deleted: 'text-dark-500 bg-dark-500/10',
    creating: 'text-yellow-400 bg-yellow-400/10',
  };
  return (
    <Link
      to={`/tickets/${ticket.ticketId}`}
      className="flex items-center gap-4 px-4 py-3 hover:bg-dark-700/20 transition-colors group"
    >
      <span className="text-lg">{deptEmojis[ticket.departmentId] || '🎫'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-dark-200">#{String(ticket.ticketId).padStart(4, '0')}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[ticket.status] || statusColors.open}`}>
            {ticket.status}
          </span>
        </div>
        <p className="text-xs text-dark-500 truncate">{ticket.creatorTag || ticket.creatorId}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-dark-500">{new Date(ticket.createdAt).toLocaleDateString()}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-dark-600 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

const QUICK_ACTIONS = [
  { to: '/messages', icon: Send, label: 'Send Message', desc: 'Chat & embeds', color: 'text-ice-300' },
  { to: '/server', icon: Server, label: 'Server Explorer', desc: 'Channels & roles', color: 'text-purple-400' },
  { to: '/tickets', icon: Ticket, label: 'Manage Tickets', desc: 'View & close', color: 'text-green-400' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', desc: 'Stats & charts', color: 'text-blue-400' },
  { to: '/audit-logs', icon: FileText, label: 'Audit Logs', desc: 'Activity history', color: 'text-yellow-400' },
  { to: '/blacklists', icon: Shield, label: 'Blacklists', desc: 'Manage blocks', color: 'text-red-400' },
  { to: '/terminal', icon: Terminal, label: 'Terminal', desc: 'Run commands', color: 'text-orange-400', ownerOnly: true },
  { to: '/settings', icon: Settings, label: 'Settings', desc: 'Configuration', color: 'text-dark-400' },
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
    general: { name: 'General Support', emoji: '🛟' },
    reports: { name: 'Reports', emoji: '🚨' },
    hiring: { name: 'Hiring', emoji: '💼' },
  };

  const recentTickets = data?.recentTickets || [];
  const deptBreakdown = data?.tickets?.byDepartment || {};

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Command Center</h1>
          <p className="text-dark-400 text-sm mt-1">Welcome back, {user?.username}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-800/40 border border-dark-700/30">
            <div className={`w-2 h-2 rounded-full ${data?.database === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs text-dark-500">DB {data?.database || '...'}</span>
          </div>
          <button onClick={refresh} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {data?.guild && (
        <div className="glass p-6 flex items-center gap-4 animate-fade-in glow-border">
          {data.guild.icon ? (
            <img src={data.guild.icon} alt="" className="w-14 h-14 rounded-2xl" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ice-300/20 to-ice-500/20 flex items-center justify-center">
              <Snowflake className="w-7 h-7 text-ice-300" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-dark-100">{data.guild.name}</h2>
            <p className="text-sm text-dark-400">
              {data.guild.memberCount?.toLocaleString()} members · {data.guild.onlineCount?.toLocaleString()} online
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Ticket} label="Open Tickets" value={data?.tickets?.open ?? '...'} color="text-ice-300" delay={0} />
        <StatCard icon={MessageSquare} label="Total Tickets" value={data?.tickets?.total ?? '...'} color="text-blue-400" delay={50} />
        <StatCard icon={CheckCircle2} label="Closed" value={data?.tickets?.closed ?? '...'} color="text-green-400" delay={100} />
        <StatCard icon={Shield} label="Blacklisted" value={data?.blacklists ?? '...'} color="text-red-400" delay={150} />
        <StatCard icon={Clock} label="Uptime" value={data?.bot ? formatUptime(data.bot.uptime) : '...'} color="text-green-400" delay={200} />
        <StatCard icon={Cpu} label="Memory" value={data?.bot ? formatBytes(data.bot.memory?.heapUsed || 0) : '...'} color="text-purple-400" delay={250} />
      </div>

      <div>
        <h3 className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.filter((a) => !a.ownerOnly || user?.role === 'owner').map((action, i) => (
            <Link
              key={action.to}
              to={action.to}
              className="glass p-4 flex items-center gap-3 hover:border-dark-600/50 transition-all duration-200 animate-fade-in group"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className={`w-9 h-9 rounded-xl bg-dark-800/40 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <action.icon className={`w-4.5 h-4.5 ${action.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-dark-200 truncate">{action.label}</p>
                <p className="text-[10px] text-dark-600 truncate">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-dark-200">Department Breakdown</h3>
            <Link to="/analytics" className="text-xs text-ice-300 hover:text-ice-200 transition-colors">Analytics</Link>
          </div>
          <div className="space-y-1">
            {Object.entries(deptConfigs).map(([id, dept]) => (
              <DeptBar
                key={id}
                name={dept.name}
                emoji={dept.emoji}
                open={deptBreakdown[id] || 0}
                total={data?.tickets?.open || 0}
              />
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-dark-700/30 grid grid-cols-3 gap-4 text-center">
            {Object.entries(deptConfigs).map(([id, dept]) => (
              <div key={id}>
                <p className="text-lg font-bold text-dark-100">{deptBreakdown[id] || 0}</p>
                <p className="text-xs text-dark-500">{dept.emoji} {dept.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-dark-200">System</h3>
            <Link to="/health" className="text-xs text-ice-300 hover:text-ice-200 transition-colors">Details</Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-dark-500" />
                <span className="text-sm text-dark-400">Database</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${data?.database === 'connected' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                {data?.database || 'unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-dark-500" />
                <span className="text-sm text-dark-400">Memory</span>
              </div>
              <span className="text-xs text-dark-300">{data?.bot ? formatBytes(data.bot.memory?.heapUsed || 0) : '...'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-dark-500" />
                <span className="text-sm text-dark-400">Node.js</span>
              </div>
              <span className="text-xs text-dark-300">{data?.bot?.nodeVersion || '...'}</span>
            </div>
            {data?.bot?.uptime != null && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-dark-500" />
                  <span className="text-sm text-dark-400">Uptime</span>
                </div>
                <span className="text-xs text-dark-300">{formatUptime(data.bot.uptime)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass overflow-hidden animate-fade-in" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700/50">
            <h3 className="text-sm font-semibold text-dark-200">Recent Tickets</h3>
            <Link to="/tickets" className="text-xs text-ice-300 hover:text-ice-200 transition-colors">View all</Link>
          </div>
          <div className="divide-y divide-dark-700/30">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
              </div>
            ) : recentTickets.length > 0 ? (
              recentTickets.slice(0, 5).map((t) => (
                <RecentTicket key={t.ticketId} ticket={t} />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-dark-800/40 border border-dark-700/30 flex items-center justify-center mx-auto mb-4">
                  <Ticket className="w-8 h-8 text-dark-600" />
                </div>
                <p className="text-dark-400 text-sm font-medium">No tickets yet</p>
                <p className="text-dark-600 text-xs mt-1">They'll appear here as they come in</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass overflow-hidden animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700/50">
            <h3 className="text-sm font-semibold text-dark-200">Activity Feed</h3>
            <Link to="/audit-logs" className="text-xs text-ice-300 hover:text-ice-200 transition-colors">View all</Link>
          </div>
          <div className="px-4 divide-y divide-dark-700/20">
            {auditLogs.length > 0 ? (
              auditLogs.slice(0, 6).map((log) => (
                <ActivityItem key={log._id} log={log} />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-dark-800/40 border border-dark-700/30 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-dark-600" />
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
