import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import {
  FileText, Search, RefreshCw, X, ChevronLeft, ChevronRight,
  Download, Eye, CheckCircle2, XCircle, Clock, User,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DEPTS = {
  general: { name: 'General Support', emoji: '🛟' },
  reports: { name: 'Reports', emoji: '🚨' },
  hiring: { name: 'Hiring', emoji: '💼' },
};

export default function TranscriptsPage() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchTickets = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20, status: 'closed', sort: 'closedAt', order: 'desc' };
      if (search) params.search = search;
      const data = await api.getTickets(params);
      setTickets(data.tickets || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch {
      toast('Failed to load transcripts', 'error');
    }
    setLoading(false);
  }, [search, toast]);

  useEffect(() => { fetchTickets(page); }, [page, fetchTickets]);

  const formatDuration = (created, closed) => {
    if (!created || !closed) return '-';
    const ms = new Date(closed) - new Date(created);
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Transcripts</h1>
          <p className="text-dark-400 text-sm mt-1">{pagination.total} closed ticket(s) with transcripts</p>
        </div>
        <button onClick={() => fetchTickets(page)} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="glass p-4 flex items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            placeholder="Search by ticket ID, user, or tag..."
            className="input-dark pl-10 pr-8"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="glass overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-dark-800/40 border border-dark-700/30 flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-dark-600" />
            </div>
            <h3 className="text-lg font-semibold text-dark-300 mb-2">No Transcripts Yet</h3>
            <p className="text-sm text-dark-500">Transcripts appear here when tickets are closed</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-700/20">
            {tickets.map((t) => {
              const dept = DEPTS[t.departmentId];
              const hasTranscript = t.transcript?.generated;
              return (
                <div key={t.ticketId} className="px-4 py-3 flex items-center gap-4 hover:bg-dark-700/10 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-dark-800/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">{dept?.emoji || '🎫'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/tickets/${t.ticketId}`} className="text-sm font-medium text-dark-200 hover:text-ice-300 transition-colors">
                        #{String(t.ticketId).padStart(4, '0')}
                      </Link>
                      <span className="text-xs text-dark-500">{dept?.name || t.departmentId}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-dark-500 flex items-center gap-1">
                        <User className="w-3 h-3" /> {t.creatorTag || t.creatorId}
                      </span>
                      <span className="text-xs text-dark-600">•</span>
                      <span className="text-xs text-dark-500">
                        Closed {t.closedAt ? new Date(t.closedAt).toLocaleDateString() : '-'}
                      </span>
                      <span className="text-xs text-dark-600">•</span>
                      <span className="text-xs text-dark-500">
                        Duration: {formatDuration(t.createdAt, t.closedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {hasTranscript ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Transcript
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-700/50 text-dark-500 border border-dark-700/30">
                        No transcript
                      </span>
                    )}
                    {t.transcript?.filename && (
                      <span className="text-[10px] text-dark-600 font-mono max-w-[120px] truncate" title={t.transcript.filename}>
                        {t.transcript.filename}
                      </span>
                    )}
                  </div>
                  <Link to={`/tickets/${t.ticketId}`} className="btn-ghost p-1.5 text-dark-500 hover:text-ice-300 opacity-0 group-hover:opacity-100 transition-all" title="View ticket">
                    <Eye className="w-4 h-4" />
                  </Link>
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
