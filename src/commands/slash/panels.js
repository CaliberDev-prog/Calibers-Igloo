import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { ticketConfig } from '../../config/tickets.js';
import { reactionRoles } from '../../config/reactionRoles.js';
import { buildReactionRoleEmbed, setReactionMessageId } from '../../services/reactionRoleService.js';
import { buildVerificationPanel } from '../../services/verificationService.js';

const V2 = 1 << 15;

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName('ticketpanel')
      .setDescription('Send the ticket support panel')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const deptGeneral = ticketConfig.departments.general;
      const deptReports = ticketConfig.departments.reports;
      const deptHiring = ticketConfig.departments.hiring;

      const container = new ContainerBuilder()
        .setAccentColor(ticketConfig.colors.primary)

        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('**\uD83C\uDFAB Support Hub**')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "Welcome to Caliber's Igloo support portal. Select the appropriate department below to create a private support ticket."
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())

        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('**\uD83D\uDD12 Important Notice**')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            '\u2022 Ticket messages, attachments, and submitted information are private.\n\u2022 Please select the correct department and provide complete, accurate information.'
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())

        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `**${deptGeneral.emoji} General Support**\nOpen a ticket for general questions, verification problems, giveaway prize claims, account issues, or other server-related support.`
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('ticket:dept:general')
                .setLabel(`${deptGeneral.emoji} Open Support Ticket`)
                .setStyle(ButtonStyle.Primary)
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())

        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `**${deptReports.emoji} Report Support**\nPrivately report a member, staff member, rule violation, suspicious behavior, or another serious server incident.`
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('ticket:dept:reports')
                .setLabel(`${deptReports.emoji} Submit Report`)
                .setStyle(ButtonStyle.Danger)
            )
        )
        .addSeparatorComponents(new SeparatorBuilder())

        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `**${deptHiring.emoji} Hiring Caliber**\nContact Caliber about Discord staffing, Minecraft staffing, server setup, or other freelance work.`
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('ticket:dept:hiring')
                .setLabel(`${deptHiring.emoji} Submit Hiring Request`)
                .setStyle(ButtonStyle.Secondary)
            )
        );

      await interaction.channel.send({ components: [container], flags: V2 });
      await interaction.reply({ content: '✅ Panel sent.', ephemeral: true });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('sendembed')
      .setDescription('Send the reaction role embed')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const embed = buildReactionRoleEmbed();
      const sent = await interaction.channel.send({ embeds: [embed] }).catch(() => null);
      if (!sent) return interaction.reply({ content: '❌ Failed to send.', ephemeral: true });

      setReactionMessageId(sent.id);
      const emojis = Object.keys(reactionRoles.emojiRoleMap);
      for (const emoji of emojis) {
        await sent.react(emoji).catch(() => null);
      }
      await interaction.reply({ content: '✅ Reaction role embed sent.', ephemeral: true });
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('sendverify')
      .setDescription('Send the verification panel')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const payload = buildVerificationPanel();
      await interaction.channel.send(payload);
      await interaction.reply({ content: '✅ Verification panel sent.', ephemeral: true });
    },
  },
];
