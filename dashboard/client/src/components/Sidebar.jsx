import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import {
  LayoutDashboard, Ticket, BarChart3, Shield, Settings,
  Activity, LogOut, Snowflake, ChevronLeft, ChevronRight,
  MessageSquare, Server, Terminal, FileText, Users, Hash,
  FileSearch, Lock, Gift,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    ],
  },
  {
    label: 'Support',
    items: [
      { to: '/tickets', icon: Ticket, label: 'Tickets' },
      { to: '/transcripts', icon: FileSearch, label: 'Transcripts' },
      { to: '/blacklists', icon: Shield, label: 'Blacklists' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { to: '/messages', icon: MessageSquare, label: 'Messages' },
      { to: '/verification', icon: Lock, label: 'Verification' },
      { to: '/giveaways', icon: Gift, label: 'Giveaways' },
    ],
  },
  {
    label: 'Server',
    items: [
      { to: '/server', icon: Server, label: 'Server' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/audit-logs', icon: FileText, label: 'Audit Logs' },
      { to: '/terminal', icon: Terminal, label: 'Terminal', ownerOnly: true },
      { to: '/users', icon: Users, label: 'Users', ownerOnly: true },
      { to: '/health', icon: Activity, label: 'System' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const avatarIdx = user ? hashCode(user.username || user.id || '') % 5 : 0;

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((n) => !n.ownerOnly || user?.role === 'owner'),
  })).filter((section) => section.items.length > 0);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setCollapsed(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidth = collapsed ? 72 : 256;

  return (
    <aside
      className="fixed left-0 top-0 h-full bg-dark-900/90 backdrop-blur-xl border-r border-dark-700/40 flex flex-col z-50 transition-all duration-300 ease-out"
      style={{ width: sidebarWidth }}
    >
      <div className={`p-4 border-b border-dark-700/30 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ice-300 to-ice-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-ice-300/10">
          <Snowflake className="w-5 h-5 text-dark-950" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-dark-100 truncate tracking-tight">Caliber's Igloo</h1>
            <p className="text-[11px] text-dark-500 truncate">Dashboard</p>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-dark-800/30 border border-dark-700/20 text-dark-500 hover:text-dark-300 hover:border-dark-600/40 hover:bg-dark-800/50 transition-all duration-200 text-xs"
          >
            <Hash className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-[9px] px-1.5 py-0.5 rounded-md bg-dark-700/40 border border-dark-600/20 text-dark-600">⌘K</kbd>
          </button>
        </div>
      )}

      <nav className="flex-1 p-2 space-y-4 overflow-y-auto py-3">
        {visibleSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-dark-600 uppercase tracking-widest">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label }) => {
                const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
                return (
                  <NavLink
                    key={to}
                    to={to}
                    className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 group
                      ${collapsed ? 'justify-center' : ''}
                      ${active
                        ? 'bg-ice-300/10 text-ice-300'
                        : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/40'
                      }
                    `}
                    title={collapsed ? label : undefined}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-ice-300" />
                    )}
                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200 ${active ? '' : 'group-hover:scale-105'}`} />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-2 border-t border-dark-700/30 space-y-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-dark-500 hover:text-dark-300 hover:bg-dark-800/40 transition-all duration-200 text-xs"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>

        {user && (
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-2.5 rounded-xl bg-dark-800/20 border border-dark-700/20`}>
            <img
              src={`https://cdn.discordapp.com/embed/avatars/${avatarIdx}.png`}
              alt=""
              className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-dark-700/30"
            />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-dark-200 truncate">{user.username}</p>
                <p className="text-[10px] text-dark-500 capitalize">{user.role}</p>
              </div>
            )}
            {!collapsed && (
              <button onClick={logout} className="text-dark-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-dark-700/30">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
