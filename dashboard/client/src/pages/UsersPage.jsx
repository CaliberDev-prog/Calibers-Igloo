import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  Users, UserPlus, Trash2, Shield, Pencil, AlertTriangle, Eye, EyeOff,
} from 'lucide-react';

const ROLES = [
  { value: 'owner', label: 'Owner', desc: 'Full access to everything' },
  { value: 'developer', label: 'Developer', desc: 'System & config access' },
  { value: 'manager', label: 'Manager', desc: 'Manage tickets & settings' },
  { value: 'moderator', label: 'Moderator', desc: 'Moderate & manage content' },
  { value: 'support', label: 'Support', desc: 'Handle tickets only' },
  { value: 'analyst', label: 'Analyst', desc: 'View-only with analytics' },
];

function CreateUserModal({ onSave, onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('support');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!username.trim() || !password.trim()) return;
    setSaving(true);
    try {
      await api.createUser({ username: username.trim(), password, role });
      toast('User created', 'success');
      onSave();
    } catch (err) {
      toast(err.message || 'Failed to create user', 'error');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-dark-950/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="glass p-6 max-w-md w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ice-300/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-ice-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-dark-100">Create Dashboard User</p>
            <p className="text-xs text-dark-400">Add a new staff account</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-dark text-sm" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
          </div>
          <div>
            <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input-dark text-sm pr-10" onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input-dark text-sm">
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-dark-600 mt-1">{ROLES.find((r) => r.value === role)?.desc}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-dark-700/30">
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={handleCreate} disabled={saving || !username.trim() || !password.trim()} className="btn-primary text-sm disabled:opacity-50">
            {saving ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({ user: targetUser, onSave, onClose }) {
  const [role, setRole] = useState(targetUser.role);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateUser(targetUser._id, { role });
      toast('User updated', 'success');
      onSave();
    } catch (err) {
      toast(err.message || 'Failed to update user', 'error');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-dark-950/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="glass p-6 max-w-sm w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ice-300/10 flex items-center justify-center">
            <Pencil className="w-5 h-5 text-ice-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-dark-100">Edit User</p>
            <p className="text-xs text-dark-400">{targetUser.username}</p>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="input-dark text-sm">
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-dark-600 mt-1">{ROLES.find((r) => r.value === role)?.desc}</p>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-dark-700/30">
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteUserModal({ user: targetUser, onSave, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteUser(targetUser._id);
      toast('User deleted', 'success');
      onSave();
    } catch (err) {
      toast(err.message || 'Failed to delete user', 'error');
    }
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 bg-dark-950/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="glass p-6 max-w-sm w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-dark-100">Delete User</p>
            <p className="text-xs text-dark-400">This cannot be undone</p>
          </div>
        </div>
        <p className="text-xs text-dark-400 bg-dark-900/50 rounded-xl p-3 border border-dark-700/30">
          Remove <strong className="text-dark-200">{targetUser.username}</strong> from the dashboard?
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="btn-danger text-sm disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

const ROLE_COLORS = {
  owner: 'text-red-400 bg-red-400/10 border-red-400/20',
  developer: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  manager: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  moderator: 'text-green-400 bg-green-400/10 border-green-400/20',
  support: 'text-ice-300 bg-ice-300/10 border-ice-300/20',
  analyst: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
};

export default function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = user?.role === 'owner';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data.users || []);
    } catch {
      toast('Failed to load users', 'error');
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Dashboard Users</h1>
          <p className="text-dark-400 text-sm mt-1">{users.length} account(s)</p>
        </div>
        {isOwner && (
          <button onClick={() => setCreating(true)} className="btn-primary flex items-center gap-2 text-sm">
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      <div className="glass overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-dark-800/40 border border-dark-700/30 flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-dark-600" />
            </div>
            <h3 className="text-lg font-semibold text-dark-300 mb-2">No Dashboard Users</h3>
            <p className="text-sm text-dark-500">Create staff accounts to give team access</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-700/20">
            {users.map((u) => (
              <div key={u._id} className="px-4 py-3 flex items-center gap-4 hover:bg-dark-700/10 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-dark-800/60 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-dark-300">{(u.username || '?')[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-dark-200">{u.username}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role] || ROLE_COLORS.support}`}>
                      {u.role}
                    </span>
                  </div>
                  <p className="text-xs text-dark-600">ID: {u.userId || 'N/A'}</p>
                </div>
                {isOwner && u.role !== 'owner' && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditing(u)} className="p-1.5 rounded-lg hover:bg-dark-700/50 text-dark-500 hover:text-ice-300 transition-colors" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleting(u)} className="p-1.5 rounded-lg hover:bg-dark-700/50 text-dark-500 hover:text-red-400 transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {creating && <CreateUserModal onSave={() => { setCreating(false); fetchUsers(); }} onClose={() => setCreating(false)} />}
      {editing && <EditUserModal user={editing} onSave={() => { setEditing(null); fetchUsers(); }} onClose={() => setEditing(null)} />}
      {deleting && <DeleteUserModal user={deleting} onSave={() => { setDeleting(null); fetchUsers(); }} onClose={() => setDeleting(null)} />}
    </div>
  );
}
