import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { ToastProvider } from './components/Toast.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const TicketsPage = lazy(() => import('./pages/TicketsPage.jsx'));
const TicketDetailPage = lazy(() => import('./pages/TicketDetailPage.jsx'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'));
const BlacklistsPage = lazy(() => import('./pages/BlacklistsPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const HealthPage = lazy(() => import('./pages/HealthPage.jsx'));
const MessagesPage = lazy(() => import('./pages/MessagesPage.jsx'));
const ServerPage = lazy(() => import('./pages/ServerPage.jsx'));
const TerminalPage = lazy(() => import('./pages/TerminalPage.jsx'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage.jsx'));
const UsersPage = lazy(() => import('./pages/UsersPage.jsx'));
const TranscriptsPage = lazy(() => import('./pages/TranscriptsPage.jsx'));
const VerificationPage = lazy(() => import('./pages/VerificationPage.jsx'));
const GiveawaysPage = lazy(() => import('./pages/GiveawaysPage.jsx'));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
        <p className="text-dark-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
}

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Suspense fallback={<LoadingScreen />}><LoginPage /></Suspense>} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="tickets" element={<TicketsPage />} />
              <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="blacklists" element={<BlacklistsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="health" element={<HealthPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="server" element={<ServerPage />} />
              <Route path="terminal" element={<TerminalPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="transcripts" element={<TranscriptsPage />} />
              <Route path="verification" element={<VerificationPage />} />
              <Route path="giveaways" element={<GiveawaysPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}
