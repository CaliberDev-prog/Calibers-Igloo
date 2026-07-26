import { useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import { Search, X, ChevronDown, Bot, Calendar } from 'lucide-react';
import { CopyId, roleColorHex } from '../components/shared.jsx';

const STATUS_COLORS = {
  online: 'bg-green-400',
  idle: 'bg-yellow-400',
  dnd: 'bg-red-400',
  offline: 'bg-dark-600',
};

export default function MembersTab({ roles }) {
  const { toast } = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [nextAfter, setNextAfter] = useState('0');
  const [loaded, setLoaded] = useState(false);

  const roleMap = {};
  roles.forEach((r) => { roleMap[r.id] = r; });

  const fetchMembers = useCallback(async (after = '0', append = false) => {
    setLoading(true);
    try {
      const params = { limit: 100, after };
      if (search) params.search = search;
      const data = await api.getMembers(params);
      setMembers((prev) => append ? [...prev, ...(data.members || [])] : (data.members || []));
      setHasMore(data.hasMore);
      setNextAfter(data.nextAfter || null);
      setLoaded(true);
    } catch (err) {
      toast(err.message || 'Failed to load members', 'error');
    }
    setLoading(false);
  }, [search, toast]);

  const handleSearch = () => {
    setNextAfter('0');
    fetchMembers('0', false);
  };

  const handleLoadMore = () => {
    if (nextAfter) fetchMembers(nextAfter, true);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="glass p-4 flex items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by username, display name, or ID..."
            className="input-dark pl-10 pr-8"
          />
          {search && (
            <button onClick={() => { setSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button onClick={handleSearch} disabled={loading} className="btn-primary text-sm">
          Search
        </button>
        {!loaded && (
          <button onClick={() => fetchMembers('0', false)} disabled={loading} className="btn-ghost text-sm">
            {loading ? 'Loading...' : 'Load Members'}
          </button>
        )}
      </div>

      {!loaded ? (
        <div className="glass p-16 text-center">
          <p className="text-dark-500 text-sm">Click "Load Members" to view the server member list.</p>
          <p className="text-dark-600 text-xs mt-2">Members are fetched from Discord in batches of 100.</p>
        </div>
      ) : members.length === 0 ? (
        <div className="glass p-12 text-center text-dark-500">
          <p>No members found{search ? ` matching "${search}"` : ''}.</p>
        </div>
      ) : (
        <>
          <div className="glass overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700/50 text-xs font-medium text-dark-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-10"></th>
                  <th className="px-4 py-3 text-left">Username</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Display Name</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Roles</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Joined</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/20">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-dark-700/15 transition-colors group">
                    <td className="px-4 py-2.5">
                      <div className="relative flex-shrink-0">
                        {m.avatar ? (
                          <img src={m.avatar} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-ice-300/10 flex items-center justify-center text-sm font-semibold text-ice-300">
                            {(m.displayName || m.username || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-900 ${STATUS_COLORS[m.status] || STATUS_COLORS.offline}`} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-dark-200 truncate max-w-[150px]">{m.username}</span>
                        {m.isBot && <Bot className="w-3 h-3 text-ice-300 flex-shrink-0" />}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-dark-400 truncate hidden sm:table-cell max-w-[150px]">{m.displayName}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <div className="flex items-center gap-1 flex-wrap min-w-0">
                        {m.roles.slice(0, 3).map((rId) => {
                          const r = roleMap[rId];
                          if (!r) return null;
                          const hex = roleColorHex(r.color);
                          return (
                            <span
                              key={rId}
                              className="text-[10px] px-1.5 py-0.5 rounded-full border max-w-[100px] truncate inline-block"
                              style={hex ? { backgroundColor: `${hex}15`, color: hex, borderColor: `${hex}30` } : { backgroundColor: 'rgba(75,85,99,0.15)', color: '#9ca3af', borderColor: 'rgba(75,85,99,0.3)' }}
                            >
                              {r.name}
                            </span>
                          );
                        })}
                        {m.roles.length > 3 && (
                          <span className="text-[10px] text-dark-600">+{m.roles.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-dark-500 hidden lg:table-cell whitespace-nowrap">
                      <span className="flex items-center gap-1 text-xs">
                        <Calendar className="w-3 h-3" />
                        {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block ${
                        m.status === 'online' ? 'bg-green-400/10 text-green-400' :
                        m.status === 'idle' ? 'bg-yellow-400/10 text-yellow-400' :
                        m.status === 'dnd' ? 'bg-red-400/10 text-red-400' :
                        'bg-dark-700/50 text-dark-500'
                      }`}>
                        {m.status || 'offline'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <CopyId id={m.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <button onClick={handleLoadMore} disabled={loading} className="btn-ghost text-sm flex items-center gap-2">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Load More ({members.length} loaded)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
