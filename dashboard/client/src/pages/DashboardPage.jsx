import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  Ticket, Users, MessageSquare, Shield, Server, Clock,
  Activity, TrendingUp, Database, Cpu, ChevronRight, RefreshCw,
  Send, ExternalLink, Hash, Zap, BarChart3, Eye,
} from 'lucide-react';
import { Link } from 'react-router-dom';

function StatCard({ icon: Icon, label, value, sub, color = 'ice', delay = 0 }) {
  return (
    <div className="stat-card animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}-300/10`}>
          <Icon className={`w-5 h-5 text-${color}-300`} />
        </div>
        {sub && <span className="text-xs text-dark-500">{sub}</span>}
      </div>
      <p className="text-2xl font-bold text-dark-100 mt-2">{value}</p>
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
      className="table-row flex items-center gap-4 px-4 py-3 hover:bg-dark-700/20 transition-colors group"
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

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quickMsg, setQuickMsg] = useState('');
  const [quickChannel, setQuickChannel] = useState('');
  const [quickSending, setQuickSending] = useState(false);
  const [channels, setChannels] = useState([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const overview = await api.getOverview();
      setData(overview);
    } catch (err) {
      console.error('Failed to load overview:', err);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    api.getChannels().then((d) => {
      setChannels((d.channels || []).filter((ch) => ch.type === 0));
    }).catch(() => {});
  }, []);

  const formatUptime = (s) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    return `${h}h ${m}m`;
  };

  const formatBytes = (b) => {
    const mb = (b / 1024 / 1024).toFixed(1);
    return `${mb} MB`;
  };

  const handleQuickSend = async () => {
    if (!quickMsg.trim() || !quickChannel) return;
    setQuickSending(true);
    try {
      await api.sendMessage(quickChannel, quickMsg);
      toast('Message sent!', 'success');
      setQuickMsg('');
      setQuickChannel('');
    } catch {
      toast('Failed to send message', 'error');
    }
    setQuickSending(false);
  };

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
        <button onClick={refresh} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {data?.guild && (
        <div className="glass p-6 flex items-center gap-4 animate-fade-in glow-border">
          {data.guild.icon ? (
            <img src={data.guild.icon} alt="" className="w-14 h-14 rounded-2xl" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-ice-300/10 flex items-center justify-center">
              <Server className="w-7 h-7 text-ice-300" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-dark-100">{data.guild.name}</h2>
            <p className="text-sm text-dark-400">
              {data.guild.memberCount?.toLocaleString()} members · {data.guild.onlineCount?.toLocaleString()} online
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${data.database === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-xs text-dark-500">DB {data.database}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Ticket} label="Open Tickets" value={data?.tickets?.open ?? '...'} color="ice" delay={0} />
        <StatCard icon={MessageSquare} label="Total Tickets" value={data?.tickets?.total ?? '...'} color="blue" delay={75} />
        <StatCard icon={Shield} label="Blacklisted" value={data?.blacklists ?? '...'} color="red" delay={150} />
        <StatCard icon={Clock} label="Uptime" value={data?.bot ? formatUptime(data.bot.uptime) : '...'} color="green" delay={225} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/messages" className="glass-hover p-4 flex items-center gap-3 animate-fade-in" style={{ animationDelay: '50ms' }}>
          <div className="w-10 h-10 rounded-xl bg-ice-300/10 flex items-center justify-center">
            <Send className="w-5 h-5 text-ice-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-dark-200">Send Embed</p>
            <p className="text-xs text-dark-500">Create & send messages</p>
          </div>
          <ExternalLink className="w-4 h-4 text-dark-600 ml-auto" />
        </Link>
        <Link to="/server" className="glass-hover p-4 flex items-center gap-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="w-10 h-10 rounded-xl bg-ice-300/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-ice-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-dark-200">View Server</p>
            <p className="text-xs text-dark-500">Server info & members</p>
          </div>
          <ExternalLink className="w-4 h-4 text-dark-600 ml-auto" />
        </Link>
        <Link to="/tickets" className="glass-hover p-4 flex items-center gap-3 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <div className="w-10 h-10 rounded-xl bg-ice-300/10 flex items-center justify-center">
            <Ticket className="w-5 h-5 text-ice-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-dark-200">Manage Tickets</p>
            <p className="text-xs text-dark-500">View & manage all tickets</p>
          </div>
          <ExternalLink className="w-4 h-4 text-dark-600 ml-auto" />
        </Link>
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
        <div className="glass p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
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
              <div className="text-center py-8 text-dark-500 text-sm">
                <Ticket className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No tickets yet
              </div>
            )}
          </div>
        </div>

        <div className="glass p-6 animate-fade-in" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-ice-300" />
            <h3 className="text-sm font-semibold text-dark-200">Quick Send</h3>
          </div>
          <p className="text-xs text-dark-500 mb-3">Send a message to any text channel instantly</p>
          <div className="space-y-3">
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <select
                value={quickChannel}
                onChange={(e) => setQuickChannel(e.target.value)}
                className="input-dark pl-10 appearance-none pr-10 cursor-pointer"
              >
                <option value="">Select a channel...</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}># {ch.name}</option>
                ))}
              </select>
            </div>
            <textarea
              value={quickMsg}
              onChange={(e) => setQuickMsg(e.target.value)}
              placeholder="Type a message..."
              rows={3}
              className="input-dark resize-none"
            />
            <button
              onClick={handleQuickSend}
              disabled={!quickMsg.trim() || !quickChannel || quickSending}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {quickSending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
