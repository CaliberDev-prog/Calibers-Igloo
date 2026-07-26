import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  Hash, Volume2, Megaphone, Server, Users,
  RefreshCw, MessageSquare, Shield, Eye, Folder, Lock,
  Pencil, Trash2, AlertTriangle, Radio, ChevronUp, ChevronDown,
} from 'lucide-react';
import ColorWheel from '../components/ColorWheel.jsx';
import MembersTab from '../components/MembersTab.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { CopyId, roleColorHex } from '../components/shared.jsx';

const CHANNEL_ICONS = { 0: Hash, 2: Volume2, 4: Megaphone, 5: Megaphone, 13: Radio, 15: Lock };
const CHANNEL_TYPE_NAMES = { 0: 'Text', 2: 'Voice', 4: 'Announcement', 5: 'Stage', 13: 'Forum', 15: 'Channel' };

function roleColorFallback(color) {
  if (!color || color === 0) return '#4b5563';
  return `#${color.toString(16).padStart(6, '0')}`;
}

function EditRoleModal({ role, onSave, onClose }) {
  const [name, setName] = useState(role.name);
  const [hexColor, setHexColor] = useState(roleColorFallback(role.color));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.editRole(role.id, { name: name.trim(), color: hexColor });
      toast('Role updated', 'success');
      onSave();
    } catch (err) {
      toast(err.message || 'Failed to update role', 'error');
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
          <p className="text-sm font-semibold text-dark-100">Edit Role</p>
          <p className="text-xs text-dark-400">Rename or change color</p>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Role Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-dark text-sm"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>
        <ColorWheel value={hexColor} onChange={setHexColor} label="Role Color" />
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-dark-700/30">
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
        <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary text-sm disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}

function EditChannelModal({ channel, onSave, onClose }) {
  const [name, setName] = useState(channel.name);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.editChannel(channel.id, { name: name.trim() });
      toast('Channel renamed', 'success');
      onSave();
    } catch (err) {
      toast(err.message || 'Failed to rename channel', 'error');
    }
    setSaving(false);
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ice-300/10 flex items-center justify-center">
          <Hash className="w-5 h-5 text-ice-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-dark-100">Rename Channel</p>
          <p className="text-xs text-dark-400">#{channel.name}</p>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Channel Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-dark text-sm"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-dark-700/30">
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
        <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary text-sm disabled:opacity-50">
          {saving ? 'Renaming...' : 'Rename'}
        </button>
      </div>
    </Modal>
  );
}

function DeleteRoleModal({ role, onSave, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteRole(role.id);
      toast('Role deleted', 'success');
      onSave();
    } catch (err) {
      toast(err.message || 'Failed to delete role', 'error');
    }
    setDeleting(false);
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-dark-100">Delete Role</p>
          <p className="text-xs text-dark-400">This cannot be undone</p>
        </div>
      </div>
      <p className="text-xs text-dark-400 bg-dark-900/50 rounded-xl p-3 border border-dark-700/30">
        Are you sure you want to delete <strong className="text-dark-200">{role.name}</strong>?
        Members with this role will lose its permissions.
      </p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
        <button onClick={handleDelete} disabled={deleting} className="btn-danger text-sm disabled:opacity-50">
          {deleting ? 'Deleting...' : 'Delete Role'}
        </button>
      </div>
    </Modal>
  );
}

