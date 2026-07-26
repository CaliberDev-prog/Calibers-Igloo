import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../components/Toast.jsx';
import { useNavigate } from 'react-router-dom';
import { Snowflake } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Username and password are required');
      return;
    }
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
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-ice-300/[0.03] rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-ice-500/[0.03] rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 glass p-10 max-w-[400px] w-full mx-4 text-center animate-slide-up glow-border">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-ice-300 to-ice-500 flex items-center justify-center shadow-lg shadow-ice-300/20">
          <Snowflake className="w-8 h-8 text-dark-950" />
        </div>

        <h1 className="text-xl font-bold text-dark-100 tracking-tight mb-1">Caliber's Igloo</h1>
        <p className="text-dark-500 text-sm mb-7">Bot Dashboard & Control Panel</p>

        <form onSubmit={handleSubmit} className="space-y-3">
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
            className="w-full py-2.5 px-6 bg-gradient-to-r from-ice-400 to-ice-500 hover:from-ice-300 hover:to-ice-400 text-dark-950 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 shadow-lg shadow-ice-400/20 hover:shadow-ice-300/30"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin" />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <p className="text-dark-700 text-[11px] mt-5">Authorized personnel only. All actions are logged.</p>
      </div>
    </div>
  );
}
