import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import {
  Hash, Volume2, Megaphone, Server, Users, Copy, Check,
  RefreshCw, MessageSquare, Shield, Palette, Eye, BarChart3,
  ChevronRight, Folder, Lock, Tag, Mic, Radio,
} from 'lucide-react';

const CHANNEL_ICONS = {
  0: Hash,
  2: Volume2,
  4: Megaphone,
  5: Megaphone,
  13: Radio,
  15: Lock,
};

const CHANNEL_TYPE_NAMES = {
  0: 'Text',
  2: 'Voice',
  4: 'Announcement',
  5: 'Stage',
  13: 'Forum',
  15: 'Channel',
};

function CopyId({ id }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button onClick={copy} className="text-dark-600 hover:text-dark-400 transition-colors" title="Copy ID">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function ServerPage() {
  const { toast } = useToast();
  const [guild, setGuild] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('channels');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [chData, roleData] = await Promise.all([
        api.getChannels(),
        api.getRoles(),
      ]);
      setChannels(chData.channels || []);
      setRoles(roleData.roles || []);

      if (!guild) {
        try {
          const overview = await api.getOverview();
          setGuild(overview.guild);
        } catch {}
      }
    } catch (err) {
      toast('Failed to load server data', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

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
    { id: 'overview', label: 'Overview', icon: Eye },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Server Explorer</h1>
          <p className="text-dark-400 text-sm mt-1">Browse channels, roles, and server info</p>
        </div>
        <button onClick={fetchAll} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

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
                  return (
                    <div key={catId} className="glass overflow-hidden animate-fade-in">
                      <div className="px-4 py-3 border-b border-dark-700/50 flex items-center gap-2">
                        <Folder className="w-4 h-4 text-dark-500" />
                        <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">{catName}</span>
                        <span className="text-xs text-dark-600 ml-auto">{catChannels.length}</span>
                      </div>
                      <div className="divide-y divide-dark-700/20">
                        {catChannels
                          .filter((ch) => ch.type !== 4)
                          .sort((a, b) => (a.position || 0) - (b.position || 0))
                          .map((ch) => {
                            const Icon = CHANNEL_ICONS[ch.type] || Hash;
                            return (
                              <div key={ch.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-dark-700/15 transition-colors group">
                                <Icon className="w-4 h-4 text-dark-500 flex-shrink-0" />
                                <span className="text-sm text-dark-200 flex-1">{ch.name}</span>
                                <span className="text-[10px] text-dark-600 bg-dark-800/50 px-2 py-0.5 rounded-full">
                                  {CHANNEL_TYPE_NAMES[ch.type] || 'Unknown'}
                                </span>
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
              </div>
              {sortedRoles.length === 0 ? (
                <div className="p-12 text-center text-dark-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No roles found</p>
                </div>
              ) : (
                <div className="divide-y divide-dark-700/20">
                  {sortedRoles.map((role) => (
                    <div key={role.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-dark-700/15 transition-colors">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#4b5563' }}
                      />
                      <span className="text-sm text-dark-200 flex-1">{role.name}</span>
                      {role.color ? (
                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#4b5563'}15`,
                            color: `#${role.color.toString(16).padStart(6, '0')}`,
                            border: `1px solid ${role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#4b5563'}30`,
                          }}
                        >
                          #{role.color.toString(16).padStart(6, '0')}
                        </span>
                      ) : null}
                      <CopyId id={role.id} />
                    </div>
                  ))}
                </div>
              )}
            </div>
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
    </div>
  );
}