export default function ServerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = user?.role === 'owner';
  const [guild, setGuild] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('channels');
  const [editingRole, setEditingRole] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);
  const [editingChannel, setEditingChannel] = useState(null);
  const [reordering, setReordering] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [chData, roleData] = await Promise.all([
        api.getChannels(),
        api.getRoles(),
      ]);
      setChannels(chData.channels || []);
      setRoles(roleData.roles || []);

      try {
        const overview = await api.getOverview();
        setGuild(overview.guild);
      } catch {}
    } catch {
      toast('Failed to load server data', 'error');
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => { fetchAll(); }, []);

  const moveChannel = async (catId, direction, idx) => {
    const catChannels = channels
      .filter((c) => (c.parent_id || '__uncategorized__') === catId && c.type !== 4)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    if (idx + direction < 0 || idx + direction >= catChannels.length) return;

    const newOrder = [...catChannels];
    const [moved] = newOrder.splice(idx, 1);
    newOrder.splice(idx + direction, 0, moved);

    const positions = newOrder.map((ch, i) => ({ id: ch.id, position: i }));

    setReordering(true);
    try {
      await api.reorderChannels(positions);
      toast('Channels reordered', 'success');
      await fetchAll();
    } catch (err) {
      toast(err.message || 'Failed to reorder channels', 'error');
    }
    setReordering(false);
  };

  const moveRoleById = async (roleId, direction) => {
    const sorted = [...roles].sort((a, b) => (b.position || 0) - (a.position || 0));
    const idx = sorted.findIndex((r) => r.id === roleId);
    if (idx === -1) return;

    const newOrder = [...sorted];
    const [moved] = newOrder.splice(idx, 1);
    newOrder.splice(idx + direction, 0, moved);

    const positions = newOrder.map((r, i) => ({ id: r.id, position: i }));

    setReordering(true);
    try {
      await api.reorderRoles(positions);
      toast('Roles reordered', 'success');
      await fetchAll();
    } catch (err) {
      toast(err.message || 'Failed to reorder roles', 'error');
    }
    setReordering(false);
  };

  const groupedChannels = channels.reduce((acc, ch) => {
    const catId = ch.parent_id || '__uncategorized__';
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(ch);
    return acc;
  }, {});

  const categories = Object.entries(groupedChannels).sort((a, b) => {
    if (a[0] === '__uncategorized__') return -1;
    if (b[0] === '__uncategorized__') return 1;
    const aPos = channels.find((c) => c.id === a[0])?.position ?? 0;
    const bPos = channels.find((c) => c.id === b[0])?.position ?? 0;
    return aPos - bPos;
  });

  const textChannels = channels.filter((c) => c.type === 0).length;
  const voiceChannels = channels.filter((c) => c.type === 2).length;
  const sortedRoles = [...roles].sort((a, b) => (b.position || 0) - (a.position || 0));

  const tabs = [
    { id: 'channels', label: 'Channels', icon: Hash },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'overview', label: 'Overview', icon: Eye },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Server Explorer"
        subtitle="Browse and manage channels & roles"
        onRefresh={fetchAll}
        refreshing={loading}
      />

      {guild && (
        <div className="glass p-6 flex items-center gap-4 animate-fade-in">
          {guild.icon ? (
            <img src={guild.icon} alt="" className="w-16 h-16 rounded-2xl" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-ice-300/10 flex items-center justify-center">
              <Server className="w-8 h-8 text-ice-300" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-dark-100">{guild.name}</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-dark-400 flex items-center gap-1.5">
                <Users className="w-4 h-4" /> {guild.memberCount?.toLocaleString() || '?'} members
              </span>
              <span className="text-sm text-dark-400 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                {guild.onlineCount?.toLocaleString() || '?'} online
              </span>
              {guild.id && (
                <span className="text-xs text-dark-600 font-mono">ID: {guild.id}</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 p-1 glass w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${activeTab === tab.id
                ? 'bg-ice-300/15 text-ice-300 border border-ice-300/20'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/30 border border-transparent'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'channels' && (
            <div className="space-y-4">
              {categories.length === 0 ? (
                <div className="glass p-12 text-center text-dark-500">
                  <Hash className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No channels found</p>
                </div>
              ) : (
                categories.map(([catId, catChannels]) => {
                  const catName = catId === '__uncategorized__' ? 'Uncategorized' :
                    channels.find((c) => c.id === catId)?.name || catId;
                  const ordered = catChannels
                    .filter((ch) => ch.type !== 4)
                    .sort((a, b) => (a.position || 0) - (b.position || 0));
                  return (
                    <div key={catId} className="glass overflow-hidden animate-fade-in">
                      <div className="px-4 py-3 border-b border-dark-700/50 flex items-center gap-2">
                        <Folder className="w-4 h-4 text-dark-500" />
                        <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">{catName}</span>
                        <span className="text-xs text-dark-600 ml-auto">{ordered.length}</span>
                      </div>
                      <div className="divide-y divide-dark-700/20">
                        {ordered.map((ch, idx) => {
                          const Icon = CHANNEL_ICONS[ch.type] || Hash;
                          return (
                            <div key={ch.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-dark-700/15 transition-colors group">
                              {isOwner && (
                                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => moveChannel(catId, -1, idx)}
                                    disabled={reordering || idx === 0}
                                    className="p-0.5 text-dark-600 hover:text-ice-300 disabled:opacity-20 transition-colors"
                                    title="Move up"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => moveChannel(catId, 1, idx)}
                                    disabled={reordering || idx === ordered.length - 1}
                                    className="p-0.5 text-dark-600 hover:text-ice-300 disabled:opacity-20 transition-colors"
                                    title="Move down"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              <Icon className="w-4 h-4 text-dark-500 flex-shrink-0" />
                              <span className="text-sm text-dark-200 flex-1">{ch.name}</span>
                              <span className="text-[10px] text-dark-600 bg-dark-800/50 px-2 py-0.5 rounded-full">
                                {CHANNEL_TYPE_NAMES[ch.type] || 'Unknown'}
                              </span>
                              {isOwner && ch.type !== 4 && (
                                <button
                                  onClick={() => setEditingChannel(ch)}
                                  className="text-dark-600 hover:text-ice-300 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Rename channel"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <CopyId id={ch.id} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="glass overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-dark-700/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  {sortedRoles.length} role(s)
                </span>
                {isOwner && <span className="text-[10px] text-dark-600">Hover to reorder or edit</span>}
              </div>
              {sortedRoles.length === 0 ? (
                <div className="p-12 text-center text-dark-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No roles found</p>
                </div>
              ) : (
                <div className="divide-y divide-dark-700/20">
                  {sortedRoles.map((role, idx) => (
                    <div key={role.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-dark-700/15 transition-colors group">
                      {isOwner && (
                        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveRoleById(role.id, -1)}
                            disabled={reordering || idx === 0}
                            className="p-0.5 text-dark-600 hover:text-ice-300 disabled:opacity-20 transition-colors"
                            title="Move up"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveRoleById(role.id, 1)}
                            disabled={reordering || idx === sortedRoles.length - 1}
                            className="p-0.5 text-dark-600 hover:text-ice-300 disabled:opacity-20 transition-colors"
                            title="Move down"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: roleColorFallback(role.color) }}
                      />
                      <span className="text-sm text-dark-200 flex-1">{role.name}</span>
                      {role.color ? (
                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${roleColorFallback(role.color)}15`,
                            color: roleColorFallback(role.color),
                            border: `1px solid ${roleColorFallback(role.color)}30`,
                          }}
                        >
                          {roleColorFallback(role.color)}
                        </span>
                      ) : null}
                      {isOwner && (
                        <>
                          <button
                            onClick={() => setEditingRole(role)}
                            className="text-dark-600 hover:text-ice-300 transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit role"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingRole(role)}
                            className="text-dark-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <CopyId id={role.id} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <MembersTab roles={roles} />
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-ice-300/10">
                      <Hash className="w-5 h-5 text-ice-300" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-dark-100 mt-2">{channels.length}</p>
                  <p className="text-sm text-dark-400">Total Channels</p>
                </div>
                <div className="stat-card">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10">
                      <MessageSquare className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-dark-100 mt-2">{textChannels}</p>
                  <p className="text-sm text-dark-400">Text Channels</p>
                </div>
                <div className="stat-card">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/10">
                      <Volume2 className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-dark-100 mt-2">{voiceChannels}</p>
                  <p className="text-sm text-dark-400">Voice Channels</p>
                </div>
                <div className="stat-card">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/10">
                      <Shield className="w-5 h-5 text-green-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-dark-100 mt-2">{roles.length}</p>
                  <p className="text-sm text-dark-400">Roles</p>
                </div>
              </div>

              <div className="glass p-6">
                <h3 className="text-sm font-semibold text-dark-200 mb-4">Server Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between py-2 border-b border-dark-700/30">
                    <span className="text-sm text-dark-400">Server Name</span>
                    <span className="text-sm text-dark-200">{guild?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-dark-700/30">
                    <span className="text-sm text-dark-400">Server ID</span>
                    <span className="text-sm text-dark-200 font-mono flex items-center gap-2">
                      {guild?.id || 'Unknown'}
                      {guild?.id && <CopyId id={guild.id} />}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-dark-700/30">
                    <span className="text-sm text-dark-400">Members</span>
                    <span className="text-sm text-dark-200">{guild?.memberCount?.toLocaleString() || '?'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-dark-700/30">
                    <span className="text-sm text-dark-400">Online</span>
                    <span className="text-sm text-dark-200">{guild?.onlineCount?.toLocaleString() || '?'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-dark-700/30">
                    <span className="text-sm text-dark-400">Total Channels</span>
                    <span className="text-sm text-dark-200">{channels.length}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-dark-700/30">
                    <span className="text-sm text-dark-400">Total Roles</span>
                    <span className="text-sm text-dark-200">{roles.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {editingRole && (
        <EditRoleModal
          role={editingRole}
          onSave={() => { setEditingRole(null); fetchAll(); }}
          onClose={() => setEditingRole(null)}
        />
      )}
      {deletingRole && (
        <DeleteRoleModal
          role={deletingRole}
          onSave={() => { setDeletingRole(null); fetchAll(); }}
          onClose={() => setDeletingRole(null)}
        />
      )}
      {editingChannel && (
        <EditChannelModal
          channel={editingChannel}
          onSave={() => { setEditingChannel(null); fetchAll(); }}
          onClose={() => setEditingChannel(null)}
        />
      )}
    </div>
  );
}
