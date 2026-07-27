import { Shield, ChevronUp, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { CopyId, roleColorHex } from '../../components/shared.jsx';

function roleColorFallback(color) {
  if (!color || color === 0) return '#4b5563';
  return `#${color.toString(16).padStart(6, '0')}`;
}

export default function RolesTab({ roles, isOwner, reordering, onMoveRole, onEditRole, onDeleteRole }) {
  const sortedRoles = [...roles].sort((a, b) => (b.position || 0) - (a.position || 0));

  return (
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
                    onClick={() => onMoveRole(role.id, -1)}
                    disabled={reordering || idx === 0}
                    className="p-0.5 text-dark-600 hover:text-ice-300 disabled:opacity-20 transition-colors"
                    title="Move up"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onMoveRole(role.id, 1)}
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
                    onClick={() => onEditRole(role)}
                    className="text-dark-600 hover:text-ice-300 transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit role"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteRole(role)}
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
  );
}
