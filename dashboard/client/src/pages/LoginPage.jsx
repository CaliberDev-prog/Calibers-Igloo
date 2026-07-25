import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../components/Toast.jsx';
import { useNavigate } from 'react-router-dom';
import { Snowflake } from 'lucide-react';
import { useState } from 'react';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = await login(username, password);
      if (data.error) {
        setError(data.error);
      } else {
        navigate('/dashboard');
      }
    } catch {
      setError('Connection failed');
    }
    setSubmitting(false);
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
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-dark"
            autoFocus
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
            className="input-dark"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-6 bg-gradient-to-r from-ice-400 to-ice-500 hover:from-ice-300 hover:to-ice-400 text-dark-950 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin" />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <p className="text-dark-600 text-xs mt-6">Authorized personnel only. All actions are logged.</p>
      </div>
    </div>
  );
}
