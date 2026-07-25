import { ChannelType, PermissionFlagsBits } from 'discord.js';

export const ROLE_BLUEPRINT = [
  { name: '👑︱Owner', color: 0xf4c84a, hoist: true, permissions: [PermissionFlagsBits.Administrator] },
  { name: '🧭︱Management', color: 0x5865f2, hoist: true, permissions: [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers, PermissionFlagsBits.ViewAuditLog] },
  { name: '🛡️︱Administrator', color: 0xed4245, hoist: true, permissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers, PermissionFlagsBits.ViewAuditLog] },
  { name: '🔨︱Moderator', color: 0xfee75c, hoist: true, permissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.KickMembers, PermissionFlagsBits.ViewAuditLog] },
  { name: '🧤︱Trial Moderator', color: 0x57f287, hoist: true, permissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers] },
  { name: '🎟️︱Support Team', color: 0x3ba55d, hoist: true, permissions: [] },
  { name: '🎉︱Event Team', color: 0xeb459e, hoist: true, permissions: [] },
  { name: '🎥︱Streamer', color: 0x9146ff, hoist: false, permissions: [] },
  { name: '💻︱Developer', color: 0x3498db, hoist: false, permissions: [] },
  { name: '🎨︱Creator', color: 0xe67e22, hoist: false, permissions: [] },
  { name: '💎︱Server Booster', color: 0xf47fff, hoist: true, permissions: [] },
  { name: '🏆︱Event Ping', color: null, hoist: false, mentionable: true, permissions: [] },
  { name: '🎮︱Game Night Ping', color: null, hoist: false, mentionable: true, permissions: [] },
  { name: '📺︱Stream Ping', color: null, hoist: false, mentionable: true, permissions: [] },
  { name: '🎁︱Giveaway Ping', color: null, hoist: false, mentionable: true, permissions: [] },
  { name: '🧊︱Igloo Member', color: 0x9eddf9, hoist: false, permissions: [] }
];

const text = (name, topic, access = 'member') => ({ name, type: ChannelType.GuildText, topic, access });
const voice = (name, userLimit = 0, access = 'member') => ({ name, type: ChannelType.GuildVoice, userLimit, access });

export const CATEGORY_BLUEPRINT = [
  {
    name: '━━━ START HERE ━━━',
    channels: [
      text('👋︱welcome', 'Welcome information for Caliber’s Igloo.', 'readOnly'),
      text('📜︱guidelines', 'Community rules and expectations.', 'readOnly'),
      text('📢︱updates', 'Official server announcements and updates.', 'readOnly'),
      text('🎭︱roles', 'Choose notification and interest roles.', 'readOnly')
    ]
  },
  {
    name: '━━━ CALIBER ━━━',
    channels: [
      text('🧊︱from-caliber', 'Updates, thoughts, previews, and posts directly from Caliber.', 'ownerOnly'),
      text('💬︱ask-caliber', 'Ask Caliber questions and start conversations.'),
      text('📅︱schedule', 'Upcoming streams, events, game nights, and plans.', 'managementPost')
    ]
  },
  {
    name: '━━━ COMMUNITY ━━━',
    channels: [
      text('💬︱general', 'The main community conversation.'),
      text('☕︱lounge', 'Relaxed conversations and off-topic discussion.'),
      text('🖼️︱showcase', 'Share screenshots, setups, accomplishments, and media.'),
      text('😂︱memes', 'Community memes and funny posts.'),
      text('🎧︱music-share', 'Share songs, albums, artists, and playlists.'),
      text('📊︱polls', 'Community polls and quick votes.'),
      text('⚙️︱commands', 'Use bot commands here.')
    ]
  },
  {
    name: '━━━ GAMING ━━━',
    channels: [
      text('🎮︱looking-for-group', 'Find people to play games with.'),
      text('🏆︱events', 'Event information, signups, and results.', 'managementPost'),
      text('🎁︱giveaways', 'Community giveaways and winner announcements.', 'managementPost'),
      text('📺︱live-now', 'Live stream and active streaming voice notifications.', 'botPost')
    ]
  },
  {
    name: '━━━ CREATE ━━━',
    channels: [
      text('💻︱coding', 'Programming, development, and technical discussion.'),
      text('🎨︱creations', 'Share art, builds, videos, designs, and other creations.'),
      text('💡︱brainstorm', 'Ideas, feedback, and project brainstorming.')
    ]
  },
  {
    name: '━━━ SUPPORT ━━━',
    channels: [
      text('🎫︱create-ticket', 'Open a private support or hiring ticket.', 'readOnly'),
      text('💭︱feedback', 'Suggestions and feedback for Caliber’s Igloo.')
    ]
  },
  {
    name: '━━━ CABINS ━━━',
    channels: [
      voice('🔊︱Lounge Cabin'),
      voice('🎮︱Gaming Cabin', 8),
      voice('🎮︱Squad Cabin', 5),
      voice('📺︱Streaming Cabin', 10),
      voice('🎬︱Cinema Cabin', 15),
      voice('🎵︱Music Cabin'),
      voice('😴︱AFK')
    ]
  },
  {
    name: '━━━ STAFF AREA ━━━',
    access: 'staff',
    channels: [
      text('📣︱staff-updates', 'Internal staff announcements.', 'staff'),
      text('🗨️︱staff-chat', 'Private staff discussion.', 'staff'),
      text('🎟️︱ticket-discussion', 'Discuss active and escalated tickets.', 'staff'),
      text('🗒️︱staff-notes', 'Internal notes and important reminders.', 'staff'),
      text('📚︱staff-resources', 'Training, procedures, and staff resources.', 'staff'),
      text('🛠️︱management', 'Private management discussion.', 'management')
    ]
  },
  {
    name: '━━━ VAULT ━━━',
    access: 'staff',
    channels: [
      text('📋︱audit-log', 'Important administrative actions.', 'logs'),
      text('🗃️︱ticket-log', 'Ticket creation, closure, and transcript records.', 'logs'),
      text('📥︱member-log', 'Member joins, leaves, and account information.', 'logs'),
      text('📝︱message-log', 'Message edits and deletions.', 'logs'),
      text('🖥️︱bot-log', 'Bot status, errors, and automated actions.', 'logs'),
      text('🔐︱security-log', 'Verification and security alerts.', 'logs'),
      text('⚖️︱moderation-log', 'Warnings, timeouts, kicks, and bans.', 'logs')
    ]
  }
];
