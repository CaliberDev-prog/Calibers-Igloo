import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import {
  Download, FileText, User, Clock, MessageSquare, CheckCircle2,
} from 'lucide-react';

const DEPTS = {
  general: { name: 'General Support', emoji: '🛟' },
  reports: { name: 'Reports', emoji: '🚨' },
  hiring: { name: 'Hiring', emoji: '💼' },
};

const ACTION_LABELS = {
  ticket_opened: 'Ticket Created',
  ticket_closed: 'Ticket Closed',
  ticket_reopened: 'Ticket Reopened',
  ticket_deleted: 'Ticket Deleted',
  ticket_claimed: 'Ticket Claimed',
  ticket_unclaimed: 'Ticket Unclaimed',
  ticket_locked: 'Ticket Locked',
  ticket_unlocked: 'Ticket Unlocked',
  department_moved: 'Department Changed',
  user_added: 'Participant Added',
  user_removed: 'Participant Removed',
  close_requested: 'Close Requested',
  alert_sent: 'Alert Sent',
  role_pinged: 'Support Pinged',
  messages_purged: 'Messages Purged',
  channel_renamed: 'Channel Renamed',
};

function fmtDate(d) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtDur(ms) {
  if (!ms || ms < 0) return 'N/A';
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export default function TranscriptViewerModal({ ticketId, onClose }) {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await api.getTranscript(ticketId);
        if (!cancelled) setData(result);
      } catch (err) {
        toast(err.message || 'Failed to load transcript', 'error');
        if (!cancelled) onClose();
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ticketId, toast, onClose]);

  const downloadUrl = api.downloadTranscript(ticketId);
  const t = data?.ticket;
  const dept = t ? DEPTS[t.departmentId] : null;
  const duration = t?.createdAt && t?.closedAt ? new Date(t.closedAt) - new Date(t.createdAt) : null;

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-0">
        {/* Header */}
        <div className="flex items-center justify-between -mx-6 -mt-6 px-6 py-4 border-b border-dark-700/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ice-300/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-ice-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-dark-100">
                Transcript #{t ? String(t.ticketId).padStart(4, '0') : '...'}
              </p>
              <p className="text-xs text-dark-400">
                {dept ? `${dept.emoji} ${dept.name}` : t?.departmentId || 'Loading...'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-dark-700/50 text-dark-500 hover:text-dark-200 transition-colors" aria-label="Close">
            &times;
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <div className="py-16 text-center text-dark-500 text-sm">Failed to load transcript.</div>
        ) : (
          <>
            {/* Ticket Info */}
            <div className="px-6 py-4 border-b border-dark-700/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoItem icon={User} label="Opened By" value={t.creatorTag || t.creatorId} />
                <InfoItem icon={User} label="Closed By" value={t.closedBy || 'System'} />
                <InfoItem icon={Clock} label="Created" value={fmtDate(t.createdAt)} />
                <InfoItem icon={Clock} label="Closed" value={fmtDate(t.closedAt)} />
                <InfoItem icon={Clock} label="Duration" value={fmtDur(duration)} />
                <InfoItem icon={CheckCircle2} label="Reason" value={t.closeReason || 'No reason'} />
              </div>
            </div>

            {/* Message Stats */}
            <div className="px-6 py-3 border-b border-dark-700/20 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-dark-500" />
                <span className="text-xs text-dark-400">{(t.staffMessageCount || 0) + (t.userMessageCount || 0)} total messages</span>
              </div>
              <span className="text-xs text-dark-500">{t.staffMessageCount || 0} staff</span>
              <span className="text-xs text-dark-500">{t.userMessageCount || 0} user</span>
            </div>

            {/* Answers */}
            {data.answers && data.answers.length > 0 && (
              <div className="px-6 py-4 border-b border-dark-700/20">
                <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">Submitted Answers</p>
                <div className="space-y-2">
                  {data.answers.map((a, i) => (
                    <div key={i} className="bg-dark-900/50 rounded-xl p-3 border border-dark-700/20">
                      <p className="text-[10px] text-ice-300/70 uppercase tracking-wider mb-1">{a.question || a.questionId}</p>
                      <p className="text-sm text-dark-300">{a.answer || 'No answer'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {data.history && data.history.length > 0 && (
              <div className="px-6 py-4 border-b border-dark-700/20">
                <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">Activity History</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {data.history.filter(h => h.action !== 'message_recorded').map((h, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs py-1.5">
                      <span className="text-dark-600 min-w-[70px]">{fmtDate(h.timestamp)}</span>
                      <span className="text-dark-300 font-medium min-w-[120px]">{ACTION_LABELS[h.action] || h.action}</span>
                      <span className="text-dark-500">{h.performedBy || ''}</span>
                      {h.reason && <span className="text-dark-600 italic">({h.reason})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-6 py-4 flex items-center justify-between">
              <p className="text-xs text-dark-600">
                Generated by {data.transcript?.generatedBy || 'Unknown'} on {fmtDate(data.transcript?.generatedAt)}
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download HTML
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3 h-3 text-dark-600" />
        <span className="text-[10px] text-dark-600 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xs text-dark-300 truncate" title={value}>{value}</p>
    </div>
  );
}
