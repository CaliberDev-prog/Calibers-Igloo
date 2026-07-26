import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
      <div className="text-center animate-fade-in max-w-md">
        <div className="glass-card p-10 rounded-2xl border border-white/5">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-ice-300/10 flex items-center justify-center">
            <span className="text-5xl font-bold text-ice-300/40">?</span>
          </div>
          <h1 className="text-6xl font-bold text-white mb-2">404</h1>
          <p className="text-dark-400 text-lg mb-1">Page not found</p>
          <p className="text-dark-500 text-sm mb-8">
            The page you are looking for does not exist or has been moved.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ice-300 text-dark-950 font-semibold text-sm hover:bg-ice-300/90 transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
