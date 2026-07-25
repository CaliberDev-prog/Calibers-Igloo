import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { ArrowLeft, User, Clock, MessageSquare, Hash, Copy, Check } from 'lucide-react';

const DEPTS = {
  general: { name: 'General Support', emoji: '🛟' },
  reports: { name: 'Reports', emoji: '🚨' },
  hiring: { name: 'Hiring', emoji: '💼' },
};

export default function TicketDetailPage() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getTicket(ticketId);
        setTicket(data.ticket);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    })();
  }, [ticketId]);

  const copyId = () => {
    navigator.clipboard.writeText(ticket?.creatorId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-dark-500">Ticket not found</p>
        <Link to="/tickets" className="text-ice-300 text-sm mt-2 inline-block">Back to tickets</Link>
      </div>
    );
  }

  const dept = DEPTS[ticket.departmentId];
  const statusColors = {
    open: 'bg-green-400/10 text-green-400 border-green-400/20',
    closed: 'bg-red-400/10 text-red-400 border-red-400/20',
    deleted: 'bg-dark-500/10 text-dark-500 border-dark-500/20',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/tickets" className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-dark-100">#{String(ticket.ticketId).padStart(4, '0')}</h1>
            <span className={`text-xs px-3 py-1 rounded-full border ${statusColors[ticket.status] || statusColors.open}`}>
              {ticket.status}
            </span>
          </div>
          <p className="text-dark-400 text-sm mt-1">{dept?.emoji} {dept?.name || ticket.departmentId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <User className="w-5 h-5 text-ice-300 mb-1" />
          <p className="text-xs text-dark-500">Creator</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-dark-200 font-medium truncate">{ticket.creatorTag || ticket.creatorId}</p>
            <button onClick={copyId} className="text-dark-500 hover:text-dark-300 transition-colors">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
        <div className="stat-card">
          <Hash className="w-5 h-5 text-ice-300 mb-1" />
          <p className="text-xs text-dark-500">Channel ID</p>
          <p className="text-sm text-dark-200 font-mono">{ticket.channelId || 'N/A'}</p>
        </div>
        <div className="stat-card">
          <Clock className="w-5 h-5 text-ice-300 mb-1" />
          <p className="text-xs text-dark-500">Created</p>
          <p className="text-sm text-dark-200">{new Date(ticket.createdAt).toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <MessageSquare className="w-5 h-5 text-ice-300 mb-1" />
          <p className="text-xs text-dark-500">Messages</p>
          <p className="text-sm text-dark-200">{(ticket.staffMessageCount || 0) + (ticket.userMessageCount || 0)}</p>
        </div>
      </div>

      {ticket.answers && ticket.answers.length > 0 && (
        <div className="glass p-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-dark-200 mb-4">Submitted Answers</h3>
          <div className="space-y-3">
            {ticket.answers.map((a, i) => (
              <div key={i} className="bg-dark-900/40 rounded-xl p-4 border border-dark-700/30">
                <p className="text-xs text-dark-500 mb-1">{a.question || a.questionId}</p>
                <p className="text-sm text-dark-200 whitespace-pre-wrap">{a.answer || '*No answer*'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {ticket.participants && ticket.participants.length > 0 && (
        <div className="glass p-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-dark-200 mb-3">Participants</h3>
          <div className="flex flex-wrap gap-2">
            {ticket.participants.map((p, i) => (
              <span key={i} className="text-xs bg-dark-800/50 border border-dark-700/30 rounded-full px-3 py-1 text-dark-300">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {ticket.claimedBy && (
        <div className="glass p-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-dark-200 mb-2">Claimed By</h3>
          <p className="text-sm text-dark-300">{ticket.claimedBy}</p>
        </div>
      )}

      {ticket.history && ticket.history.length > 0 && (
        <div className="glass p-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-dark-200 mb-4">History</h3>
          <div className="space-y-2">
            {ticket.history.slice().reverse().map((h, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-dark-700/20 last:border-0">
                <div className="w-2 h-2 rounded-full bg-ice-300/40 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-300">
                    <span className="text-dark-200 font-medium">{h.action?.replace(/_/g, ' ')}</span>
                    {h.performedBy && <span className="text-dark-500"> by {h.performedBy}</span>}
                  </p>
                  {h.oldValue && h.newValue && (
                    <p className="text-xs text-dark-500">{h.oldValue} &rarr; {h.newValue}</p>
                  )}
                </div>
                <span className="text-xs text-dark-600 flex-shrink-0">
                  {new Date(h.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
