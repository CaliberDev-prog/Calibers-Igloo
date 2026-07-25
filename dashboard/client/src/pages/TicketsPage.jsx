import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import {
  Search, ChevronLeft, ChevronRight, Ticket,
  ArrowUpDown, X, Eye, XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DEPTS = {
  general: { name: 'General Support', emoji: '🛟', color: 'text-ice-300' },
  reports: { name: 'Reports', emoji: '🚨', color: 'text-red-400' },
  hiring: { name: 'Hiring', emoji: '💼', color: 'text-purple-400' },
};

const STATUS_STYLES = {
  open: 'badge bg-green-400/10 text-green-400 border-green-400/20',
  closed: 'badge bg-red-400/10 text-red-400 border-red-400/20',
  deleted: 'badge bg-dark-500/10 text-dark-500 border-dark-500/20',
  creating: 'badge bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
};

const COLUMNS = [
  { key: 'ticketId', label: 'ID', width: 'w-[80px]' },
  { key: 'status', label: 'Status', width: 'w-[110px]' },
  { key: 'department', label: 'Department / Creator' },
  { key: 'createdAt', label: 'Created', width: 'w-[120px]' },
  { key: 'closedAt', label: 'Closed', width: 'w-[120px]' },
  { key: 'actions', label: 'Actions', width: 'w-[100px]', align: 'right' },
];

export default function TicketsPage() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [closingId, setClosingId] = useState(null);

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

  const closeTicket = async (id) => {
    setClosingId(id);
    try {
      await api.closeTicket(id);
      toast('Ticket closed', 'success');
      fetchTickets(pagination.page);
    } catch {
      toast('Failed to close ticket', 'error');
    }
    setClosingId(null);
  };

  const SortButton = ({ field, children }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1.5 hover:text-dark-200 transition-colors group">
      {children}
      <ArrowUpDown className={`w-3 h-3 transition-colors ${sort === field ? 'text-ice-300' : 'text-dark-700 group-hover:text-dark-500'}`} />
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Tickets"
        subtitle={`${pagination.total} total ticket(s)`}
        onRefresh={() => fetchTickets(pagination.page)}
        refreshing={loading}
      />

      <div className="glass p-3.5 flex flex-wrap items-center gap-3">
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
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-dark w-auto min-w-[130px] text-sm">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="deleted">Deleted</option>
        </select>

        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="input-dark w-auto min-w-[150px] text-sm">
          <option value="all">All Departments</option>
          {Object.entries(DEPTS).map(([id, d]) => (
            <option key={id} value={id}>{d.emoji} {d.name}</option>
          ))}
        </select>
      </div>

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                {COLUMNS.map((col) => (
                  <th key={col.key} className={`${col.width || ''} px-4 py-3 text-left`}>
                    {col.key === 'actions' ? (
                      <span className={`text-xs font-medium text-dark-500 uppercase tracking-wider ${col.align === 'right' ? 'block text-right' : ''}`}>{col.label}</span>
                    ) : col.key === 'ticketId' || col.key === 'status' || col.key === 'createdAt' || col.key === 'closedAt' ? (
                      <SortButton field={col.key}>
                        <span className="text-xs font-medium text-dark-500 uppercase tracking-wider">{col.label}</span>
                      </SortButton>
                    ) : (
                      <span className="text-xs font-medium text-dark-500 uppercase tracking-wider">{col.label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex justify-center py-16">
                      <div className="w-7 h-7 border-2 border-ice-300/20 border-t-ice-300 rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Ticket}
                      title="No Tickets Found"
                      description={search || statusFilter !== 'all' || deptFilter !== 'all'
                        ? 'Try adjusting your filters or search query'
                        : 'Tickets will appear here when users create them'}
                    />
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const dept = DEPTS[t.departmentId];
                  return (
                    <tr key={t.ticketId} className="table-row group">
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-mono font-semibold text-dark-300">
                          #{String(t.ticketId).padStart(4, '0')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={STATUS_STYLES[t.status] || STATUS_STYLES.open}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{dept?.emoji || '🎫'}</span>
                            <span className="text-sm text-dark-300 font-medium truncate">{dept?.name || t.departmentId}</span>
                          </div>
                          <p className="text-xs text-dark-500 truncate mt-0.5">{t.creatorTag || t.creatorId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-dark-400 tabular-nums">{new Date(t.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-dark-400 tabular-nums">{t.closedAt ? new Date(t.closedAt).toLocaleDateString() : '-'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <Link to={`/tickets/${t.ticketId}`} className="btn-ghost btn-sm p-1.5" title="View ticket">
                            <Eye className="w-4 h-4" />
                          </Link>
                          {t.status === 'open' && (
                            <button
                              onClick={() => closeTicket(t.ticketId)}
                              disabled={closingId === t.ticketId}
                              className="btn-ghost btn-sm p-1.5 text-dark-400 hover:text-red-400 disabled:opacity-30"
                              title="Close ticket"
                            >
                              {closingId === t.ticketId ? (
                                <div className="w-4 h-4 border-2 border-red-400/20 border-t-red-400 rounded-full animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700/30">
            <p className="text-xs text-dark-500 tabular-nums">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => fetchTickets(pagination.page - 1)} disabled={pagination.page <= 1} className="btn-ghost btn-sm p-1.5 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const p = Math.max(1, pagination.page - 2) + i;
                if (p > pagination.pages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => fetchTickets(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200 ${p === pagination.page ? 'bg-ice-300/15 text-ice-300 ring-1 ring-ice-300/20' : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/30'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button onClick={() => fetchTickets(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="btn-ghost btn-sm p-1.5 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
