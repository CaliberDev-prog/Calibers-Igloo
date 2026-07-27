import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useToast } from '../../components/Toast.jsx';
import { AlertTriangle } from 'lucide-react';
import Modal from '../../components/Modal.jsx';

export default function DeleteRoleModal({ role, onSave, onClose }) {
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
