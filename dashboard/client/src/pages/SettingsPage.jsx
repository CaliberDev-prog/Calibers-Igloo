import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import { Settings, Ticket, MessageSquare, Shield, Bell, Hash, Snowflake, Lock, Save, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import ChannelSelector from '../components/ChannelSelector.jsx';
import RoleSelector from '../components/RoleSelector.jsx';

const SECTIONS = [
  {
    id: 'tickets',
    icon: Ticket,
    label: 'Ticket System',
    settings: [
      { key: 'ticketLimitPerDepartment', label: 'Ticket Limit per Department', type: 'number', desc: 'Max open tickets per user per department' },
      { key: 'alertCooldownSeconds', label: 'Alert Cooldown (seconds)', type: 'number', desc: 'Time between alert pings in seconds' },
      { key: 'autoCloseInactiveHours', label: 'Auto-Close Inactive (hours)', type: 'number', desc: 'Auto-close tickets inactive for this long' },
      { key: 'transcriptDM', label: 'Transcript DM', type: 'toggle', desc: 'DM transcripts to ticket creator on close' },
    ],
  },
  {
    id: 'departments',
    icon: Hash,
    label: 'Departments',
    settings: [
      { key: 'generalCategory', label: 'General Category', type: 'channel', channelType: 4, desc: 'Category channel for general support tickets' },
      { key: 'generalRole', label: 'General Support Role', type: 'role', desc: 'Role for general support staff' },
      { key: 'reportsCategory', label: 'Reports Category', type: 'channel', channelType: 4, desc: 'Category channel for report tickets' },
      { key: 'reportsRole', label: 'Reports Role', type: 'role', desc: 'Role for reports staff' },
      { key: 'hiringCategory', label: 'Hiring Category', type: 'channel', channelType: 4, desc: 'Category channel for hiring tickets' },
      { key: 'hiringRole', label: 'Hiring Role', type: 'role', desc: 'Role for hiring staff' },
    ],
  },
  {
    id: 'verification',
    icon: Lock,
    label: 'Verification',
    settings: [
      { key: 'verificationChannel', label: 'Verification Channel', type: 'channel', desc: 'Channel for the verification gate' },
      { key: 'verificationTimeout', label: 'Timeout Notification Channel', type: 'channel', desc: 'Channel for timeout alerts' },
    ],
  },
  {
    id: 'welcome',
    icon: Snowflake,
    label: 'Welcome & Roles',
    settings: [
      { key: 'welcomeChannel', label: 'Welcome Channel', type: 'channel', desc: 'Channel for welcome messages' },
      { key: 'rolesChannel', label: 'Roles Channel', type: 'channel', desc: 'Channel for reaction roles' },
    ],
  },
  {
    id: 'notifications',
    icon: Bell,
    label: 'Notifications & Logging',
    settings: [
      { key: 'botAlerts', label: 'Bot Activity Alerts', type: 'toggle', desc: 'DM owner on every bot action' },
      { key: 'ticketLog', label: 'Ticket Log Channel', type: 'channel', desc: 'Where ticket actions are logged' },
      { key: 'errorLog', label: 'Error Log Channel', type: 'channel', desc: 'Where errors are logged' },
      { key: 'transcriptLog', label: 'Transcript Log Channel', type: 'channel', desc: 'Where transcripts are saved' },
      { key: 'inviteLog', label: 'Invite Tracking Channel', type: 'channel', desc: 'Invite join tracking channel' },
      { key: 'warningLog', label: 'Warning Log Channel', type: 'channel', desc: 'Where warnings are logged' },
    ],
  },
  {
    id: 'security',
    icon: Shield,
    label: 'Security & Permissions',
    settings: [
      { key: 'staffRole', label: 'Staff Role', type: 'role', desc: 'Primary role with staff access' },
      { key: 'ownerId', label: 'Bot Owner', type: 'text', desc: 'Owner ID with full access' },
      { key: 'prefix', label: 'Command Prefix', type: 'text', desc: 'Default prefix for text commands' },
    ],
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = user?.role === 'owner';
  const [activeSection, setActiveSection] = useState('tickets');
  const [settings, setSettings] = useState({});
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getConfig().catch(() => ({})),
      api.getChannels().catch(() => ({ channels: [] })),
      api.getRoles().catch(() => ({ roles: [] })),
    ]).then(([config, chData, roleData]) => {
      if (config?.settings) setSettings(config.settings);
      setChannels(chData.channels || []);
      setRoles(roleData.roles || []);
      setConfigLoaded(true);
    });
  }, []);

  const current = SECTIONS.find((s) => s.id === activeSection);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.saveConfig(settings);
      toast('Settings saved successfully!', 'success');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast('Failed to save settings', 'error');
    }
    setSaving(false);
  };

  if (!configLoaded) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Settings</h1>
          <p className="text-dark-400 text-sm mt-1">
            {isOwner ? 'Full access - all settings editable' : 'View-only access'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="glass p-2 h-fit">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const active = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active ? 'bg-ice-300/10 text-ice-300' : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/30'}
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3 glass p-6">
          <div className="flex items-center gap-3 mb-6">
            {current && <current.icon className="w-5 h-5 text-ice-300" />}
            <h2 className="text-lg font-semibold text-dark-100">{current?.label}</h2>
          </div>

          <div className="space-y-0">
            {current?.settings.map((setting) => (
              <div key={setting.key} className="flex items-center justify-between py-3 border-b border-dark-700/20 last:border-0">
                <div className="min-w-0 flex-1 mr-4">
                  <p className="text-sm font-medium text-dark-200">{setting.label}</p>
                  <p className="text-xs text-dark-500 mt-0.5">{setting.desc}</p>
                </div>
                <div className="flex-shrink-0">
                  {setting.type === 'toggle' ? (
                    <button
                      onClick={() => isOwner && updateSetting(setting.key, !settings[setting.key])}
                      className={`w-11 h-6 rounded-full transition-all duration-200 relative ${settings[setting.key] ? 'bg-ice-300/30' : 'bg-dark-700'} ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className={`w-5 h-5 rounded-full transition-all duration-200 absolute top-0.5 ${settings[setting.key] ? 'left-[22px] bg-ice-300' : 'left-0.5 bg-dark-500'}`} />
                    </button>
                  ) : setting.type === 'number' ? (
                    <input
                      type="number"
                      value={settings[setting.key] ?? ''}
                      onChange={(e) => isOwner && updateSetting(setting.key, Number(e.target.value))}
                      className="input-dark w-20 text-center text-sm"
                      disabled={!isOwner}
                    />
                  ) : setting.type === 'text' ? (
                    <input
                      type="text"
                      value={settings[setting.key] ?? ''}
                      onChange={(e) => isOwner && updateSetting(setting.key, e.target.value)}
                      className="input-dark w-40 text-sm"
                      disabled={!isOwner}
                    />
                  ) : setting.type === 'channel' ? (
                    <div className="w-64">
                      <ChannelSelector
                        channels={channels}
                        value={settings[setting.key] || ''}
                        onChange={(val) => isOwner && updateSetting(setting.key, val)}
                        filter={setting.channelType}
                      />
                    </div>
                  ) : setting.type === 'role' ? (
                    <div className="w-64">
                      <RoleSelector
                        roles={roles}
                        value={settings[setting.key] || ''}
                        onChange={(val) => isOwner && updateSetting(setting.key, val)}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {isOwner && (
            <div className="mt-6 pt-4 border-t border-dark-700/30 flex items-center justify-end gap-3">
              {saved && (
                <span className="text-sm text-green-400 flex items-center gap-1.5 animate-fade-in">
                  <Check className="w-4 h-4" /> Saved!
                </span>
              )}
              <button onClick={saveSettings} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
