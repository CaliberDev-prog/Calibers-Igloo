import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import CommandPalette from './CommandPalette.jsx';
import { AnimatePresence, motion } from 'framer-motion';

const PAGE_TITLES = {
  '/dashboard': 'Overview',
  '/tickets': 'Tickets',
  '/messages': 'Messages',
  '/server': 'Server',
  '/analytics': 'Analytics',
  '/blacklists': 'Blacklists',
  '/transcripts': 'Transcripts',
  '/verification': 'Verification',
  '/giveaways': 'Giveaways',
  '/audit-logs': 'Audit Logs',
  '/terminal': 'Terminal',
  '/users': 'Users',
  '/health': 'System Health',
  '/settings': 'Settings',
};

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const location = useLocation();

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const handleSidebarResize = useCallback((width) => {
    setSidebarWidth(width);
  }, []);

  const getBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    const crumbs = [{ label: 'Home', path: '/dashboard' }];

    if (parts[0] === 'tickets' && parts[1]) {
      crumbs.push({ label: 'Tickets', path: '/tickets' });
      crumbs.push({ label: `#${parts[1].padStart(4, '0')}`, path: location.pathname });
    } else if (parts[0]) {
      const label = PAGE_TITLES[`/${parts[0]}`] || parts[0];
      crumbs.push({ label, path: location.pathname });
    }

    return crumbs;
  };

  const crumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-50 transition-transform duration-300 ease-out`}>
        <Sidebar collapsed={false} onResize={handleSidebarResize} />
      </div>

      <main
        className="flex-1 min-h-screen overflow-auto"
        style={{ marginLeft: typeof window !== 'undefined' && window.innerWidth >= 768 ? sidebarWidth : 0 }}
      >
        <div className="md:hidden sticky top-0 z-30 px-4 py-3 bg-dark-950/80 backdrop-blur-xl border-b border-dark-700/30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 glass rounded-xl text-dark-300 hover:text-ice-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="p-4 md:p-8 lg:p-10">
          {crumbs.length > 1 && (
            <nav className="flex items-center gap-1.5 text-xs text-dark-500 mb-6 animate-fade-in">
              {crumbs.map((crumb, i) => (
                <span key={crumb.path} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-dark-700">/</span>}
                  <span className={i === crumbs.length - 1 ? 'text-dark-300 font-medium' : 'hover:text-dark-300 transition-colors cursor-default'}>
                    {crumb.label}
                  </span>
                </span>
              ))}
            </nav>
          )}

          <div className="max-w-[1400px] mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      <CommandPalette />
    </div>
  );
}
