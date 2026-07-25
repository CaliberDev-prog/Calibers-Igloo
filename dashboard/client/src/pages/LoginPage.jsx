import { useAuth } from '../lib/auth.jsx';
import { Snowflake } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, login } = useAuth();

  if (loading) return null;
  if (user) {
    window.location.href = '/dashboard';
    return null;
  }

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

        <button
          onClick={login}
          className="w-full py-3 px-6 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-[#5865F2]/20"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
          Sign in with Discord
        </button>

        <p className="text-dark-600 text-xs mt-6">Authorized personnel only. All actions are logged.</p>
      </div>
    </div>
  );
}
