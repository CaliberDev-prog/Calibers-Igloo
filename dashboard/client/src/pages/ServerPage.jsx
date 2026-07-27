import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../components/Toast.jsx';
import { Hash, Server, Users, Shield, Eye } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import MembersTab from '../components/MembersTab.jsx';
import ChannelsTab from './server/ChannelsTab.jsx';
import RolesTab from './server/RolesTab.jsx';
import OverviewTab from './server/OverviewTab.jsx';
import EditRoleModal from './server/EditRoleModal.jsx';
import EditChannelModal from './server/EditChannelModal.jsx';
import DeleteRoleModal from './server/DeleteRoleModal.jsx';

const TABS = [
  { id: 'channels', label: 'Channels', icon: Hash },
  { id: 'roles', label: 'Roles', icon: Shield },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'overview', label: 'Overview', icon: Eye },
];

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
        {TABS.map((tab) => (
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
            <ChannelsTab
              channels={channels}
              isOwner={isOwner}
              reordering={reordering}
              onMoveChannel={moveChannel}
              onEditChannel={setEditingChannel}
            />
          )}
          {activeTab === 'roles' && (
            <RolesTab
              roles={roles}
              isOwner={isOwner}
              reordering={reordering}
              onMoveRole={moveRoleById}
              onEditRole={setEditingRole}
              onDeleteRole={setDeletingRole}
            />
          )}
          {activeTab === 'members' && (
            <MembersTab roles={roles} />
          )}
          {activeTab === 'overview' && (
            <OverviewTab guild={guild} channels={channels} roles={roles} />
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
