import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  Gift, Trophy, Users, Plus, Trash2, RotateCcw, StopCircle,
  Clock, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';

function CreateGiveawayModal({ channels, onSave, onClose }) {
  const [prize, setPrize] = useState('');
  const [description, setDescription] = useState('');
  const [winners, setWinners] = useState(1);
  const [durationMin, setDurationMin] = useState(60);
  const [channelId, setChannelId] = useState('');
  const [requirementRoleId, setRequirementRoleId] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!prize.trim()) return toast('Prize is required', 'error');
    if (!channelId) return toast('Channel is required', 'error');
    if (durationMin < 1) return toast('Duration must be at least 1 minute', 'error');
    setSaving(true);
    try {
      await api.createGiveaway({ prize: prize.trim(), description: description.trim(), winners, duration: durationMin, channelId, requirementRoleId });
      toast('Giveaway created', 'success');
      onSave();
    } catch (err) {
      toast(err.message || 'Failed to create giveaway', 'error');
    }
    setSaving(false);
  };

  const textChannels = (channels || []).filter((c) => c.type === 0);

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-400/10 flex items-center justify-center">
          <Gift className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-dark-100">Create Giveaway</p>
          <p className="text-xs text-dark-400">Set up a new server giveaway</p>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Prize *</label>
          <input type="text" value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="e.g. Discord Nitro" className="input-dark text-sm" autoFocus />
        </div>
        <div>
          <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." className="input-dark text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Winners</label>
            <input type="number" value={winners} onChange={(e) => setWinners(Math.max(1, parseInt(e.target.value) || 1))} min={1} max={20} className="input-dark text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Duration (minutes)</label>
            <input type="number" value={durationMin} onChange={(e) => setDurationMin(Math.max(1, parseInt(e.target.value) || 1))} min={1} className="input-dark text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Channel *</label>
          <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className="input-dark text-sm" aria-label="Giveaway channel">
            <option value="">Select channel...</option>
            {textChannels.map((c) => (
              <option key={c.id} value={c.id}>#{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Required Role (optional)</label>
          <input type="text" value={requirementRoleId} onChange={(e) => setRequirementRoleId(e.target.value)} placeholder="Role ID (blank = anyone)" className="input-dark text-sm font-mono" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-dark-700/30">
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
        <button onClick={handleSave} disabled={saving || !prize.trim() || !channelId} className="btn-primary text-sm disabled:opacity-50">
          {saving ? 'Creating...' : 'Create Giveaway'}
        </button>
      </div>
    </Modal>
  );
}

function ConfirmModal({ title, description, confirmLabel, onConfirm, onClose, loading, danger }) {
  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <p className="text-sm font-semibold text-dark-100">{title}</p>
      <p className="text-xs text-dark-400">{description}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
        <button onClick={onConfirm} disabled={loading} className={`${danger ? 'btn-danger' : 'btn-primary'} text-sm disabled:opacity-50`}>
          {loading ? 'Working...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default function GiveawaysPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = user?.role === 'owner';
  const [giveaways, setGiveaways] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [channels, setChannels] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchGiveaways = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const data = await api.getGiveaways(params);
      setGiveaways(data.giveaways || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch {
      toast('Failed to load giveaways', 'error');
    }
    setLoading(false);
  }, [statusFilter, toast]);

  const loadChannels = async () => {
    try {
      const data = await api.getChannels();
      setChannels(data.channels || []);
    } catch {
      toast('Failed to load channels', 'error');
    }
  };

  useEffect(() => { fetchGiveaways(page); }, [page, fetchGiveaways]);
  useEffect(() => { loadChannels(); }, []);

  const active = giveaways.filter((g) => g.status === 'active').length;
  const completed = giveaways.filter((g) => g.status === 'ended').length;
  const totalEntries = giveaways.reduce((sum, g) => sum + (g.entries?.length || 0), 0);

  const requestConfirm = (type, id) => {
    setConfirmAction({ type, id, loading: false });
  };

  const handleEnd = async () => {
    setConfirmAction((prev) => prev ? { ...prev, loading: true } : null);
    try {
      await api.endGiveaway(confirmAction.id);
      toast('Giveaway ended', 'success');
      fetchGiveaways(page);
    } catch (err) {
      toast(err.message || 'Failed to end giveaway', 'error');
    }
    setConfirmAction(null);
  };

  const handleReroll = async () => {
    setConfirmAction((prev) => prev ? { ...prev, loading: true } : null);
    try {
      await api.rerollGiveaway(confirmAction.id);
      toast('Giveaway rerolled', 'success');
      fetchGiveaways(page);
    } catch (err) {
      toast(err.message || 'Failed to reroll', 'error');
    }
    setConfirmAction(null);
  };

  const handleDelete = async () => {
    setConfirmAction((prev) => prev ? { ...prev, loading: true } : null);
    try {
      await api.deleteGiveaway(confirmAction.id);
      toast('Giveaway deleted', 'success');
      fetchGiveaways(page);
    } catch (err) {
      toast(err.message || 'Failed to delete', 'error');
    }
    setConfirmAction(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Giveaways"
        subtitle="Create and manage server giveaways"
        onRefresh={() => fetchGiveaways(page)}
        refreshing={loading}
      >
        {isOwner && (
          <button onClick={() => setCreating(true)} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Giveaway
          </button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-green-400/10 flex items-center justify-center">
              <Gift className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-dark-100 mt-2">{active}</p>
          <p className="text-sm text-dark-400">Active Giveaways</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-dark-100 mt-2">{completed}</p>
          <p className="text-sm text-dark-400">Completed</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-400/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-dark-100 mt-2">{totalEntries}</p>
          <p className="text-sm text-dark-400">Total Entries</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 glass w-fit">
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'ended', label: 'Ended' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => { setStatusFilter(f.id); setPage(1); }}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all duration-200
              ${statusFilter === f.id
                ? 'bg-ice-300/15 text-ice-300 border border-ice-300/20'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/30 border border-transparent'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="glass overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
          </div>
        ) : giveaways.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No Giveaways"
            description={isOwner ? 'Click "Create Giveaway" to get started.' : 'No giveaways have been created yet.'}
          />
        ) : (
          <div className="divide-y divide-dark-700/20">
            {giveaways.map((g) => (
              <div key={g._id} className="px-4 py-3 flex items-center gap-4 hover:bg-dark-700/10 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-dark-800/50 flex items-center justify-center flex-shrink-0">
                  {g.status === 'active' ? (
                    <Gift className="w-5 h-5 text-green-400" />
                  ) : g.status === 'ended' ? (
                    <Trophy className="w-5 h-5 text-blue-400" />
                  ) : (
                    <X className="w-5 h-5 text-dark-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-dark-200 truncate">{g.prize}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      g.status === 'active' ? 'bg-green-400/10 text-green-400 border border-green-400/20' :
                      g.status === 'ended' ? 'bg-blue-400/10 text-blue-400 border border-blue-400/20' :
                      'bg-dark-700/50 text-dark-500 border border-dark-700/30'
                    }`}>
                      {g.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-dark-500 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {g.entries?.length || 0} entries
                    </span>
                    <span className="text-xs text-dark-600">/</span>
                    <span className="text-xs text-dark-500">{g.winners} winner(s)</span>
                    {g.endAt && (
                      <>
                        <span className="text-xs text-dark-600">/</span>
                        <span className="text-xs text-dark-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {g.status === 'active'
                            ? `Ends ${new Date(g.endAt).toLocaleDateString()}`
                            : `Ended ${g.endedAt ? new Date(g.endedAt).toLocaleDateString() : ''}`
                          }
                        </span>
                      </>
                    )}
                    {g.winnerIds?.length > 0 && (
                      <>
                        <span className="text-xs text-dark-600">/</span>
                        <span className="text-xs text-ice-300">{g.winnerIds.length} winner(s) selected</span>
                      </>
                    )}
                  </div>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {g.status === 'active' && (
                      <button onClick={() => requestConfirm('end', g._id)} className="p-1.5 rounded-lg text-dark-600 hover:text-yellow-400 hover:bg-dark-700/50 transition-colors" title="End Giveaway">
                        <StopCircle className="w-4 h-4" />
                      </button>
                    )}
                    {g.status === 'ended' && (
                      <button onClick={() => requestConfirm('reroll', g._id)} className="p-1.5 rounded-lg text-dark-600 hover:text-purple-400 hover:bg-dark-700/50 transition-colors" title="Reroll">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => requestConfirm('delete', g._id)} className="p-1.5 rounded-lg text-dark-600 hover:text-red-400 hover:bg-dark-700/50 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700/50">
            <p className="text-xs text-dark-500">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost p-2 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages} className="btn-ghost p-2 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {creating && (
        <CreateGiveawayModal channels={channels} onSave={() => { setCreating(false); setPage(1); fetchGiveaways(1); }} onClose={() => setCreating(false)} />
      )}

      {confirmAction?.type === 'end' && (
        <ConfirmModal title="End Giveaway?" description="This will immediately end the giveaway and select a winner." confirmLabel="End Now" onConfirm={handleEnd} onClose={() => setConfirmAction(null)} loading={confirmAction.loading} danger />
      )}
      {confirmAction?.type === 'reroll' && (
        <ConfirmModal title="Reroll Giveaway?" description="This will pick a new winner from remaining entries." confirmLabel="Reroll" onConfirm={handleReroll} onClose={() => setConfirmAction(null)} loading={confirmAction.loading} />
      )}
      {confirmAction?.type === 'delete' && (
        <ConfirmModal title="Delete Giveaway?" description="This will permanently remove the giveaway and delete the Discord message." confirmLabel="Delete" onConfirm={handleDelete} onClose={() => setConfirmAction(null)} loading={confirmAction.loading} danger />
      )}
    </div>
  );
}
