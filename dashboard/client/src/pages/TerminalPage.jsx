import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../lib/api.js';
import { Terminal, Play, Clock, Trash2, Zap, AlertTriangle, Hash, ChevronDown } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';

const QUICK_COMMANDS = [
  { label: '!help', command: '!help', args: '' },
  { label: '!purge 100', command: '!purge', args: '100' },
  { label: '!slowmode 0', command: '!slowmode', args: '0' },
  { label: '!botalerts enable', command: '!botalerts', args: 'enable' },
  { label: '!botalerts disable', command: '!botalerts', args: 'disable' },
  { label: '!prefix !', command: '!prefix', args: '!' },
];

const MAX_HISTORY = 50;

export default function TerminalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [loadingChannels, setLoadingChannels] = useState(true);

  const isOwner = user?.role === 'owner';

  useEffect(() => {
    if (!isOwner) return;
    (async () => {
      try {
        const data = await api.getChannels();
        setChannels((data.channels || []).filter((c) => c.type === 0));
      } catch {
        toast('Failed to load channels', 'error');
      }
      setLoadingChannels(false);
    })();
  }, [isOwner]);

  const handleQuickCommand = (cmd) => {
    setInput(`${cmd.command} ${cmd.args}`.trim());
  };

  const handleExecute = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || !selectedChannel) return;

    setLoading(true);
    try {
      const result = await api.sendMessage(selectedChannel, trimmed);
      setHistory((prev) => {
        const next = [
          {
            id: Date.now(),
            command: trimmed,
            channelId: selectedChannel,
            channelName: channels.find((c) => c.id === selectedChannel)?.name || selectedChannel,
            timestamp: new Date().toLocaleTimeString(),
            result: result?.message?.id ? `Message sent (ID: ${result.message.id})` : 'Command sent.',
            status: 'success',
          },
          ...prev,
        ];
        return next.slice(0, MAX_HISTORY);
      });
      toast('Command sent to channel', 'success');
    } catch (err) {
      setHistory((prev) => {
        const next = [
          {
            id: Date.now(),
            command: trimmed,
            channelId: selectedChannel,
            channelName: channels.find((c) => c.id === selectedChannel)?.name || selectedChannel,
            timestamp: new Date().toLocaleTimeString(),
            result: err.message || 'Command failed.',
            status: 'error',
          },
          ...prev,
        ];
        return next.slice(0, MAX_HISTORY);
      });
      toast('Failed to send command', 'error');
    }
    setLoading(false);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecute();
    }
  };

  const clearHistory = () => {
    setHistory([]);
    toast('History cleared', 'info');
  };

  if (!isOwner) {
    return (
      <div className="flex items-center justify-center py-20 animate-fade-in">
        <div className="glass p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-dark-100 mb-3">Owner Only</h1>
          <p className="text-dark-400 text-sm">
            The Command Terminal is restricted to the bot owner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Command Terminal"
        subtitle="Send bot commands as messages in a channel"
      />

      <div className="glass p-4 flex items-center gap-3">
        <Hash className="w-5 h-5 text-dark-500 flex-shrink-0" />
        <span className="text-sm text-dark-400 flex-shrink-0">Target Channel</span>
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
          <span className="text-xs text-green-400 flex items-center gap-1 ml-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Ready
          </span>
        )}
      </div>

      <div className="glass p-5 space-y-3">
        <h2 className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-ice-300" />
          Quick Commands
        </h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd.label}
              onClick={() => handleQuickCommand(cmd)}
              className="bg-ice-300/10 text-ice-300 border border-ice-300/20 hover:bg-ice-300/20 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200"
            >
              {cmd.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass p-5 space-y-3">
        <h2 className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Execute Command</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={!selectedChannel ? 'Select a channel first...' : 'Type a command... (e.g. !help, !purge 100)'}
            className="input-dark flex-1 font-mono text-sm"
            disabled={!selectedChannel}
          />
          <button
            onClick={handleExecute}
            disabled={!input.trim() || loading || !selectedChannel}
            className="btn-primary flex items-center gap-2 disabled:opacity-40"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {loading ? 'Running...' : 'Execute'}
          </button>
        </div>
        {!selectedChannel && (
          <p className="text-xs text-yellow-400/70">Select a channel above to run commands</p>
        )}
      </div>

      <div className="glass p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-ice-300" />
            Command History
            {history.length > 0 && (
              <span className="text-[10px] bg-dark-800 text-dark-400 rounded-lg px-2 py-0.5">{history.length}</span>
            )}
          </h2>
          {history.length > 0 && (
            <button onClick={clearHistory} className="btn-ghost text-xs text-dark-400 hover:text-red-400 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12">
            <Terminal className="w-10 h-10 text-dark-600 mx-auto mb-3" />
            <p className="text-dark-500 text-sm">No commands executed yet.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {history.map((entry) => (
              <div key={entry.id} className="bg-dark-900/50 border border-dark-700/30 rounded-xl p-4 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-ice-300 font-medium">{entry.command}</span>
                    <span className="text-[10px] text-dark-600 bg-dark-800/80 rounded-lg px-2 py-0.5 flex items-center gap-1">
                      <Hash className="w-2.5 h-2.5" /> {entry.channelName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-lg ${entry.status === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {entry.status === 'success' ? 'Sent' : 'Error'}
                    </span>
                    <span className="text-xs text-dark-500">{entry.timestamp}</span>
                  </div>
                </div>
                <p className={`text-sm font-mono ${entry.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {entry.result}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
