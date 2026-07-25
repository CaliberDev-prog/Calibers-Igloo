import { useAuth } from '../lib/auth.jsx';
import { Snowflake } from 'lucide-react';
import { useState } from 'react';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) {
    window.location.href = '/dashboard';
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setSubmitting(false);
        return;
      }

      window.location.href = '/dashboard';
    } catch {
      setError('Connection failed');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-ice-300/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-ice-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 glass p-12 max-w-md w-full mx-4 text-center animate-slide-up">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-ice-300 to-ice-500 flex items-center justify-center glow-border">
          <Snowflake className="w-10 h-10 text-dark-950" />
        </div>

        <h1 className="text-2xl font-bold text-dark-100 mb-2">Caliber's Igloo</h1>
        <p className="text-dark-400 text-sm mb-8">Bot Dashboard & Control Panel</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700/50 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:border-ice-400/50 transition-colors"
            autoFocus
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700/50 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:border-ice-400/50 transition-colors"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-6 bg-gradient-to-r from-ice-400 to-ice-500 hover:from-ice-300 hover:to-ice-400 text-dark-950 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-dark-600 text-xs mt-6">Authorized personnel only. All actions are logged.</p>
      </div>
    </div>
  );
}
