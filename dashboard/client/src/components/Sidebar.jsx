import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import {
  LayoutDashboard, Ticket, BarChart3, Shield, Settings,
  Activity, LogOut, Snowflake, ChevronLeft, ChevronRight,
  MessageSquare, Server, Terminal, FileText, Users, Hash,
  FileSearch, Lock, Gift,
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/tickets', icon: Ticket, label: 'Tickets' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/server', icon: Server, label: 'Server' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/blacklists', icon: Shield, label: 'Blacklists' },
  { to: '/transcripts', icon: FileSearch, label: 'Transcripts' },
  { to: '/verification', icon: Lock, label: 'Verification' },
  { to: '/giveaways', icon: Gift, label: 'Giveaways' },
  { to: '/audit-logs', icon: FileText, label: 'Audit Logs' },
  { to: '/terminal', icon: Terminal, label: 'Terminal', ownerOnly: true },
  { to: '/users', icon: Users, label: 'Users', ownerOnly: true },
  { to: '/health', icon: Activity, label: 'System' },
  { to: '/settings', icon: Settings, label: 'Settings' },
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
  const visibleNav = NAV.filter((n) => !n.ownerOnly || user?.role === 'owner');

  return (
    <aside className={`fixed left-0 top-0 h-full ${collapsed ? 'w-[72px]' : 'w-64'} bg-dark-900/80 backdrop-blur-xl border-r border-dark-700/50 flex flex-col z-50 transition-all duration-300`}>
      <div className={`p-4 border-b border-dark-700/50 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ice-300 to-ice-500 flex items-center justify-center flex-shrink-0">
          <Snowflake className="w-5 h-5 text-dark-950" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-dark-100 truncate">Caliber's Igloo</h1>
            <p className="text-xs text-dark-500 truncate">Dashboard</p>
          </div>
        )}
      </div>

      <div className={`px-3 pt-3 pb-1 ${collapsed ? 'hidden' : ''}`}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-800/40 border border-dark-700/30 text-dark-500 hover:text-dark-300 hover:border-dark-600/50 transition-all text-xs"
        >
          <Hash className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[9px] px-1 py-0.5 rounded bg-dark-700/50 border border-dark-600/30">⌘K</kbd>
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {visibleNav.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                ${active
                  ? 'bg-ice-300/10 text-ice-300 border border-ice-300/20'
                  : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/50 border border-transparent'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-2 border-t border-dark-700/50 space-y-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-dark-500 hover:text-dark-300 hover:bg-dark-800/50 transition-all text-xs"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>

        {user && (
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-2 rounded-xl bg-dark-800/30`}>
            <img
              src={`https://cdn.discordapp.com/embed/avatars/${avatarIdx}.png`}
              alt=""
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-dark-200 truncate">{user.username}</p>
                <p className="text-xs text-dark-500">{user.role === 'owner' ? 'Owner' : 'Staff'}</p>
              </div>
            )}
            {!collapsed && (
              <button onClick={logout} className="text-dark-500 hover:text-red-400 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
