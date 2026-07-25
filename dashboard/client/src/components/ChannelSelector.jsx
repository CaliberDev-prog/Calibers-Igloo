import { useMemo } from 'react';
import { Hash, Volume2, FolderOpen, Megaphone, ChevronDown } from 'lucide-react';

const TYPE_ICONS = {
  0: Hash,
  2: Volume2,
  4: FolderOpen,
  5: Volume2,
  13: Megaphone,
};

const TYPE_LABELS = {
  0: '#',
  2: '🔊',
  4: '📁',
  5: '🔊',
  13: '📢',
};

export default function ChannelSelector({ channels = [], value, onChange, filter, label }) {
  const filtered = useMemo(() => {
    if (filter !== undefined && filter !== null) {
      return channels.filter((ch) => ch.type === filter);
    }
    return channels;
  }, [channels, filter]);

  const grouped = useMemo(() => {
    const categories = channels.filter((ch) => ch.type === 4);
    const catMap = {};
    categories.forEach((c) => { catMap[c.id] = c.name; });

    const groups = { ungrouped: [] };
    filtered.forEach((ch) => {
      if (ch.type === 4) return;
      const catName = catMap[ch.parent_id] || null;
      if (catName) {
        if (!groups[catName]) groups[catName] = [];
        groups[catName].push(ch);
      } else {
        groups.ungrouped.push(ch);
      }
    });
    return groups;
  }, [channels, filtered]);

  const hasGroups = Object.keys(grouped).some((k) => k !== 'ungrouped');

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-dark-400 uppercase tracking-wider">{label}</label>}
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="input-dark appearance-none pr-10 cursor-pointer"
        >
          <option value="">Select a channel...</option>
          {hasGroups
            ? Object.entries(grouped).map(([cat, chs]) =>
                chs.length > 0 && (
                  <optgroup key={cat} label={cat === 'ungrouped' ? 'Channels' : cat}>
                    {chs.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {TYPE_LABELS[ch.type] || '#'} {ch.name}
                      </option>
                    ))}
                  </optgroup>
                )
              )
            : filtered.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {TYPE_LABELS[ch.type] || '#'} {ch.name}
                </option>
              ))
          }
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
      </div>
    </div>
  );
}
