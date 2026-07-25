import { ChannelType } from 'discord.js';
import { CATEGORY_BLUEPRINT, ROLE_BLUEPRINT } from '../config/serverBlueprint.js';
import { buildOverwrites } from '../utils/permissions.js';

function findRole(guild, name) {
  return guild.roles.cache.find((role) => role.name === name);
}

function findChannel(guild, name, type) {
  return guild.channels.cache.find((channel) => channel.name === name && channel.type === type);
}

export async function setupServer(guild, ownerId, onProgress = () => {}) {
  const result = { rolesCreated: 0, rolesReused: 0, categoriesCreated: 0, categoriesReused: 0, channelsCreated: 0, channelsReused: 0, warnings: [] };
  const roleMap = new Map();

  await guild.roles.fetch();
  await guild.channels.fetch();

  for (const roleData of [...ROLE_BLUEPRINT].reverse()) {
    let role = findRole(guild, roleData.name);
    if (!role) {
      role = await guild.roles.create({
        name: roleData.name,
        color: roleData.color ?? undefined,
        hoist: roleData.hoist ?? false,
        mentionable: roleData.mentionable ?? false,
        permissions: roleData.permissions,
        reason: "Caliber's Igloo automated setup"
      });
      result.rolesCreated += 1;
      onProgress(`Created role: ${roleData.name}`);
    } else {
      result.rolesReused += 1;
    }
    roleMap.set(roleData.name, role);
  }

  const ownerRole = roleMap.get('👑︱Owner');
  if (ownerId && ownerRole) {
    const owner = await guild.members.fetch(ownerId).catch(() => null);
    if (owner && owner.manageable) await owner.roles.add(ownerRole).catch(() => null);
    else if (owner) await owner.roles.add(ownerRole).catch((error) => result.warnings.push(`Could not assign Owner role: ${error.message}`));
  }

  for (const categoryData of CATEGORY_BLUEPRINT) {
    let category = findChannel(guild, categoryData.name, ChannelType.GuildCategory);
    if (!category) {
      category = await guild.channels.create({
        name: categoryData.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: categoryData.access ? buildOverwrites(guild, roleMap, categoryData.access, ownerId) : undefined,
        reason: "Caliber's Igloo automated setup"
      });
      result.categoriesCreated += 1;
      onProgress(`Created category: ${categoryData.name}`);
    } else {
      result.categoriesReused += 1;
    }

    for (const channelData of categoryData.channels) {
      let channel = findChannel(guild, channelData.name, channelData.type);
      const permissionOverwrites = buildOverwrites(guild, roleMap, channelData.access ?? categoryData.access ?? 'member', ownerId);

      if (!channel) {
        channel = await guild.channels.create({
          name: channelData.name,
          type: channelData.type,
          parent: category.id,
          topic: channelData.topic,
          userLimit: channelData.userLimit,
          permissionOverwrites,
          reason: "Caliber's Igloo automated setup"
        });
        result.channelsCreated += 1;
        onProgress(`Created channel: ${channelData.name}`);
      } else {
        result.channelsReused += 1;
        if (channel.parentId !== category.id) await channel.setParent(category.id, { lockPermissions: false }).catch(() => null);
      }
    }
  }

  const afkChannel = findChannel(guild, '😴︱AFK', ChannelType.GuildVoice);
  if (afkChannel) await guild.setAFKChannel(afkChannel, 'Set by Caliber’s Igloo setup bot').catch(() => null);

  return result;
}
