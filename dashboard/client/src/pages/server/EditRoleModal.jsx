import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/Toast.jsx';
import { Shield } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import ColorWheel from '../../components/ColorWheel.jsx';

function roleColorFallback(color) {
  if (!color || color === 0) return '#4b5563';
  return `#${color.toString(16).padStart(6, '0')}`;
}

export default function EditRoleModal({ role, onSave, onClose }) {
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
