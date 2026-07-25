import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Ticket, MessageSquare, Server, BarChart3, Shield,
  Settings, Activity, Terminal, Hash, Users, X,
} from 'lucide-react';

const PAGES = [
  { path: '/dashboard', label: 'Overview', icon: 'LayoutDashboard', keywords: 'home main command center' },
  { path: '/tickets', label: 'Tickets', icon: 'Ticket', keywords: 'support help desk' },
  { path: '/messages', label: 'Messages', icon: 'MessageSquare', keywords: 'chat embed send' },
  { path: '/server', label: 'Server Explorer', icon: 'Server', keywords: 'channels roles guild' },
  { path: '/analytics', label: 'Analytics', icon: 'BarChart3', keywords: 'stats charts graphs' },
  { path: '/blacklists', label: 'Blacklists', icon: 'Shield', keywords: 'banned blocked' },
  { path: '/terminal', label: 'Terminal', icon: 'Terminal', keywords: 'commands exec run owner' },
  { path: '/health', label: 'System Health', icon: 'Activity', keywords: 'status memory cpu' },
  { path: '/settings', label: 'Settings', icon: 'Settings', keywords: 'config preferences' },
  { path: '/audit-logs', label: 'Audit Logs', icon: 'Hash', keywords: 'history actions log' },
  { path: '/users', label: 'Dashboard Users', icon: 'Users', keywords: 'accounts staff members' },
];

const ICON_MAP = {
  LayoutDashboard: 'LayoutDashboard', Ticket: 'Ticket', MessageSquare: 'MessageSquare',
  Server: 'Server', BarChart3: 'BarChart3', Shield: 'Shield', Terminal: 'Terminal',
  Activity: 'Activity', Settings: 'Settings', Hash: 'Hash', Users: 'Users',
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const onCustomOpen = () => setOpen(true);
    window.addEventListener('keydown', handler);
    window.addEventListener('open-command-palette', onCustomOpen);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('open-command-palette', onCustomOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return PAGES;
    const q = query.toLowerCase();
    return PAGES.filter(
      (p) => p.label.toLowerCase().includes(q) || p.keywords.includes(q) || p.path.includes(q)
    );
  }, [query]);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const execute = (page) => {
    navigate(page.path);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      execute(filtered[selectedIdx]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg mx-4 glass border border-dark-700/50 rounded-2xl overflow-hidden animate-fade-in"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-700/50">
          <Search className="w-5 h-5 text-dark-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages and commands..."
            className="flex-1 bg-transparent text-dark-200 text-sm outline-none placeholder-dark-500"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-dark-800/50 text-dark-500 text-[10px] border border-dark-700/30">
            ESC
          </kbd>
        </div>

        <div className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-dark-500 text-sm">
              No results for "{query}"
            </div>
          ) : (
            filtered.map((page, i) => {
              const IconComp = require('lucide-react')[page.icon];
              return (
                <button
                  key={page.path}
                  onClick={() => execute(page)}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selectedIdx ? 'bg-ice-300/10 text-ice-300' : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200'
                  }`}
                >
                  {IconComp && <IconComp className="w-4 h-4 flex-shrink-0" />}
                  <span className="text-sm font-medium">{page.label}</span>
                  <span className="text-xs text-dark-600 ml-auto font-mono">{page.path}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-dark-700/50 flex items-center gap-4 text-[10px] text-dark-600">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-dark-800/50 border border-dark-700/30">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-dark-800/50 border border-dark-700/30">↵</kbd> select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-dark-800/50 border border-dark-700/30">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
