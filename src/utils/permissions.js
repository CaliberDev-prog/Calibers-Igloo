import { PermissionFlagsBits } from 'discord.js';

const staffNames = ['🧭︱Management', '🛡️︱Administrator', '🔨︱Moderator', '🧤︱Trial Moderator', '🎟️︱Support Team'];
const managementNames = ['🧭︱Management', '🛡️︱Administrator'];

export function buildOverwrites(guild, roleMap, access, ownerId) {
  const everyone = guild.roles.everyone;
  const member = roleMap.get('🧊︱Igloo Member');
  const botMember = guild.members.me;
  const staff = staffNames.map((name) => roleMap.get(name)).filter(Boolean);
  const management = managementNames.map((name) => roleMap.get(name)).filter(Boolean);

  const denyView = { ViewChannel: false };
  const allowStandard = {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AddReactions: true,
    Connect: true,
    Speak: true
  };

  const overwrites = [
    { id: everyone.id, deny: [PermissionFlagsBits.SendMessages] },
    ...(member ? [{ id: member.id, allow: Object.entries(allowStandard).filter(([, value]) => value).map(([key]) => PermissionFlagsBits[key]) }] : []),
    ...(botMember ? [{ id: botMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages] }] : [])
  ];

  if (access === 'member') return overwrites;

  if (access === 'readOnly') {
    return overwrites.map((entry) => entry.id === member?.id
      ? { ...entry, deny: [PermissionFlagsBits.SendMessages], allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions] }
      : entry);
  }

  if (access === 'ownerOnly') {
    return [
      { id: everyone.id, deny: [PermissionFlagsBits.SendMessages] },
      ...(member ? [{ id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] }] : []),
      ...(ownerId ? [{ id: ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] }] : []),
      ...(botMember ? [{ id: botMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : [])
    ];
  }

  if (access === 'managementPost') {
    return [
      { id: everyone.id, deny: [PermissionFlagsBits.SendMessages] },
      ...(member ? [{ id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] }] : []),
      ...management.map((role) => ({ id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] })),
      ...(ownerId ? [{ id: ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] }] : []),
      ...(botMember ? [{ id: botMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : [])
    ];
  }

  if (access === 'botPost') {
    return [
      { id: everyone.id, deny: [PermissionFlagsBits.SendMessages] },
      ...(member ? [{ id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] }] : []),
      ...(botMember ? [{ id: botMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] }] : [])
    ];
  }

  if (['staff', 'logs'].includes(access)) {
    return [
      { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...staff.map((role) => ({ id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] })),
      ...(botMember ? [{ id: botMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] }] : [])
    ];
  }

  if (access === 'management') {
    return [
      { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...management.map((role) => ({ id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] })),
      ...(ownerId ? [{ id: ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : []),
      ...(botMember ? [{ id: botMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : [])
    ];
  }

  return overwrites;
}
