import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import {
  Search, User, Hash, Shield, MessageSquare,
  ChevronLeft, ChevronRight, X, FileText,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';

const CATEGORIES = {
  auth: { label: 'Auth', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  ticket: { label: 'Tickets', color: 'text-ice-300 bg-ice-300/10 border-ice-300/20' },
  message: { label: 'Messages', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  config: { label: 'Config', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  blacklist: { label: 'Blacklists', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  channel: { label: 'Channels', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  role: { label: 'Roles', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
  general: { label: 'General', color: 'text-dark-400 bg-dark-400/10 border-dark-400/20' },
};

const ACTION_ICONS = {
  login: User, logout: User, 'ticket.create': FileText, 'ticket.close': FileText,
  'ticket.delete': FileText, 'message.send': MessageSquare, 'message.edit': MessageSquare,
  'message.delete': MessageSquare, 'config.update': Hash, 'blacklist.add': Shield,
  'blacklist.remove': Shield, 'role.edit': Hash, 'role.delete': Hash,
  'channel.rename': Hash, 'dashboard.user.create': User, 'dashboard.user.delete': User,
};

export default function AuditLogsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 25 };
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (search) params.search = search;
      const data = await api.getAuditLogs(params);
      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch {
      toast('Failed to load audit logs', 'error');
    }
    setLoading(false);
  }, [categoryFilter, search, toast]);

  useEffect(() => { fetchLogs(page); }, [page, fetchLogs]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Audit Logs"
        subtitle={`${pagination.total} total entries`}
        onRefresh={() => fetchLogs(page)}
        refreshing={loading}
      />

      <div className="glass p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            placeholder="Search actions, users..."
            className="input-dark pl-10 pr-8"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="input-dark w-auto min-w-[140px]" aria-label="Category filter">
          <option value="all">All Categories</option>
          {Object.entries(CATEGORIES).map(([id, cat]) => (
            <option key={id} value={id}>{cat.label}</option>
          ))}
        </select>
      </div>

      <div className="glass overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Audit Logs"
            description="Actions will appear here as they happen"
          />
        ) : (
          <div className="divide-y divide-dark-700/20">
            {logs.map((log) => {
              const cat = CATEGORIES[log.category] || CATEGORIES.general;
              return (
                <div key={log._id} className="px-4 py-3 flex items-center gap-4 hover:bg-dark-700/10 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-dark-800/50 flex items-center justify-center flex-shrink-0">
                    {(() => { const Icon = ACTION_ICONS[log.action] || Hash; return <Icon className="w-4 h-4 text-dark-500" />; })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-dark-200">{log.action}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cat.color}`}>
                        {cat.label}
                      </span>
                    </div>
                    {log.description && (
                      <p className="text-xs text-dark-500 mt-0.5 truncate">{log.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {log.username && (
                      <span className="text-xs text-dark-500 flex items-center gap-1">
                        <User className="w-3 h-3" /> {log.username}
                      </span>
                    )}
                    {log.target && (
                      <span className="text-xs text-dark-600 font-mono">{log.target}</span>
                    )}
                    <span className="text-xs text-dark-600" title={new Date(log.createdAt).toLocaleString()}>
                      {formatTime(log.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700/50">
            <p className="text-xs text-dark-500">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost p-2 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages} className="btn-ghost p-2 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
