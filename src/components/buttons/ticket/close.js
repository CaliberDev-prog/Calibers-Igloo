import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { ticketConfig } from '../../../config/tickets.js';
import * as ticketService from '../../../services/ticketService.js';
import * as transcriptService from '../../../services/transcriptService.js';
import { logError } from '../../../services/ticketLoggingService.js';
import { isStaff } from '../../../utils/ticketPermissions.js';
import { COMPONENTS_V2 } from '../../../config/constants.js';

async function generateAndSendTranscript(interaction) {
  try {
    const { attachment, filename } = await transcriptService.generateStaffTranscript(interaction.channel);
    const ticket = await ticketService.getTicketByChannelId(interaction.channel.id);
    const logMsg = await transcriptService.sendTranscriptToLogChannel(interaction.guild, attachment, ticket);

    const { delivered, reason } = await transcriptService.sendTranscriptDM(
      interaction.guild,
      ticket.creatorId,
      attachment,
      ticket
    );

    await transcriptService.saveTranscriptInfo(
      ticket.ticketId, interaction.guild, filename,
      interaction.user.tag || interaction.user.username, logMsg?.id || '', delivered
    );

    return { delivered, reason };
  } catch (transcriptErr) {
    console.error('[TRANSCRIPT] Generation failed:', transcriptErr.message);
    await logError(interaction.guild, 'Transcript generation', transcriptErr, {
      channelId: interaction.channel?.id,
    }).catch(() => null);
    return { delivered: false, reason: 'Generation failed' };
  }
}

export async function handleClose(interaction, ticketId) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: '❌ Staff only.', ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`ticket:close-reason:${ticketId}`)
    .setTitle(`🔒 Close Ticket #${String(ticketId).padStart(4, '0')}`);

  const reasonInput = new TextInputBuilder()
    .setCustomId('reason')
    .setLabel('Reason for closing')
    .setPlaceholder('Enter the reason...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
  await interaction.showModal(modal);
}

export async function handleCloseReasonModal(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: '❌ Staff only.', ephemeral: true });
  }

  const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided';

  await interaction.deferReply();

  try {
    const ticket = await ticketService.closeTicketAndDelete(interaction.channel, interaction.user, reason);
    const { delivered, reason: dmReason } = await generateAndSendTranscript(interaction);

    await interaction.editReply({ content: `🔒 Ticket #${String(ticket.ticketId).padStart(4, '0')} closed. This channel will be deleted in 10 seconds.` });

    if (!delivered) {
      await interaction.channel.send({
        content: `⚠️ Could not DM the transcript to the ticket creator: ${dmReason || 'Unknown reason'}`,
      }).catch(() => null);
    }
  } catch (err) {
    console.error('[TICKET] Close failed:', err);
    await logError(interaction.guild, 'Ticket close', err, {
      ticketId: parseInt(interaction.customId.split(':')[2], 10),
      userId: interaction.user.id,
      channelId: interaction.channel?.id,
    });
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

export async function handleConfirmCloseButton(interaction, ticketId) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: '❌ Staff only.', ephemeral: true });
  }

  await interaction.deferReply();

  try {
    const transcriptResult = await generateAndSendTranscript(interaction);
    const ticket = await ticketService.closeTicketAndDelete(interaction.channel, interaction.user, 'Confirmed by staff');

    await interaction.editReply({ content: `🔒 Ticket #${String(ticket.ticketId).padStart(4, '0')} closed. This channel will be deleted in 10 seconds.` });
  } catch (err) {
    console.error('[TICKET] Confirm close failed:', err);
    await logError(interaction.guild, 'Ticket confirm close', err, {
      ticketId,
      userId: interaction.user.id,
      channelId: interaction.channel?.id,
    });
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

export async function handleRequestClose(interaction, ticketId) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket:close-request-modal:${ticketId}`)
    .setTitle(`📋 Request Close #${String(ticketId).padStart(4, '0')}`);

  const reasonInput = new TextInputBuilder()
    .setCustomId('reason')
    .setLabel('Reason (optional)')
    .setPlaceholder('Why are you requesting to close? Leave blank for no reason.')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
  await interaction.showModal(modal);
}

export async function handleCloseRequestModal(interaction) {
  const parts = interaction.customId.split(':');
  const ticketId = parseInt(parts[2], 10);
  const reason = interaction.fields.getTextInputValue('reason') || '';

  await interaction.deferReply({ ephemeral: true });

  try {
    const ticket = await ticketService.requestClose(interaction.channel, interaction.user, reason);

    const reasonText = reason ? `\n**Reason:** ${reason}` : '';
    const embed = new EmbedBuilder()
      .setTitle('📋 Close Requested')
      .setDescription(`${interaction.user} is requesting to close this ticket.${reasonText}\nStaff, confirm or cancel below.`)
      .setColor(ticketConfig.colors.warn);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket:confirm-close:${ticket.ticketId}`)
        .setLabel('🔒 Confirm Close')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`ticket:cancel-close:${ticket.ticketId}`)
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.channel.send({
      content: `<@${ticket.creatorId}>`,
      allowedMentions: { users: [ticket.creatorId] },
      embeds: [embed],
      components: [row],
    });

    const opener = await interaction.guild.members.fetch(ticket.creatorId).catch(() => null);
    if (opener) {
      const dmEmbed = new EmbedBuilder()
        .setTitle('📋 Close Requested')
        .setDescription(`Your ticket **#${String(ticket.ticketId).padStart(4, '0')}** has been requested to close by a staff member.\n\nIf you still need help, send a message in the ticket before it is closed.`)
        .setColor(ticketConfig.colors.warn)
        .setTimestamp();
      await opener.send({
        embeds: [dmEmbed],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('Open Ticket').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}`)
        )],
      }).catch(() => null);
    }

    await interaction.editReply({ content: '✅ Close request sent.' });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

export async function handleCancelClose(interaction, ticketId) {
  const ticket = await ticketService.getTicketById(ticketId);
  if (!ticket) {
    return interaction.update({ content: '❌ Ticket not found.', embeds: [], components: [] });
  }

  if (ticket.closeRequest?.requestedBy !== (interaction.user.tag || interaction.user.username)) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Only the requester or staff can cancel.', ephemeral: true });
    }
  }

  await interaction.deferUpdate();

  const { Ticket } = await import('../../../database/models/Ticket.js');
  await Ticket.findOneAndUpdate(
    { ticketId },
    { closeRequest: { active: false, requestedBy: '', requestedAt: null } }
  );

  await interaction.editReply({ content: 'Close request cancelled.', embeds: [], components: [] });
}
