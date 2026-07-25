import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

function roleColorHex(color) {
  if (!color || color === 0) return '#4b5563';
  return `#${color.toString(16).padStart(6, '0')}`;
}

export default function RoleSelector({ roles = [], value, onChange, label }) {
  const sorted = useMemo(
    () => [...roles].sort((a, b) => (b.position || 0) - (a.position || 0)),
    [roles]
  );

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-dark-400 uppercase tracking-wider">{label}</label>}
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="input-dark appearance-none pr-10 cursor-pointer"
        >
          <option value="">Select a role...</option>
          {sorted.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
      </div>
      {value && (() => {
        const selected = sorted.find((r) => r.id === value);
        if (!selected) return null;
        return (
          <div className="flex items-center gap-2 mt-1">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: roleColorHex(selected.color) }}
            />
            <span className="text-xs text-dark-400">{selected.name}</span>
          </div>
        );
      })()}
    </div>
  );
}
