import { Hash, Folder, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import { CopyId } from '../../components/shared.jsx';

const CHANNEL_ICONS = { 0: Hash, 2: Hash, 4: Hash, 5: Hash, 13: Hash, 15: Hash };
const CHANNEL_TYPE_NAMES = { 0: 'Text', 2: 'Voice', 4: 'Announcement', 5: 'Stage', 13: 'Forum', 15: 'Channel' };

export default function ChannelsTab({ channels, isOwner, reordering, onMoveChannel, onEditChannel }) {
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

  if (categories.length === 0) {
    return (
      <div className="glass p-12 text-center text-dark-500">
        <Hash className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No channels found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categories.map(([catId, catChannels]) => {
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
                          onClick={() => onMoveChannel(catId, -1, idx)}
                          disabled={reordering || idx === 0}
                          className="p-0.5 text-dark-600 hover:text-ice-300 disabled:opacity-20 transition-colors"
                          title="Move up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onMoveChannel(catId, 1, idx)}
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
                        onClick={() => onEditChannel(ch)}
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
      })}
    </div>
  );
}
