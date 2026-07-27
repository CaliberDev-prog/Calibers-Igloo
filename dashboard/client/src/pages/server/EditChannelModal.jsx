import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/Toast.jsx';
import { Hash } from 'lucide-react';
import Modal from '../../components/Modal.jsx';

export default function EditChannelModal({ channel, onSave, onClose }) {
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
