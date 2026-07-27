import { Hash, Volume2, MessageSquare, Shield, Users, Server } from 'lucide-react';
import { CopyId } from '../../components/shared.jsx';

export default function OverviewTab({ guild, channels, roles }) {
  const textChannels = channels.filter((c) => c.type === 0).length;
  const voiceChannels = channels.filter((c) => c.type === 2).length;

  return (
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
  );
}
