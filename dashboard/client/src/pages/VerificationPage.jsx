import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast.jsx';
import { api } from '../lib/api.js';
import {
  Lock, Shield, Clock, Users, Hash, CheckCircle2,
  AlertTriangle, Settings, RefreshCw,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function VerificationPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [cfgData, chData, roleData] = await Promise.all([
        api.getConfig(),
        api.getChannels(),
        api.getRoles(),
      ]);
      setConfig(cfgData?.settings || {});
      setChannels(chData.channels || []);
      setRoles(roleData.roles || []);
    } catch {
      toast('Failed to load verification data', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getChannelName = (id) => {
    if (!id) return 'Not set';
    const ch = channels.find((c) => c.id === id);
    return ch ? `# ${ch.name}` : id;
  };

  const getRoleName = (id) => {
    if (!id) return 'Not set';
    const r = roles.find((r) => r.id === id);
    return r ? r.name : id;
  };

  const verifiedRole = config?.verifiedRoleName || '🧊︱Igloo Member';
  const unverifiedRole = config?.unverifiedRoleName || '❄️︱Unverified';

  const features = [
    {
      icon: Lock,
      label: 'Code-Based Verification',
      desc: 'Users receive a random code and must enter it to verify',
      status: 'active',
    },
    {
      icon: Clock,
      label: 'Timeout Protection',
      desc: 'Verification codes expire after 2 minutes',
      status: 'active',
    },
    {
      icon: Shield,
      label: 'Auto Role Assignment',
      desc: `Verified users get "${verifiedRole}" role`,
      status: 'active',
    },
    {
      icon: Users,
      label: 'Channel Restriction',
      desc: 'Unverified users can only see the verification channel',
      status: config?.verificationChannel ? 'active' : 'inactive',
    },
    {
      icon: AlertTriangle,
      label: 'Timeout Notifications',
      desc: 'Alerts when users fail to verify in time',
      status: config?.verificationTimeout ? 'active' : 'inactive',
    },
  ];

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
        title="Verification"
        subtitle="Manage the server verification system"
        onRefresh={load}
        refreshing={loading}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-400/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">Active</p>
              <p className="text-sm text-dark-400">System Status</p>
            </div>
          </div>
        </div>
        <div className="glass p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ice-300/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-ice-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">2 min</p>
              <p className="text-sm text-dark-400">Code Timeout</p>
            </div>
          </div>
        </div>
        <div className="glass p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-400/10 flex items-center justify-center">
              <Hash className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">4-6</p>
              <p className="text-sm text-dark-400">Code Length</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-700/50">
          <h3 className="text-sm font-semibold text-dark-200">System Features</h3>
        </div>
        <div className="divide-y divide-dark-700/20">
          {features.map((f, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-dark-700/10 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-dark-800/50 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-4.5 h-4.5 text-dark-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark-200">{f.label}</p>
                <p className="text-xs text-dark-500">{f.desc}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                f.status === 'active'
                  ? 'bg-green-400/10 text-green-400 border-green-400/20'
                  : 'bg-dark-700/50 text-dark-500 border-dark-700/30'
              }`}>
                {f.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-6">
          <h3 className="text-sm font-semibold text-dark-200 mb-4">Channel Configuration</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-dark-700/20">
              <span className="text-sm text-dark-400">Verification Channel</span>
              <span className="text-sm text-dark-200 font-mono text-xs">{getChannelName(config?.verificationChannel)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-dark-700/20">
              <span className="text-sm text-dark-400">Timeout Notifications</span>
              <span className="text-sm text-dark-200 font-mono text-xs">{getChannelName(config?.verificationTimeout)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-dark-700/20">
              <span className="text-sm text-dark-400">Welcome Channel</span>
              <span className="text-sm text-dark-200 font-mono text-xs">{getChannelName(config?.welcomeChannel)}</span>
            </div>
          </div>
        </div>

        <div className="glass p-6">
          <h3 className="text-sm font-semibold text-dark-200 mb-4">Role Configuration</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-dark-700/20">
              <span className="text-sm text-dark-400">Verified Role</span>
              <span className="text-sm text-green-400 font-mono text-xs">{verifiedRole}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-dark-700/20">
              <span className="text-sm text-dark-400">Unverified Role</span>
              <span className="text-sm text-yellow-400 font-mono text-xs">{unverifiedRole}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-dark-400">Staff Role</span>
              <span className="text-sm text-dark-200 font-mono text-xs">{getRoleName(config?.staffRole)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-dark-200 mb-4">How It Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Click Verify', desc: 'User clicks the Verify button on the panel' },
            { step: '2', title: 'Get Code', desc: 'A random 4-6 character code is generated and shown' },
            { step: '3', title: 'Enter Code', desc: 'User types the code in a modal popup' },
            { step: '4', title: 'Access Granted', desc: 'Verified role assigned, channel access unlocked' },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-ice-300/10 border border-ice-300/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-sm font-bold text-ice-300">{s.step}</span>
              </div>
              <p className="text-sm font-medium text-dark-200 mb-1">{s.title}</p>
              <p className="text-xs text-dark-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
