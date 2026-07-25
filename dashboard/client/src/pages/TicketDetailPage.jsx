import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  ArrowLeft, User, Clock, MessageSquare, Hash, Copy, Check,
  XCircle, UserPlus, UserMinus, Eye, Pencil,
} from 'lucide-react';

const DEPTS = {
  general: { name: 'General Support', emoji: '🛟' },
  reports: { name: 'Reports', emoji: '🚨' },
  hiring: { name: 'Hiring', emoji: '💼' },
};

function EditTicketModal({ ticket, onSave, onClose }) {
  const [departmentId, setDepartmentId] = useState(ticket.departmentId || '');
  const [claimedBy, setClaimedBy] = useState(ticket.claimedBy || '');
  const [notes, setNotes] = useState(ticket.notes || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.editTicket(ticket.ticketId, { departmentId, claimedBy, notes });
      toast('Ticket updated', 'success');
      onSave();
    } catch (err) {
      toast(err.message || 'Failed to update ticket', 'error');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-dark-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass p-6 max-w-md w-full space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ice-300/10 ring-1 ring-ice-300/10 flex items-center justify-center">
            <Pencil className="w-5 h-5 text-ice-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-dark-100">Edit Ticket #{String(ticket.ticketId).padStart(4, '0')}</p>
            <p className="text-xs text-dark-400">Update ticket details</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1.5 block">Department</label>
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="input-dark text-sm">
              {Object.entries(DEPTS).map(([id, d]) => (
                <option key={id} value={id}>{d.emoji} {d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1.5 block">Claimed By</label>
            <input type="text" value={claimedBy} onChange={(e) => setClaimedBy(e.target.value)} className="input-dark text-sm" placeholder="Staff member name" />
          </div>
          <div>
            <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1.5 block">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-dark text-sm min-h-[80px] resize-y" placeholder="Internal notes about this ticket..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-dark-700/30">
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}

export default function TicketDetailPage() {
  const { ticketId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = user?.role === 'owner';
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [closing, setClosing] = useState(false);
  const [participantId, setParticipantId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const fetchTicket = async () => {
    try {
      const data = await api.getTicket(ticketId);
      setTicket(data.ticket);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTicket(); }, [ticketId]);

  const copyId = () => {
    navigator.clipboard.writeText(ticket?.creatorId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeTicket = async () => {
    setClosing(true);
    try {
      await api.closeTicket(ticketId);
      toast('Ticket closed', 'success');
      fetchTicket();
    } catch {
      toast('Failed to close ticket', 'error');
    }
    setClosing(false);
  };

  const addParticipant = async () => {
    if (!participantId.trim()) return;
    setActionLoading(true);
    try {
      await api.addParticipant(ticketId, participantId);
      toast('Participant added', 'success');
      setParticipantId('');
      fetchTicket();
    } catch {
      toast('Failed to add participant', 'error');
    }
    setActionLoading(false);
  };

  const removeParticipant = async (userId) => {
    setActionLoading(true);
    try {
      await api.removeParticipant(ticketId, userId);
      toast('Participant removed', 'success');
      fetchTicket();
    } catch {
      toast('Failed to remove participant', 'error');
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-2 border-ice-300/20 border-t-ice-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-dark-800/40 border border-dark-700/20 flex items-center justify-center mx-auto mb-4">
          <Ticket className="w-8 h-8 text-dark-600" />
        </div>
        <p className="text-dark-400 text-sm font-medium">Ticket not found</p>
        <Link to="/tickets" className="text-ice-300 text-xs mt-2 inline-flex items-center gap-1 hover:text-ice-200 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back to tickets
        </Link>
      </div>
    );
  }

  const dept = DEPTS[ticket.departmentId];
  const statusColors = {
    open: 'badge bg-green-400/10 text-green-400 border-green-400/20',
    closed: 'badge bg-red-400/10 text-red-400 border-red-400/20',
    deleted: 'badge bg-dark-500/10 text-dark-500 border-dark-500/20',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/tickets" className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-dark-100 tracking-tight font-mono">#{String(ticket.ticketId).padStart(4, '0')}</h1>
            <span className={statusColors[ticket.status] || statusColors.open}>{ticket.status}</span>
          </div>
          <p className="text-dark-400 text-sm mt-1">{dept?.emoji} {dept?.name || ticket.departmentId}</p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button onClick={() => setEditing(true)} className="btn-ghost btn-sm">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {ticket.status === 'open' && (
            <button onClick={closeTicket} disabled={closing} className="btn-danger btn-sm disabled:opacity-50">
              {closing ? <div className="w-3.5 h-3.5 border-2 border-red-400/20 border-t-red-400 rounded-full animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Close
            </button>
          )}
          {ticket.channelId && (
            <a href={`https://discord.com/channels/${ticket.guildId || '@me'}/${ticket.channelId}`} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
              <Eye className="w-3.5 h-3.5" /> View Channel
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: User, label: 'Creator', value: ticket.creatorTag || ticket.creatorId, sub: ticket.creatorId, copyable: true },
          { icon: Hash, label: 'Channel', value: ticket.channelId || 'N/A', mono: true },
          { icon: Clock, label: 'Created', value: new Date(ticket.createdAt).toLocaleString() },
          { icon: MessageSquare, label: 'Messages', value: `${(ticket.staffMessageCount || 0) + (ticket.userMessageCount || 0)}`, sub: `Staff: ${ticket.staffMessageCount || 0} · User: ${ticket.userMessageCount || 0}` },
        ].map((item, i) => (
          <div key={i} className="stat-card !p-4">
            <item.icon className="w-4 h-4 text-ice-300/60 mb-2" />
            <p className="text-[11px] text-dark-500 uppercase tracking-wider">{item.label}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <p className={`text-sm text-dark-200 font-medium truncate ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
              {item.copyable && (
                <button onClick={copyId} className="text-dark-500 hover:text-dark-300 transition-colors">
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
            {item.sub && <p className="text-[11px] text-dark-600 font-mono mt-0.5 truncate">{item.sub}</p>}
          </div>
        ))}
      </div>

      {ticket.notes && (
        <div className="glass p-5">
          <h3 className="section-title">Notes</h3>
          <p className="text-sm text-dark-300 whitespace-pre-wrap leading-relaxed">{ticket.notes}</p>
        </div>
      )}

      {ticket.answers && ticket.answers.length > 0 && (
        <div className="glass p-5">
          <h3 className="section-title mb-4">Submitted Answers</h3>
          <div className="space-y-2.5">
            {ticket.answers.map((a, i) => (
              <div key={i} className="bg-dark-900/40 rounded-xl p-4 border border-dark-700/20">
                <p className="text-[11px] text-dark-500 uppercase tracking-wider mb-1">{a.question || a.questionId}</p>
                <p className="text-sm text-dark-200 whitespace-pre-wrap leading-relaxed">{a.answer || '*No answer*'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass p-5">
        <h3 className="section-title">Participants</h3>
        {ticket.participants && ticket.participants.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {ticket.participants.map((p, i) => (
              <span key={i} className="text-xs bg-dark-900/40 border border-dark-700/20 rounded-lg px-3 py-1.5 text-dark-300 flex items-center gap-2 font-mono">
                {p}
                <button onClick={() => removeParticipant(p)} disabled={actionLoading} className="text-dark-500 hover:text-red-400 transition-colors">
                  <UserMinus className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-dark-500 mb-3">No participants yet</p>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
            placeholder="User ID to add..."
            className="input-dark flex-1 text-sm"
          />
          <button onClick={addParticipant} disabled={!participantId.trim() || actionLoading} className="btn-primary btn-sm disabled:opacity-40">
            <UserPlus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      {ticket.claimedBy && (
        <div className="glass p-5">
          <h3 className="section-title">Claimed By</h3>
          <p className="text-sm text-dark-200 font-medium">{ticket.claimedBy}</p>
        </div>
      )}

      {ticket.history && ticket.history.length > 0 && (
        <div className="glass p-5">
          <h3 className="section-title mb-4">History</h3>
          <div className="space-y-0">
            {ticket.history.slice().reverse().map((h, i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-dark-700/15 last:border-0">
                <div className="w-2 h-2 rounded-full bg-ice-300/30 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-300">
                    <span className="text-dark-200 font-medium">{h.action?.replace(/_/g, ' ')}</span>
                    {h.performedBy && <span className="text-dark-500"> by {h.performedBy}</span>}
                  </p>
                  {h.oldValue && h.newValue && (
                    <p className="text-xs text-dark-500 mt-0.5">{h.oldValue} → {h.newValue}</p>
                  )}
                </div>
                <span className="text-[11px] text-dark-600 flex-shrink-0 tabular-nums">{new Date(h.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <EditTicketModal ticket={ticket} onSave={() => { setEditing(false); fetchTicket(); }} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}
