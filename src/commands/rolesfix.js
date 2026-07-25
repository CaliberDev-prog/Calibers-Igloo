// src/commands/rolesfix.js

import { PermissionFlagsBits } from 'discord.js';

const ROLE_ORDER = [
  '👑︱Owner',
  '❄️︱Bot Manager',
  '🧭︱Management',
  '🛡️︱Administrator',
  '🔨︱Moderator',
  '🧤︱Trial Moderator',
  '🎟️︱Support Team',
  '🎉︱Event Team',
  '🎥︱Streamer',
  '💻︱Developer',
  '🎨︱Creator',
  '💎︱Server Booster',
  '🏆︱Event Ping',
  '🎮︱Game Night Ping',
  '📺︱Stream Ping',
  '🎁︱Giveaway Ping',
  '🧊︱Igloo Member',
  '🤖︱Bots',
];

export async function handleRolesFix(message) {
  if (!message.inGuild() || message.author.bot) return;
  if (message.content.trim().toLowerCase() !== '!rolesfix') return;

  const isGuildOwner = message.author.id === message.guild.ownerId;
  const isConfiguredOwner =
    process.env.OWNER_ID && message.author.id === process.env.OWNER_ID;

  const isAdministrator = message.member.permissions.has(
    PermissionFlagsBits.Administrator,
  );

  if (!isGuildOwner && !isConfiguredOwner && !isAdministrator) {
    await message.reply({
      content:
        '❌ You must be the server owner or have **Administrator** permission.',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  const botMember = message.guild.members.me;

  if (!botMember) {
    await message.reply({
      content: '❌ I could not find my member information in this server.',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await message.reply({
      content: '❌ I need the **Manage Roles** permission.',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  const statusMessage = await message.reply({
    content: '🔄 Checking and reordering roles...',
    allowedMentions: { repliedUser: false },
  });

  try {
    await message.guild.roles.fetch();

    const movableRoles = [];
    const missingRoles = [];
    const unmovableRoles = [];

    for (const roleName of ROLE_ORDER) {
      const role = message.guild.roles.cache.find(
        (cachedRole) => cachedRole.name === roleName,
      );

      if (!role) {
        missingRoles.push(roleName);
        continue;
      }

      if (role.managed) {
        unmovableRoles.push(`${roleName} - Discord-managed role`);
        continue;
      }

      if (!role.editable) {
        unmovableRoles.push(`${roleName} - role is above the bot`);
        continue;
      }

      movableRoles.push(role);
    }

    if (movableRoles.length === 0) {
      await statusMessage.edit(
        [
          '❌ No movable roles were found.',
          'Make sure the role names match exactly and the bot role is above them.',
        ].join('\n'),
      );
      return;
    }

    /*
     * Discord positions begin at 1 directly above @everyone.
     * ROLE_ORDER is highest → lowest, so we reverse it before
     * assigning positions from the bottom upward.
     */
    const lowestToHighest = [...movableRoles].reverse();

    const rolePositions = lowestToHighest.map((role, index) => ({
      role: role.id,
      position: index + 1,
    }));

    await message.guild.roles.setPositions(rolePositions);

    const response = [
      '✅ **Role order fixed successfully.**',
      `Reordered **${movableRoles.length}** role(s).`,
    ];

    if (missingRoles.length > 0) {
      response.push(
        '',
        `⚠️ **Missing roles (${missingRoles.length}):**`,
        missingRoles.map((roleName) => `• ${roleName}`).join('\n'),
      );
    }

    if (unmovableRoles.length > 0) {
      response.push(
        '',
        `⚠️ **Could not move (${unmovableRoles.length}):**`,
        unmovableRoles.map((roleName) => `• ${roleName}`).join('\n'),
      );
    }

    await statusMessage.edit(response.join('\n'));
  } catch (error) {
    console.error('Failed to reorder roles:', error);

    await statusMessage.edit(
      [
        '❌ **Failed to reorder the roles.**',
        'Make sure the bot role is above every role being reordered and has **Manage Roles**.',
        `Error: \`${error?.message ?? 'Unknown error'}\``,
      ].join('\n'),
    );
  }
}