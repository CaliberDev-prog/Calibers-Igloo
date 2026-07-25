import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import {
  Search, Filter, ChevronLeft, ChevronRight, Ticket,
  ArrowUpDown, ExternalLink, RefreshCw, X,
} from 'lucide-react';

const DEPTS = {
  general: { name: 'General Support', emoji: '🛟', color: 'text-ice-300' },
  reports: { name: 'Reports', emoji: '🚨', color: 'text-red-400' },
  hiring: { name: 'Hiring', emoji: '💼', color: 'text-purple-400' },
};

const STATUS_COLORS = {
  open: 'bg-green-400/10 text-green-400 border-green-400/20',
  closed: 'bg-red-400/10 text-red-400 border-red-400/20',
  deleted: 'bg-dark-500/10 text-dark-500 border-dark-500/20',
  creating: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('desc');

  const fetchTickets = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15, sort, order };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (deptFilter !== 'all') params.department = deptFilter;
      if (search) params.search = search;
      const data = await api.getTickets(params);
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    }
    setLoading(false);
  }, [statusFilter, deptFilter, sort, order, search]);

  useEffect(() => { fetchTickets(1); }, [fetchTickets]);

  const toggleSort = (field) => {
    if (sort === field) setOrder(o => o === 'desc' ? 'asc' : 'desc');
    else { setSort(field); setOrder('desc'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Tickets</h1>
          <p className="text-dark-400 text-sm mt-1">{pagination.total} total ticket(s)</p>
        </div>
        <button onClick={() => fetchTickets(pagination.page)} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="glass p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTickets(1)}
            placeholder="Search by ID, user, or tag..."
            className="input-dark pl-10 pr-8"
          />
          {search && (
            <button onClick={() => { setSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-dark w-auto min-w-[130px]"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="deleted">Deleted</option>
        </select>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="input-dark w-auto min-w-[150px]"
        >
          <option value="all">All Departments</option>
          {Object.entries(DEPTS).map(([id, d]) => (
            <option key={id} value={id}>{d.emoji} {d.name}</option>
          ))}
        </select>
      </div>

      <div className="glass overflow-hidden animate-fade-in">
        <div className="grid grid-cols-[80px_120px_1fr_140px_140px_100px] gap-4 px-4 py-3 border-b border-dark-700/50 text-xs font-medium text-dark-500 uppercase tracking-wider">
          <button onClick={() => toggleSort('ticketId')} className="flex items-center gap-1 hover:text-dark-300">
            ID <ArrowUpDown className="w-3 h-3" />
          </button>
          <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-dark-300">
            Status <ArrowUpDown className="w-3 h-3" />
          </button>
          <span>Department / Creator</span>
          <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 hover:text-dark-300">
            Created <ArrowUpDown className="w-3 h-3" />
          </button>
          <button onClick={() => toggleSort('closedAt')} className="flex items-center gap-1 hover:text-dark-300">
            Closed <ArrowUpDown className="w-3 h-3" />
          </button>
          <span></span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 text-dark-500">
            <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No tickets found</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-700/20">
            {tickets.map((t) => {
              const dept = DEPTS[t.departmentId];
              return (
                <Link
                  key={t.ticketId}
                  to={`/tickets/${t.ticketId}`}
                  className="grid grid-cols-[80px_120px_1fr_140px_140px_100px] gap-4 px-4 py-3 hover:bg-dark-700/20 transition-colors items-center group"
                >
                  <span className="text-sm font-mono font-medium text-dark-300">
                    #{String(t.ticketId).padStart(4, '0')}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full border inline-block w-fit ${STATUS_COLORS[t.status] || STATUS_COLORS.open}`}>
                    {t.status}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span>{dept?.emoji || '🎫'}</span>
                      <span className="text-sm text-dark-300 truncate">{dept?.name || t.departmentId}</span>
                    </div>
                    <p className="text-xs text-dark-500 truncate">{t.creatorTag || t.creatorId}</p>
                  </div>
                  <span className="text-xs text-dark-500">{new Date(t.createdAt).toLocaleDateString()}</span>
                  <span className="text-xs text-dark-500">{t.closedAt ? new Date(t.closedAt).toLocaleDateString() : '-'}</span>
                  <ExternalLink className="w-4 h-4 text-dark-600 opacity-0 group-hover:opacity-100 transition-opacity justify-self-end" />
                </Link>
              );
            })}
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700/50">
            <p className="text-xs text-dark-500">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTickets(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="btn-ghost p-2 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const p = Math.max(1, pagination.page - 2) + i;
                if (p > pagination.pages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => fetchTickets(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${p === pagination.page ? 'bg-ice-300/20 text-ice-300' : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => fetchTickets(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="btn-ghost p-2 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
