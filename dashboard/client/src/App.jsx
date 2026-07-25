import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { ToastProvider } from './components/Toast.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TicketsPage from './pages/TicketsPage.jsx';
import TicketDetailPage from './pages/TicketDetailPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import BlacklistsPage from './pages/BlacklistsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import HealthPage from './pages/HealthPage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';
import ServerPage from './pages/ServerPage.jsx';
import TerminalPage from './pages/TerminalPage.jsx';
import AuditLogsPage from './pages/AuditLogsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;
  return children;
}

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

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
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
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
