import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../components/Toast.jsx';
import { Shield, Search, Trash2, ChevronLeft, ChevronRight, Pencil, UserPlus, X } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';

function CreateBlacklistModal({ onSave, onClose }) {
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [departmentId, setDepartmentId] = useState('global');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!userId.trim()) return toast('User ID is required', 'error');
    if (!/^\d{17,20}$/.test(userId.trim())) return toast('Invalid user ID format', 'error');
    setSaving(true);
    try {
      await api.createBlacklist({ userId: userId.trim(), reason: reason.trim() || 'No reason provided', departmentId });
      toast('User blacklisted successfully', 'success');
      onSave();
    } catch (err) {
      toast(err.message || 'Failed to create blacklist entry', 'error');
    }
    setSaving(false);
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-dark-100">Blacklist User</p>
          <p className="text-xs text-dark-400">Prevent a user from creating tickets</p>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">User ID *</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="1293164546005012512"
            className="input-dark text-sm font-mono"
            pattern="\d{17,20}"
            maxLength={20}
            autoFocus
          />
          <p className="text-xs text-dark-600 mt-1">Discord user ID (17-20 digits)</p>
        </div>
        <div>
          <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for blacklisting..."
            className="input-dark text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Scope</label>
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="input-dark text-sm" aria-label="Blacklist scope">
            <option value="global">Global (all departments)</option>
            <option value="general">General Support only</option>
            <option value="reports">Reports only</option>
            <option value="hiring">Hiring only</option>
          </select>
        </div>
      </div>
      <div className="bg-dark-900/50 rounded-xl p-3 border border-dark-700/30">
        <p className="text-xs text-dark-400">
          This user will be blocked from creating tickets{departmentId !== 'global' ? ` in the ${departmentId} department` : ''}. They will see an error message if they attempt to open a ticket.
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-dark-700/30">
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
        <button onClick={handleSave} disabled={saving || !userId.trim()} className="btn-danger text-sm disabled:opacity-50">
          {saving ? 'Blacklisting...' : 'Blacklist User'}
        </button>
      </div>
    </Modal>
  );
}

function EditBlacklistModal({ entry, onSave, onClose }) {
  const [reason, setReason] = useState(entry.reason || '');
  const [departmentId, setDepartmentId] = useState(entry.departmentId || entry.scope || 'global');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.editBlacklist(entry._id, { reason, departmentId });
      toast('Blacklist entry updated', 'success');
      onSave();
    } catch (err) {
      toast(err.message || 'Failed to update', 'error');
    }
    setSaving(false);
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ice-300/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-ice-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-dark-100">Edit Blacklist</p>
          <p className="text-xs text-dark-400">User: {entry.userId}</p>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Reason</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="input-dark text-sm" autoFocus />
        </div>
        <div>
          <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Scope</label>
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="input-dark text-sm" aria-label="Blacklist scope">
            <option value="global">Global</option>
            <option value="general">General Support</option>
            <option value="reports">Reports</option>
            <option value="hiring">Hiring</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-dark-700/30">
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </Modal>
  );
}

function DeleteBlacklistModal({ entry, onSave, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteBlacklist(entry._id);
      toast('Blacklist entry removed', 'success');
      onSave();
    } catch (err) {
      toast(err.message || 'Failed to remove', 'error');
    }
    setDeleting(false);
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-dark-100">Remove Blacklist</p>
          <p className="text-xs text-dark-400">This will unblock the user</p>
        </div>
      </div>
      <p className="text-xs text-dark-400 bg-dark-900/50 rounded-xl p-3 border border-dark-700/30">
        Remove blacklist for user <strong className="text-dark-200">{entry.userId}</strong>?
      </p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
        <button onClick={handleDelete} disabled={deleting} className="btn-danger text-sm disabled:opacity-50">
          {deleting ? 'Removing...' : 'Remove'}
        </button>
      </div>
    </Modal>
  );
}

