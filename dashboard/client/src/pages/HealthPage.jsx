import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { Activity, Database, Cpu, Clock, RefreshCw, Server, Zap } from 'lucide-react';

export default function HealthPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const formatUptime = (s) => {
    if (!s) return 'N/A';
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    return `${h}h ${m}m ${sec}s`;
  };

  const formatBytes = (b) => {
    if (!b) return 'N/A';
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">System Health</h1>
          <p className="text-dark-400 text-sm mt-1">Bot and database status</p>
        </div>
        <button onClick={refresh} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1">
            <Activity className="w-5 h-5 text-ice-300" />
            <span className={`w-2.5 h-2.5 rounded-full ${health?.status === 'ok' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          </div>
          <p className="text-2xl font-bold text-dark-100">{health?.status === 'ok' ? 'Healthy' : 'Error'}</p>
          <p className="text-sm text-dark-400">Overall Status</p>
        </div>

        <div className="stat-card">
          <Database className="w-5 h-5 text-ice-300 mb-1" />
          <p className="text-2xl font-bold text-dark-100">{health?.database || 'Unknown'}</p>
          <p className="text-sm text-dark-400">MongoDB</p>
        </div>

        <div className="stat-card">
          <Clock className="w-5 h-5 text-ice-300 mb-1" />
          <p className="text-2xl font-bold text-dark-100">{formatUptime(health?.uptime)}</p>
          <p className="text-sm text-dark-400">Uptime</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-6">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="w-5 h-5 text-ice-300" />
            <h3 className="text-sm font-semibold text-dark-200">Memory Usage</h3>
          </div>
          {health?.memory ? (
            <div className="space-y-3">
              {[
                { label: 'Heap Used', value: health.memory.heapUsed, max: health.memory.heapTotal },
                { label: 'RSS', value: health.memory.rss, max: health.memory.rss },
                { label: 'Heap Total', value: health.memory.heapTotal, max: health.memory.heapTotal },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-dark-400">{item.label}</span>
                    <span className="text-dark-500">{formatBytes(item.value)}</span>
                  </div>
                  <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ice-300/60 rounded-full transition-all duration-500"
                      style={{ width: `${(item.value / item.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-500 text-sm">Loading...</p>
          )}
        </div>

        <div className="glass p-6">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-5 h-5 text-ice-300" />
            <h3 className="text-sm font-semibold text-dark-200">Environment</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Platform', value: 'Windows' },
              { label: 'Node.js', value: health?.nodeVersion || 'Unknown' },
              { label: 'Status', value: health?.status || 'Unknown' },
              { label: 'Timestamp', value: health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'N/A' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-dark-700/20 last:border-0">
                <span className="text-sm text-dark-400">{item.label}</span>
                <span className="text-sm text-dark-200 font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
