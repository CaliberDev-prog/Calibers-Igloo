import {
  EmbedBuilder,
} from 'discord.js';
import { getPrefix } from '../../services/prefixService.js';
import { notifyOwner } from '../../services/ownerNotify.js';

const OWNER_ID = '1293164546005012512';
const MOD_ROLES = ['1530531573332447324', '1530531568605597718'];
const WARN_LOG_CHANNEL = '1530531653234200669';
const ERROR_CHANNEL = '1530531650675413074';
const COLORS = {
  primary: 0x75cff5,
  success: 0x57f287,
  warn: 0xfee75c,
  error: 0xed4245,
};

function hasModRole(member) {
  return member.roles.cache.some((r) => MOD_ROLES.includes(r.id));
}

export async function handlePurgeCommand(message, args) {
  if (!hasModRole(message.member)) {
    return message.reply('❌ You do not have permission to use this command.').then((m) => setTimeout(() => m.delete().catch(() => null), 5000));
  }

  const count = parseInt(args[0], 10);
  if (!count || count < 1 || count > 100) {
    return message.reply('❌ Usage: `!purge <1-100>`').then((m) => setTimeout(() => m.delete().catch(() => null), 5000));
  }

  try {
    const deleted = await message.channel.bulkDelete(count, true);
    const reply = await message.reply(`🧹 Deleted **${deleted.size}** message(s).`);
    setTimeout(() => reply.delete().catch(() => null), 5000);

    await notifyOwner(message.guild, '🧹 Messages Purged', {
      performedBy: `${message.author.tag}`,
      channel: `${message.channel}`,
      extra: `Deleted ${deleted.size} messages`,
      color: COLORS.success,
    });
  } catch (err) {
    console.error('[PURGE] Error:', err);
    const reply = await message.reply(`❌ Failed to purge: ${err.message}`);
    setTimeout(() => reply.delete().catch(() => null), 5000);

    const errChannel = await message.guild.channels.fetch(ERROR_CHANNEL).catch(() => null);
    if (errChannel) {
      const errEmbed = new EmbedBuilder()
        .setTitle('⚠️ Error - Prefix Purge')
        .setDescription(`**User:** ${message.author}\n**Channel:** ${message.channel}\n**Error:** ${err.message}`)
        .setColor(COLORS.error)
        .setTimestamp();
      await errChannel.send({ embeds: [errEmbed] }).catch(() => null);
    }
  }
}

export async function handleWarningCommand(message, args) {
  if (!hasModRole(message.member)) {
    return message.reply('❌ You do not have permission to use this command.').then((m) => setTimeout(() => m.delete().catch(() => null), 5000));
  }

  const target = message.mentions.users.first();
  if (!target) {
    return message.reply('❌ Usage: `!warning @user <reason>`').then((m) => setTimeout(() => m.delete().catch(() => null), 5000));
  }

  const reasonStart = args.findIndex((a) => a.startsWith('<@'));
  const reason = args.slice(reasonStart + 1).join(' ');
  if (!reason) {
    return message.reply('❌ Please provide a reason.').then((m) => setTimeout(() => m.delete().catch(() => null), 5000));
  }

  const logChannel = await message.guild.channels.fetch(WARN_LOG_CHANNEL).catch(() => null);
  if (!logChannel) {
    return message.reply('❌ Warning log channel not found.');
  }

  const embed = new EmbedBuilder()
    .setTitle('⚠️ User Warning')
    .setDescription(`**User:** ${target} (${target.id})\n**Reason:** ${reason}`)
    .setColor(COLORS.warn)
    .addFields(
      { name: 'Moderator', value: `${message.author} (${message.author.id})`, inline: true },
      { name: 'Channel', value: `${message.channel}`, inline: true }
    )
    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch(() => null);

  const dmEmbed = new EmbedBuilder()
    .setTitle('⚠️ You have been warned')
    .setDescription(`You have received a warning in **Caliber's Igloo**.`)
    .addFields(
      { name: 'Reason', value: reason },
      { name: 'Moderator', value: `${message.author.tag}` }
    )
    .setColor(COLORS.warn)
    .setTimestamp();

  const dmResult = await target.send({ embeds: [dmEmbed] }).catch(() => null);

  const reply = await message.reply(`✅ Warning for ${target} logged to <#${WARN_LOG_CHANNEL}>${dmResult ? '' : ' (DM failed)'}`);
  setTimeout(() => reply.delete().catch(() => null), 5000);
  setTimeout(() => message.delete().catch(() => null), 5000);

  await notifyOwner(message.guild, '⚠️ User Warned', {
    user: `${target.tag} (${target.id})`,
    performedBy: `${message.author.tag}`,
    reason,
    color: COLORS.warn,
  });
}

export async function handleSlowmodeCommand(message, args) {
  if (!hasModRole(message.member)) {
    return message.reply('❌ You do not have permission to use this command.').then((m) => setTimeout(() => m.delete().catch(() => null), 5000));
  }

  const timeInput = args[0];
  if (!timeInput) {
    return message.reply('❌ Usage: `!slowmode [channel] <time/off>`').then((m) => setTimeout(() => m.delete().catch(() => null), 5000));
  }

  let targetChannel = message.channel;
  let timeArg = timeInput;

  if (message.mentions.channels.first()) {
    targetChannel = message.mentions.channels.first();
    timeArg = args[1] || '';
  }

  if (!timeArg) {
    return message.reply('❌ Please provide a time (e.g., `5s`, `1m`, `off`).').then((m) => setTimeout(() => m.delete().catch(() => null), 5000));
  }

  let seconds = 0;
  const t = timeArg.toLowerCase();

  if (t === 'off' || t === '0' || t === '0s') {
    seconds = 0;
  } else {
    const match = t.match(/^(\d+)\s*(s|m|h)?$/);
    if (!match) {
      return message.reply('❌ Invalid format. Use `5s`, `1m`, `5m`, `1h`, or `off`.')
        .then((m) => setTimeout(() => m.delete().catch(() => null), 5000));
    }
    const num = parseInt(match[1], 10);
    switch (match[2] || 's') {
      case 's': seconds = num; break;
      case 'm': seconds = num * 60; break;
      case 'h': seconds = num * 3600; break;
      default: seconds = num;
    }
  }

  if (seconds > 21600) {
    return message.reply('❌ Maximum slowmode is 6 hours.').then((m) => setTimeout(() => m.delete().catch(() => null), 5000));
  }

  try {
    await targetChannel.setRateLimitPerUser(seconds, `Slowmode set by ${message.author.tag}`);

    const reply = await message.reply(
      seconds === 0
        ? `🐌 Slowmode disabled in ${targetChannel}.`
        : `🐌 Slowmode set to **${seconds}s** in ${targetChannel}.`
    );
    setTimeout(() => reply.delete().catch(() => null), 5000);
    setTimeout(() => message.delete().catch(() => null), 5000);

    await notifyOwner(message.guild, '🐌 Slowmode Updated', {
      performedBy: `${message.author.tag}`,
      channel: `${targetChannel}`,
      extra: seconds === 0 ? 'Disabled' : `Set to ${seconds}s`,
      color: seconds === 0 ? COLORS.success : COLORS.warn,
    });
  } catch (err) {
    console.error('[SLOWMODE] Error:', err);
    const reply = await message.reply(`❌ Failed: ${err.message}`);
    setTimeout(() => reply.delete().catch(() => null), 5000);
  }
}
