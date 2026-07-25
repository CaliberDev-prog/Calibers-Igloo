import { useAuth } from '../lib/auth.jsx';
import { Settings, Ticket, MessageSquare, Shield, Bell, Hash, Snowflake, Lock } from 'lucide-react';
import { useState } from 'react';

const SECTIONS = [
  {
    id: 'tickets',
    icon: Ticket,
    label: 'Ticket System',
    settings: [
      { key: 'ticketLimitPerDepartment', label: 'Ticket Limit per Department', type: 'number', value: 2, desc: 'Max open tickets per user per department' },
      { key: 'alertCooldownSeconds', label: 'Alert Cooldown', type: 'text', value: '30 minutes', desc: 'Time between alert pings' },
      { key: 'autoCloseInactiveHours', label: 'Auto-Close Inactive', type: 'text', value: '48 hours', desc: 'Auto-close tickets inactive for this long' },
      { key: 'transcriptDM', label: 'Transcript DM', type: 'toggle', value: true, desc: 'DM transcripts to ticket creator on close' },
    ],
  },
  {
    id: 'departments',
    icon: Hash,
    label: 'Departments',
    settings: [
      { key: 'general', label: 'General Support', type: 'info', value: 'Enabled - Category: 1530532240331771914', desc: 'Support role: 1530554415558299709' },
      { key: 'reports', label: 'Reports', type: 'info', value: 'Enabled - Category: 1530532184480550923', desc: 'Support role: 1530554438945738883' },
      { key: 'hiring', label: 'Hiring', type: 'info', value: 'Enabled - Category: 1530532279242457128', desc: 'Support role: 1530554455018176552' },
    ],
  },
  {
    id: 'verification',
    icon: Lock,
    label: 'Verification',
    settings: [
      { key: 'verificationChannel', label: 'Verification Channel', type: 'info', value: '1530545074222399651', desc: 'Channel for the verification gate' },
      { key: 'verificationTimeout', label: 'Timeout Notification', type: 'info', value: '1530531652122579066', desc: 'Channel for timeout alerts' },
    ],
  },
  {
    id: 'welcome',
    icon: Snowflake,
    label: 'Welcome & Roles',
    settings: [
      { key: 'welcomeChannel', label: 'Welcome Channel', type: 'info', value: '1530531579552731178', desc: 'Channel for welcome messages' },
      { key: 'rolesChannel', label: 'Roles Channel', type: 'info', value: '1530531583587651636', desc: 'Channel for reaction roles' },
    ],
  },
  {
    id: 'notifications',
    icon: Bell,
    label: 'Notifications & Logging',
    settings: [
      { key: 'botAlerts', label: 'Bot Activity Alerts', type: 'toggle', value: true, desc: 'DM owner on every bot action' },
      { key: 'ticketLog', label: 'Ticket Log Channel', type: 'info', value: '1530531646397481103', desc: 'Where ticket actions are logged' },
      { key: 'errorLog', label: 'Error Log Channel', type: 'info', value: '1530531650675413074', desc: 'Where errors are logged' },
      { key: 'transcriptLog', label: 'Transcript Log', type: 'info', value: '1530583332730048562', desc: 'Where transcripts are saved' },
      { key: 'inviteLog', label: 'Invite Tracking', type: 'info', value: '1530595513924059289', desc: 'Invite join tracking channel' },
      { key: 'warningLog', label: 'Warning Log', type: 'info', value: '1530531653234200669', desc: 'Where warnings are logged' },
    ],
  },
  {
    id: 'security',
    icon: Shield,
    label: 'Security & Permissions',
    settings: [
      { key: 'staffRoles', label: 'Staff Roles', type: 'info', value: '1530531573332447324, 1530531568605597718', desc: 'Roles with staff access' },
      { key: 'ownerId', label: 'Bot Owner', type: 'info', value: '1293164546005012512', desc: 'Owner ID with full access' },
      { key: 'prefix', label: 'Command Prefix', type: 'text', value: '!', desc: 'Default prefix for text commands' },
    ],
  },
];

function SettingRow({ setting }) {
  const [enabled, setEnabled] = useState(setting.value);

  return (
    <div className="flex items-center justify-between py-3 border-b border-dark-700/20 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-dark-200">{setting.label}</p>
        <p className="text-xs text-dark-500 mt-0.5">{setting.desc}</p>
      </div>
      <div className="flex-shrink-0 ml-4">
        {setting.type === 'toggle' ? (
          <button
            onClick={() => setEnabled(!enabled)}
            className={`w-11 h-6 rounded-full transition-all duration-200 relative ${enabled ? 'bg-ice-300/30' : 'bg-dark-700'}`}
          >
            <div className={`w-5 h-5 rounded-full transition-all duration-200 absolute top-0.5 ${enabled ? 'left-[22px] bg-ice-300' : 'left-0.5 bg-dark-500'}`} />
          </button>
        ) : setting.type === 'number' ? (
          <input type="number" defaultValue={setting.value} className="input-dark w-20 text-center text-sm" />
        ) : setting.type === 'text' ? (
          <input type="text" defaultValue={setting.value} className="input-dark w-36 text-sm" />
        ) : (
          <span className="text-xs text-dark-400 bg-dark-800/50 px-3 py-1.5 rounded-lg border border-dark-700/30 max-w-[250px] truncate inline-block">
            {setting.value}
          </span>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const isOwner = user?.id === '1293164546005012512';
  const [activeSection, setActiveSection] = useState('tickets');

  const current = SECTIONS.find(s => s.id === activeSection);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-100">Settings</h1>
        <p className="text-dark-400 text-sm mt-1">
          {isOwner ? 'Full access - all settings editable' : 'View-only access'}
        </p>
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
              <SettingRow key={setting.key} setting={setting} />
            ))}
          </div>

          {isOwner && (
            <div className="mt-6 pt-4 border-t border-dark-700/30 flex justify-end">
              <button className="btn-primary">Save Changes</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
