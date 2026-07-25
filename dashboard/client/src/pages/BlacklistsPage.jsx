import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { Shield, Search, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';

export default function BlacklistsPage() {
  const { user } = useAuth();
  const isOwner = user?.id === '1293164546005012512';
  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const fetchEntries = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.userId = search;
      if (deptFilter !== 'all') params.department = deptFilter;
      const data = await api.getBlacklists(params);
      setEntries(data.entries);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [search, deptFilter]);

  useEffect(() => { fetchEntries(1); }, [fetchEntries]);

  const removeEntry = async (id) => {
    if (!confirm('Remove this blacklist entry?')) return;
    try {
      await api.deleteBlacklist(id);
      fetchEntries(pagination.page);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-100">Blacklists</h1>
        <p className="text-dark-400 text-sm mt-1">{pagination.total} blacklisted user(s)</p>
      </div>

      <div className="glass p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchEntries(1)}
            placeholder="Search by user ID..."
            className="input-dark pl-10 pr-8"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="input-dark w-auto min-w-[150px]">
          <option value="all">All Scopes</option>
          <option value="global">Global</option>
          <option value="general">General Support</option>
          <option value="reports">Reports</option>
          <option value="hiring">Hiring</option>
        </select>
      </div>

      <div className="glass overflow-hidden">
        <div className="grid grid-cols-[180px_1fr_1fr_120px_60px] gap-4 px-4 py-3 border-b border-dark-700/50 text-xs font-medium text-dark-500 uppercase tracking-wider">
          <span>User ID</span>
          <span>Reason</span>
          <span>Blacklisted By</span>
          <span>Scope</span>
          <span></span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-dark-500">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No blacklisted users</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-700/20">
            {entries.map((e) => (
              <div key={e._id} className="grid grid-cols-[180px_1fr_1fr_120px_60px] gap-4 px-4 py-3 items-center hover:bg-dark-700/20 transition-colors">
                <span className="text-sm font-mono text-dark-300 truncate">{e.userId}</span>
                <span className="text-sm text-dark-400 truncate">{e.reason || 'No reason'}</span>
                <span className="text-sm text-dark-400 truncate">{e.performedBy || 'Unknown'}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-dark-800/50 border border-dark-700/30 text-dark-400 w-fit">
                  {e.departmentId || e.scope || 'global'}
                </span>
                {isOwner && (
                  <button onClick={() => removeEntry(e._id)} className="text-dark-500 hover:text-red-400 transition-colors justify-self-end">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700/50">
            <p className="text-xs text-dark-500">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchEntries(pagination.page - 1)} disabled={pagination.page <= 1} className="btn-ghost p-2 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => fetchEntries(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="btn-ghost p-2 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
