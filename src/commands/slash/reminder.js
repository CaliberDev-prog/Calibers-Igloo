import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import {
  createReminder,
  deleteReminder,
  listReminders,
  pauseReminder,
  resumeReminder,
} from '../../services/reminderService.js';

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName('reminder')
      .setDescription('Manage recurring user reminder pings')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addSubcommand((sub) =>
        sub
          .setName('create')
          .setDescription('Create a recurring reminder for a user')
          .addUserOption((o) => o.setName('user').setDescription('User to remind').setRequired(true))
          .addChannelOption((o) => o.setName('channel').setDescription('Channel to ping in').setRequired(true))
          .addIntegerOption((o) =>
            o.setName('interval').setDescription('Minutes between pings (min: 1, max: 1440)').setMinValue(1).setMaxValue(1440).setRequired(true),
          )
          .addStringOption((o) => o.setName('message').setDescription('Reminder message (default: "Wake up!")')),
      )
      .addSubcommand((sub) =>
        sub
          .setName('delete')
          .setDescription('Delete a reminder')
          .addStringOption((o) => o.setName('id').setDescription('Reminder ID to delete').setRequired(true)),
      )
      .addSubcommand((sub) =>
        sub
          .setName('list')
          .setDescription('List all reminders for this server'),
      )
      .addSubcommand((sub) =>
        sub
          .setName('pause')
          .setDescription('Pause a reminder without deleting it')
          .addStringOption((o) => o.setName('id').setDescription('Reminder ID to pause').setRequired(true)),
      )
      .addSubcommand((sub) =>
        sub
          .setName('resume')
          .setDescription('Resume a paused reminder')
          .addStringOption((o) => o.setName('id').setDescription('Reminder ID to resume').setRequired(true)),
      ),
    async execute(interaction) {
      const sub = interaction.options.getSubcommand();

      if (sub === 'create') {
        const user = interaction.options.getUser('user', true);
        const channel = interaction.options.getChannel('channel', true);
        const interval = interaction.options.getInteger('interval', true);
        const message = interaction.options.getString('message') || 'Wake up!';

        if (channel.type !== 0) {
          return interaction.reply({ content: 'Channel must be a text channel.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const reminder = await createReminder({
          userId: user.id,
          channelId: channel.id,
          guildId: interaction.guildId,
          message,
          intervalMinutes: interval,
          createdBy: interaction.user.id,
        });

        return interaction.editReply({
          content: `Reminder created for ${user} in ${channel}. I'll ping them every **${interval} minute(s)** with: "${reminder.message}" (ID: \`${reminder._id}\`)`,
        });
      }

      if (sub === 'delete') {
        const id = interaction.options.getString('id', true);
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const deleted = await deleteReminder(id);
        if (!deleted) {
          return interaction.editReply({ content: 'No reminder found with that ID.' });
        }

        return interaction.editReply({ content: `Reminder \`${id}\` deleted.` });
      }

      if (sub === 'list') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const reminders = await listReminders(interaction.guildId);
        if (reminders.length === 0) {
          return interaction.editReply({ content: 'No reminders configured for this server.' });
        }

        const lines = reminders.map((r) => {
          const status = r.active ? 'Active' : 'Paused';
          const nextPing = r.active
            ? `<t:${Math.floor(new Date(r.cycleStart).getTime() / 1000 + r.intervalMinutes * 60)}:R>`
            : '—';
          return `• **${status}** — <@${r.userId}> in <#${r.channelId}> every ${r.intervalMinutes}m — "${r.message}" — Next: ${nextPing} — \`${r._id}\``;
        });

        const chunks = [];
        for (let i = 0; i < lines.length; i += 10) {
          chunks.push(lines.slice(i, i + 10).join('\n'));
        }
        await interaction.editReply({
          content: `**Reminders (${reminders.length})**\n${chunks[0]}`,
        });
        for (let i = 1; i < chunks.length; i++) {
          await interaction.followUp({ content: chunks[i], flags: MessageFlags.Ephemeral });
        }
        return;
      }

      if (sub === 'pause') {
        const id = interaction.options.getString('id', true);
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const reminder = await pauseReminder(id);
        if (!reminder) {
          return interaction.editReply({ content: 'No reminder found with that ID.' });
        }

        return interaction.editReply({ content: `Reminder \`${id}\` paused.` });
      }

      if (sub === 'resume') {
        const id = interaction.options.getString('id', true);
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const reminder = await resumeReminder(id);
        if (!reminder) {
          return interaction.editReply({ content: 'No reminder found with that ID.' });
        }

        return interaction.editReply({ content: `Reminder \`${id}\` resumed.` });
      }
    },
  },
];
