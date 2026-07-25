import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import {
  Gift, Clock, Users, Trophy, Plus, Calendar, Sparkles,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function GiveawaysPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const cfgData = await api.getConfig();
      setConfig(cfgData?.settings || {});
    } catch {
      toast('Failed to load giveaway data', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Giveaways"
        subtitle="Create and manage server giveaways"
        onRefresh={load}
        refreshing={loading}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-400/10 flex items-center justify-center">
              <Gift className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">0</p>
              <p className="text-sm text-dark-400">Active Giveaways</p>
            </div>
          </div>
        </div>
        <div className="glass p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">0</p>
              <p className="text-sm text-dark-400">Completed</p>
            </div>
          </div>
        </div>
        <div className="glass p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-400/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">0</p>
              <p className="text-sm text-dark-400">Total Entries</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-700/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-dark-200">Giveaway History</h3>
        </div>
        <EmptyState
          icon={Gift}
          title="Giveaway System Coming Soon"
          description="Giveaway management will be available once the giveaway module is added to the bot. You'll be able to create, manage, and track giveaways from here."
        />
      </div>

      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-dark-200 mb-4">Planned Features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Plus, title: 'Create Giveaways', desc: 'Set prize, duration, channel, and requirements' },
            { icon: Clock, title: 'Timers & Duration', desc: 'Auto-end giveaways after the set time' },
            { icon: Users, title: 'Entry Management', desc: 'View and manage who entered' },
            { icon: Trophy, title: 'Winner Selection', desc: 'Random winner picking with fairness' },
            { icon: Calendar, title: 'Scheduling', desc: 'Schedule giveaways for later' },
            { icon: Sparkles, title: 'Requirements', desc: 'Role, message count, or invite requirements' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-dark-900/30 border border-dark-700/20">
              <div className="w-8 h-8 rounded-lg bg-dark-800/50 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-4 h-4 text-dark-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-dark-300">{f.title}</p>
                <p className="text-xs text-dark-600">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