export default function BlacklistsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = user?.role === 'owner';
  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingEntry, setDeletingEntry] = useState(null);
  const [creating, setCreating] = useState(false);

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
      toast('Failed to load blacklists', 'error');
    }
    setLoading(false);
  }, [search, deptFilter]);

  useEffect(() => { fetchEntries(1); }, [fetchEntries]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Blacklists"
        subtitle={`${pagination.total} blacklisted user(s)`}
        onRefresh={() => fetchEntries(pagination.page)}
        refreshing={loading}
      >
        {isOwner && (
          <button onClick={() => setCreating(true)} className="btn-primary text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Blacklist User
          </button>
        )}
      </PageHeader>

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
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="input-dark w-auto min-w-[150px]" aria-label="Scope filter">
          <option value="all">All Scopes</option>
          <option value="global">Global</option>
          <option value="general">General Support</option>
          <option value="reports">Reports</option>
          <option value="hiring">Hiring</option>
        </select>
      </div>

      <div className="glass overflow-hidden overflow-x-auto">
        <div className="min-w-[600px]">
        <div className="grid grid-cols-[minmax(150px,180px)_1fr_1fr_minmax(100px,120px)_80px] gap-4 px-4 py-3 border-b border-dark-700/50 text-xs font-medium text-dark-500 uppercase tracking-wider">
          <span>User ID</span>
          <span>Reason</span>
          <span className="hidden sm:block">Blacklisted By</span>
          <span>Scope</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No Blacklisted Users"
            description={isOwner ? 'No blacklisted users. Click "Blacklist User" to add one.' : 'No blacklisted users.'}
          />
        ) : (
          <div className="divide-y divide-dark-700/20">
            {entries.map((e) => (
              <div key={e._id} className="grid grid-cols-[minmax(150px,180px)_1fr_1fr_minmax(100px,120px)_80px] gap-4 px-4 py-3 items-center hover:bg-dark-700/20 transition-colors group">
                <span className="text-sm font-mono text-dark-300 truncate">{e.userId}</span>
                <span className="text-sm text-dark-400 truncate">{e.reason || 'No reason'}</span>
                <span className="text-sm text-dark-400 truncate hidden sm:block">{e.addedBy || e.performedBy || 'Unknown'}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-dark-800/50 border border-dark-700/30 text-dark-400 w-fit">
                  {e.departmentId || e.scope || 'global'}
                </span>
                <div className="flex items-center gap-1 justify-end">
                  {isOwner && (
                    <button
                      onClick={() => setEditingEntry(e)}
                      className="p-1.5 rounded-lg text-dark-600 hover:text-ice-300 hover:bg-dark-700/50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => setDeletingEntry(e)}
                      className="p-1.5 rounded-lg text-dark-600 hover:text-red-400 hover:bg-dark-700/50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700/50">
            <p className="text-xs text-dark-500">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchEntries(pagination.page - 1)} disabled={pagination.page <= 1} className="btn-ghost p-2 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const p = Math.max(1, pagination.page - 2) + i;
                if (p > pagination.pages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => fetchEntries(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${p === pagination.page ? 'bg-ice-300/20 text-ice-300' : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button onClick={() => fetchEntries(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="btn-ghost p-2 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      {creating && (
        <CreateBlacklistModal onSave={() => { setCreating(false); fetchEntries(1); }} onClose={() => setCreating(false)} />
      )}
      {editingEntry && (
        <EditBlacklistModal entry={editingEntry} onSave={() => { setEditingEntry(null); fetchEntries(pagination.page); }} onClose={() => setEditingEntry(null)} />
      )}
      {deletingEntry && (
        <DeleteBlacklistModal entry={deletingEntry} onSave={() => { setDeletingEntry(null); fetchEntries(pagination.page); }} onClose={() => setDeletingEntry(null)} />
      )}
    </div>
  );
}
