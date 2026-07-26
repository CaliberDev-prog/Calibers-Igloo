import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from 'discord.js';
import { notifyOwner, isAlertsEnabled, setAlertsEnabled } from '../../services/ownerNotify.js';

const OWNER_ID = process.env.OWNER_ID;
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

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName('purge')
      .setDescription('Bulk delete messages in this server (max 100)')
      .addIntegerOption((opt) =>
        opt.setName('count').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
      if (!hasModRole(interaction.member)) {
        return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
      }

      const count = interaction.options.getInteger('count');
      await interaction.deferReply({ ephemeral: true });

      try {
        const deleted = await interaction.channel.bulkDelete(count, true);
        const embed = new EmbedBuilder()
          .setTitle('🧹 Messages Purged')
          .setDescription(`Deleted **${deleted.size}** message(s) from ${interaction.channel}.`)
          .setColor(COLORS.success)
          .setFooter({ text: `Purged by ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        await notifyOwner(interaction.guild, '🧹 Messages Purged', {
          performedBy: interaction.user.tag,
          channel: `${interaction.channel}`,
          extra: `Deleted ${deleted.size} messages`,
          color: COLORS.success,
        });
      } catch (err) {
        console.error('[PURGE] Error:', err);
        await interaction.editReply({ content: `❌ Failed to purge messages: ${err.message}` });

        const errChannel = await interaction.guild.channels.fetch(ERROR_CHANNEL).catch(() => null);
        if (errChannel) {
          const errEmbed = new EmbedBuilder()
            .setTitle('⚠️ Error - Purge Command')
            .setDescription(`**User:** ${interaction.user} (${interaction.user.id})\n**Channel:** ${interaction.channel}\n**Error:** ${err.message}`)
            .setColor(COLORS.error)
            .setTimestamp();
          await errChannel.send({ embeds: [errEmbed] }).catch(() => null);
        }
      }
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('warning')
      .setDescription('Log a warning for a user')
      .addUserOption((opt) =>
        opt.setName('user').setDescription('The user to warn').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('reason').setDescription('Reason for the warning').setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      if (!hasModRole(interaction.member)) {
        return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
      }

      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      const logChannel = await interaction.guild.channels.fetch(WARN_LOG_CHANNEL).catch(() => null);

      if (!logChannel) {
        return interaction.reply({ content: '❌ Warning log channel not found.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle('⚠️ User Warning')
        .setDescription(`**User:** ${targetUser} (${targetUser.id})\n**Reason:** ${reason}`)
        .setColor(COLORS.warn)
        .addFields(
          { name: 'Moderator', value: `${interaction.user} (${interaction.user.id})`, inline: true },
          { name: 'Channel', value: `${interaction.channel}`, inline: true }
        )
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await logChannel.send({ embeds: [embed] }).catch(() => null);

      const dmEmbed = new EmbedBuilder()
        .setTitle('⚠️ You have been warned')
        .setDescription(`You have received a warning in **Caliber's Igloo**.`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Moderator', value: `${interaction.user.tag}` }
        )
        .setColor(COLORS.warn)
        .setTimestamp();

      const dmFailed = await targetUser.send({ embeds: [dmEmbed] }).catch(() => null);

      const confirmEmbed = new EmbedBuilder()
        .setTitle('✅ Warning Logged')
        .setDescription(`Warning for ${targetUser} has been logged to <#${WARN_LOG_CHANNEL}>.`)
        .setColor(COLORS.success)
        .setTimestamp();

      if (dmFailed === null) {
        confirmEmbed.setFooter({ text: '⚠️ Could not DM the user (they may have DMs disabled).' });
      }

      await interaction.editReply({ embeds: [confirmEmbed] });

      await notifyOwner(interaction.guild, '⚠️ User Warned', {
        user: `${targetUser.tag} (${targetUser.id})`,
        performedBy: interaction.user.tag,
        reason,
        color: COLORS.warn,
      });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('slowmode')
      .setDescription('Set slowmode for a channel')
      .addStringOption((opt) =>
        opt
          .setName('time')
          .setDescription('Slowmode duration (e.g., 5s, 1m, 5m, off)')
          .setRequired(true)
      )
      .addChannelOption((opt) =>
        opt
          .setName('channel')
          .setDescription('Channel to set slowmode for (defaults to current channel)')
          .addChannelTypes(ChannelType.GuildText)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      if (!hasModRole(interaction.member)) {
        return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
      }

      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const timeInput = interaction.options.getString('time').trim().toLowerCase();

      let seconds = 0;

      if (timeInput === 'off' || timeInput === '0' || timeInput === '0s') {
        seconds = 0;
      } else {
        const match = timeInput.match(/^(\d+)\s*(s|m|h)?$/);
        if (!match) {
          return interaction.reply({
            content: '❌ Invalid time format. Use `5s`, `1m`, `5m`, `1h`, or `off`.',
            ephemeral: true,
          });
        }

        const num = parseInt(match[1], 10);
        const unit = match[2] || 's';

        switch (unit) {
          case 's': seconds = num; break;
          case 'm': seconds = num * 60; break;
          case 'h': seconds = num * 3600; break;
          default: seconds = num;
        }
      }

      if (seconds > 21600) {
        return interaction.reply({ content: '❌ Maximum slowmode is 6 hours (21600s).', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        await channel.setRateLimitPerUser(seconds, `Slowmode set by ${interaction.user.tag}`);

        const embed = new EmbedBuilder()
          .setTitle('🐌 Slowmode Updated')
          .setDescription(
            seconds === 0
              ? `Slowmode has been **disabled** in ${channel}.`
              : `Slowmode set to **${seconds}s** in ${channel}.`
          )
          .setColor(seconds === 0 ? COLORS.success : COLORS.warn)
          .setFooter({ text: `Set by ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        await notifyOwner(interaction.guild, '🐌 Slowmode Updated', {
          performedBy: interaction.user.tag,
          channel: `${channel}`,
          extra: seconds === 0 ? 'Disabled' : `Set to ${seconds}s`,
          color: seconds === 0 ? COLORS.success : COLORS.warn,
        });
      } catch (err) {
        console.error('[SLOWMODE] Error:', err);
        await interaction.editReply({ content: `❌ Failed to set slowmode: ${err.message}` });

        const errChannel = await interaction.guild.channels.fetch(ERROR_CHANNEL).catch(() => null);
        if (errChannel) {
          const errEmbed = new EmbedBuilder()
            .setTitle('⚠️ Error - Slowmode Command')
            .setDescription(`**User:** ${interaction.user} (${interaction.user.id})\n**Channel:** ${channel}\n**Error:** ${err.message}`)
            .setColor(COLORS.error)
            .setTimestamp();
          await errChannel.send({ embeds: [errEmbed] }).catch(() => null);
        }
      }
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('botalerts')
      .setDescription('Enable or disable bot activity DM alerts to the owner')
      .addStringOption((opt) =>
        opt
          .setName('toggle')
          .setDescription('Enable or disable alerts')
          .setRequired(true)
          .addChoices(
            { name: '🟢 Enable', value: 'enable' },
            { name: '🔴 Disable', value: 'disable' }
          )
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Owner only.', ephemeral: true });
      }

      const toggle = interaction.options.getString('toggle');
      setAlertsEnabled(toggle === 'enable');

      const embed = new EmbedBuilder()
        .setTitle(toggle === 'enable' ? '🔔 Bot Alerts Enabled' : '🔕 Bot Alerts Disabled')
        .setDescription(
          toggle === 'enable'
            ? 'You will now receive DM notifications for all bot actions.'
            : 'You will no longer receive DM notifications for bot actions.'
        )
        .setColor(toggle === 'enable' ? COLORS.success : COLORS.error)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('prefix')
      .setDescription('Manage the bot command prefix')
      .addSubcommand((sub) =>
        sub.setName('show').setDescription('Show the current prefix')
      )
      .addSubcommand((sub) =>
        sub
          .setName('set')
          .setDescription('Set a new prefix')
          .addStringOption((opt) =>
            opt.setName('prefix').setDescription('New prefix (max 5 chars)').setRequired(true).setMaxLength(5)
          )
      )
      .addSubcommand((sub) =>
        sub.setName('clear').setDescription('Reset prefix to default (!)')
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Owner only.', ephemeral: true });
      }

      const { getPrefix, setPrefix, clearPrefix } = await import('../../services/prefixService.js');
      const sub = interaction.options.getSubcommand();

      if (sub === 'show') {
        const current = getPrefix();
        const embed = new EmbedBuilder()
          .setTitle('📝 Current Prefix')
          .setDescription(`The current prefix is: \`${current}\`\nMentioning the bot also works as a prefix.`)
          .setColor(COLORS.primary)
          .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (sub === 'set') {
        const newPrefix = interaction.options.getString('prefix');
        setPrefix(newPrefix);
        const embed = new EmbedBuilder()
          .setTitle('✅ Prefix Updated')
          .setDescription(`Prefix changed to: \`${newPrefix}\`\nMentioning the bot still works too.`)
          .setColor(COLORS.success)
          .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (sub === 'clear') {
        clearPrefix();
        const embed = new EmbedBuilder()
          .setTitle('✅ Prefix Reset')
          .setDescription('Prefix reset to default: `!`\nMentioning the bot still works too.')
          .setColor(COLORS.success)
          .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    },
  },
];
