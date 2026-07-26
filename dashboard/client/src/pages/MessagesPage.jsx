import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import EmbedBuilder from '../components/EmbedBuilder.jsx';
import {
  Hash, Send, Pencil, Trash2, Check, X, ChevronDown,
  MessageSquare, Image as ImageIcon, Loader2, AlertTriangle,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';

function MessageBubble({ msg, channelId, botId, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const [editingEmbed, setEditingEmbed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const isBotMessage = botId && msg.author?.id === botId;

  const avatar = msg.author?.avatar
    ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(msg.author?.discriminator || msg.author?.id || '0') % 5}.png`;

  const time = new Date(msg.timestamp);
  const timestamp = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' at ' + time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const handleSave = async () => {
    try {
      await api.editMessage(channelId, msg.id, editContent);
      onEdit(msg.id, editContent);
      setEditing(false);
      toast('Message edited', 'success');
    } catch (err) {
      toast(err.message || 'Failed to edit message', 'error');
    }
  };

  const handleEmbedSave = async (embed) => {
    try {
      await api.editMessage(channelId, msg.id, editContent || '', embed);
      onEdit(msg.id, editContent, embed);
      setEditingEmbed(false);
      toast('Embed updated', 'success');
    } catch (err) {
      toast(err.message || 'Failed to edit embed', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteMessage(channelId, msg.id);
      onDelete(msg.id);
      toast('Message deleted', 'success');
    } catch (err) {
      toast(err.message || 'Failed to delete message', 'error');
    }
    setDeleting(false);
  };

  return (
    <div className="group flex gap-3 px-4 py-2 hover:bg-dark-700/10 transition-colors animate-fade-in">
      <img src={avatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-dark-100">
            {msg.author?.global_name || msg.author?.username || 'Unknown'}
          </span>
          <span className="text-xs text-dark-500">{timestamp}</span>
          <span className="text-[10px] text-dark-600 font-mono ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            {msg.id}
          </span>
        </div>

        {editing ? (
          <div className="mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="input-dark text-sm min-h-[60px] resize-y"
              autoFocus
            />
            <div className="flex items-center gap-2 mt-1.5">
              <button onClick={handleSave} className="btn-primary text-xs px-3 py-1 flex items-center gap-1">
                <Check className="w-3 h-3" /> Save
              </button>
              <button onClick={() => { setEditing(false); setEditContent(msg.content); }} className="btn-ghost text-xs px-3 py-1 flex items-center gap-1">
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          </div>
        ) : editingEmbed ? (
          <div className="mt-1">
            <EmbedBuilder
              embed={msg.embeds?.[0]}
              onSend={handleEmbedSave}
              onClose={() => setEditingEmbed(false)}
            />
          </div>
        ) : (
          <>
            {msg.content && <p className="text-sm text-dark-300 whitespace-pre-wrap break-words">{msg.content}</p>}
            {msg.embeds?.map((embed, i) => (
              <div key={i} className="mt-1 rounded-xl border-l-4 border-ice-300 bg-dark-900/40 p-3 max-w-lg">
                {embed.title && <p className="text-sm font-bold text-dark-100">{embed.title}</p>}
                {embed.description && <p className="text-xs text-dark-300 mt-1 whitespace-pre-wrap">{embed.description}</p>}
                {embed.fields && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {embed.fields.map((f, fi) => (
                      <div key={fi} className={f.inline ? '' : 'col-span-2'}>
                        <p className="text-xs font-semibold text-dark-200">{f.name}</p>
                        <p className="text-xs text-dark-400">{f.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {embed.image && <img src={embed.image.url} alt="" className="mt-2 rounded-lg max-w-xs" />}
              </div>
            ))}
          </>
        )}

        {msg.edited_timestamp && !editing && (
          <span className="text-[10px] text-dark-600">(edited)</span>
        )}
      </div>

      {!editing && !editingEmbed && isBotMessage && (
        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
          {msg.embeds?.length > 0 ? (
            <button onClick={() => setEditingEmbed(true)} className="p-1.5 rounded-lg hover:bg-dark-700/50 text-dark-500 hover:text-ice-300 transition-colors" title="Edit embed">
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          ) : null}
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-dark-700/50 text-dark-500 hover:text-ice-300 transition-colors" title="Edit message">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setDeleting(true)} className="p-1.5 rounded-lg hover:bg-dark-700/50 text-dark-500 hover:text-red-400 transition-colors" title="Delete message">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {deleting && (
        <Modal onClose={() => setDeleting(false)} maxWidth="max-w-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-dark-100">Delete Message</p>
              <p className="text-xs text-dark-400">This cannot be undone.</p>
            </div>
          </div>
          <p className="text-xs text-dark-400 bg-dark-900/50 rounded-xl p-3 border border-dark-700/30 line-clamp-3">
            {msg.content || '(embed message)'}
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleting(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={handleDelete} className="btn-danger text-sm">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function MessagesPage() {
  const { toast } = useToast();
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmbedBuilder, setShowEmbedBuilder] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [botId, setBotId] = useState(null);
  const messagesEndRef = useRef(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [chData, overviewData] = await Promise.all([
          api.getChannels(),
          api.getOverview().catch(() => null),
        ]);
        if (!cancelled) {
          setChannels((chData.channels || []).filter((c) => c.type === 0));
          setBotId(overviewData?.bot?.id || null);
        }
      } catch {
        if (!cancelled) toast('Failed to load channels', 'error');
      }
      if (!cancelled) setLoadingChannels(false);
    })();
    return () => { cancelled = true; };
  }, [toast]);

  const loadMessages = useCallback(async (channelId) => {
    if (!channelId) return;
    const id = ++fetchIdRef.current;
    setLoading(true);
    setMessages([]);
    try {
      const data = await api.getMessages(channelId, 50);
      if (id === fetchIdRef.current) setMessages(data.messages || []);
    } catch {
      if (id === fetchIdRef.current) toast('Failed to load messages', 'error');
    }
    if (id === fetchIdRef.current) setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (selectedChannel) loadMessages(selectedChannel);
  }, [selectedChannel, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content, embed) => {
    if (!content && !embed) return;
    setSending(true);
    try {
      const data = await api.sendMessage(selectedChannel, content, embed || undefined);
      setMessages((prev) => [...prev, data.message]);
      setNewMessage('');
      setShowEmbedBuilder(false);
      toast('Message sent', 'success');
    } catch (err) {
      toast('Failed to send message', 'error');
    }
    setSending(false);
  };

  const handleEditMessage = (messageId, newContent, newEmbed) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const updated = { ...m, edited_timestamp: new Date().toISOString() };
        if (newContent !== undefined) updated.content = newContent;
        if (newEmbed !== undefined) updated.embeds = [newEmbed];
        return updated;
      })
    );
  };

  const handleDeleteMessage = (messageId) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const selected = channels.find((c) => c.id === selectedChannel);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Messages"
        subtitle="View and manage channel messages"
      />

      <div className="glass p-4 flex items-center gap-3">
        <Hash className="w-5 h-5 text-dark-500" />
        <select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className="input-dark w-auto min-w-[250px]"
          disabled={loadingChannels}
          aria-label="Select a channel"
        >
          <option value="">
            {loadingChannels ? 'Loading channels...' : 'Select a channel'}
          </option>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}># {ch.name}</option>
          ))}
        </select>
        {selectedChannel && (
          <button onClick={() => loadMessages(selectedChannel)} className="btn-ghost text-sm flex items-center gap-2 ml-auto">
            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        )}
      </div>

      {selectedChannel && (
        <div className="glass overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
          <div className="px-4 py-3 border-b border-dark-700/50 flex items-center gap-2">
            <Hash className="w-4 h-4 text-ice-300" />
            <span className="text-sm font-semibold text-dark-200">{selected?.name}</span>
            <span className="text-xs text-dark-500 ml-1">{messages.length} message(s)</span>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 text-dark-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No messages in this channel</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-700/20">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    channelId={selectedChannel}
                    botId={botId}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {showEmbedBuilder ? (
            <div className="p-4 border-t border-dark-700/50">
              <EmbedBuilder
                onSend={(embed) => handleSendMessage('', embed)}
                onClose={() => setShowEmbedBuilder(false)}
              />
            </div>
          ) : (
            <div className="p-4 border-t border-dark-700/50">
              <div className="flex items-end gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(newMessage);
                    }
                  }}
                  placeholder={`Message #${selected?.name || ''}`}
                  className="input-dark text-sm min-h-[40px] max-h-[120px] resize-y flex-1"
                  disabled={sending}
                />
                <button onClick={() => handleSendMessage(newMessage)} disabled={sending || !newMessage.trim()} className="btn-primary px-3 py-2.5 disabled:opacity-30">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setShowEmbedBuilder(true)}
                className="mt-2 btn-ghost text-xs flex items-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Send Embed
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
