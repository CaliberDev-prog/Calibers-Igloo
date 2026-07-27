import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  UserSelectMenuBuilder,
  ComponentType,
} from 'discord.js';
import { ticketConfig } from '../../config/tickets.js';
import * as ticketService from '../../services/ticketService.js';
import * as transcriptService from '../../services/transcriptService.js';
import { logError } from '../../services/ticketLoggingService.js';
import { isStaff } from '../../utils/ticketPermissions.js';
import { getDeptQuestionsForPage, getTotalPages, validateAllAnswers } from '../../utils/ticketValidation.js';
import { COMPONENTS_V2 } from '../../config/constants.js';

const pendingCreations = new Map();

export async function handleTicketButton(interaction) {
  const parts = interaction.customId.split(':');
  if (parts[0] !== 'ticket') return false;
  const action = parts[1];
  const id = parts[2];

  try {
    switch (action) {
      case 'dept':
        return await handleDepartmentSelect(interaction, parts[2]);
      case 'close':
        return await handleClose(interaction, parseInt(id, 10));
      case 'request-close':
        return await handleRequestClose(interaction, parseInt(id, 10));
      case 'confirm-close':
        return await handleConfirmCloseButton(interaction, parseInt(id, 10));
      case 'cancel-close':
        return await handleCancelClose(interaction, parseInt(id, 10));
      case 'alert':
        return await handleAlert(interaction, parseInt(id, 10));
      case 'force-add':
        return await handleForceAdd(interaction, parseInt(id, 10), parts[3]);
      case 'claim':
        return await handleClaim(interaction, parseInt(id, 10));
      case 'unclaim':
        return await handleUnclaim(interaction, parseInt(id, 10));
      case 'lock':
        return await handleLock(interaction, parseInt(id, 10));
      case 'unlock':
        return await handleUnlock(interaction, parseInt(id, 10));
      case 'next-page':
        return await handleNextPage(interaction, parts[3], parseInt(parts[4], 10));
      default:
        return false;
    }
  } catch (err) {
    console.error(`[TICKET] Button handler error (${action}):`, err);
    await logError(interaction.guild, `Button: ${action}`, err, {
      ticketId: parseInt(id, 10),
      userId: interaction.user.id,
      channelId: interaction.channel?.id,
    });
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => null);
    }
    return true;
  }
}

async function handleDepartmentSelect(interaction, departmentId) {
  const deptConfig = ticketService.getDeptConfig(departmentId);
  if (!deptConfig || !deptConfig.enabled) {
    return interaction.reply({ content: '❌ Unknown or disabled department.', ephemeral: true });
  }

  pendingCreations.delete(interaction.user.id);

  try {
    const { checkBlacklist, getActiveTicketCount } = await import('../../utils/ticketValidation.js');
    const blacklisted = await checkBlacklist(interaction.user.id, departmentId);
    if (blacklisted) {
      const scope = blacklisted.departmentId === 'global' ? 'globally' : `from ${deptConfig.name}`;
      return interaction.reply({
        content: `❌ You are blacklisted ${scope}. Reason: ${blacklisted.reason}`,
        ephemeral: true,
      });
    }

    const activeCount = await getActiveTicketCount(interaction.user.id, departmentId, interaction.guild);
    if (activeCount >= ticketConfig.ticketLimitPerDepartment) {
      return interaction.reply({
        content: `❌ You already have ${ticketConfig.ticketLimitPerDepartment} active ticket(s) in ${deptConfig.name}.`,
        ephemeral: true,
      });
    }
  } catch (err) {
    return interaction.reply({ content: '❌ Validation failed. Try again.', ephemeral: true });
  }

  const totalPages = getTotalPages(departmentId);

  pendingCreations.set(interaction.user.id, {
    departmentId,
    answers: {},
    currentPage: 1,
    totalPages,
    startedAt: Date.now(),
  });

  setTimeout(() => {
    const pending = pendingCreations.get(interaction.user.id);
    if (pending && pending.departmentId === departmentId && Date.now() - pending.startedAt > 600000) {
      pendingCreations.delete(interaction.user.id);
    }
  }, 600000);

  return showModalPage(interaction, departmentId, 1, {});
}

async function showModalPage(interaction, departmentId, page, currentAnswers) {
  const questions = getDeptQuestionsForPage(departmentId, page);
  if (questions.length === 0) {
    return interaction.reply({ content: '❌ No questions configured for this page.', ephemeral: true });
  }

  const deptConfig = ticketService.getDeptConfig(departmentId);
  const totalPages = getTotalPages(departmentId);
  const modal = new ModalBuilder()
    .setCustomId(`ticket:modal:${departmentId}:${page}`)
    .setTitle(`${deptConfig.emoji} ${deptConfig.name} - Page ${page}/${totalPages}`);

  for (const q of questions) {
    const input = new TextInputBuilder()
      .setCustomId(q.id)
      .setLabel(q.label)
      .setPlaceholder(q.placeholder || '')
      .setRequired(q.required !== false);

    if (q.type === 'paragraph') {
      input.setStyle(TextInputStyle.Paragraph);
    } else {
      input.setStyle(TextInputStyle.Short);
    }

    if (currentAnswers[q.id]) {
      input.setValue(currentAnswers[q.id]);
    }

    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }

  await interaction.showModal(modal);
}

export async function handleTicketModal(interaction) {
  const parts = interaction.customId.split(':');
  if (parts[0] !== 'ticket' || parts[1] !== 'modal') return false;

  const departmentId = parts[2];
  const page = parseInt(parts[3], 10);
  const deptConfig = ticketService.getDeptConfig(departmentId);
  if (!deptConfig) {
    return interaction.reply({ content: '❌ Unknown department.', ephemeral: true });
  }

  const pending = pendingCreations.get(interaction.user.id);
  if (!pending || pending.departmentId !== departmentId) {
    return interaction.reply({ content: '❌ Session expired. Please start again.', ephemeral: true });
  }

  const questions = getDeptQuestionsForPage(departmentId, page);
  for (const q of questions) {
    try {
      const value = interaction.fields.getTextInputValue(q.id);
      pending.answers[q.id] = value;
    } catch {
      if (q.required) {
        pending.answers[q.id] = '';
      }
    }
  }

  const allQuestions = deptConfig.questions.filter((q) => q.enabled);
  const answeredQuestions = allQuestions.filter((q) => q.page <= page);
  const validation = validateAllAnswers(pending.answers, answeredQuestions);
  if (!validation.valid) {
    pendingCreations.delete(interaction.user.id);
    return interaction.reply({ content: `❌ ${validation.error}`, ephemeral: true });
  }

  if (page < pending.totalPages) {
    pending.currentPage = page + 1;
    await interaction.deferUpdate();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket:next-page:${departmentId}:${page + 1}`)
        .setLabel(`Page ${page + 1} of ${pending.totalPages} - Continue`)
        .setStyle(ButtonStyle.Primary)
    );
    await interaction.followUp({ content: `📋 Page ${page + 1} of ${pending.totalPages}`, components: [row], ephemeral: true });
    return true;
  }

  pendingCreations.delete(interaction.user.id);

  await interaction.deferReply({ ephemeral: true });

  try {
    const { ticket, channel } = await ticketService.createTicket(
      interaction.guild,
      interaction.user,
      departmentId,
      pending.answers
    );

    await interaction.editReply({
      content: `✅ Ticket created! ${channel}`,
    });
  } catch (err) {
    console.error('[TICKET] Creation failed:', err);
    await logError(interaction.guild, 'Ticket creation', err, {
      userId: interaction.user.id,
    });
    await interaction.editReply({
      content: `❌ Failed to create ticket: ${err.message}`,
    });
  }

  return true;
}

async function handleClose(interaction, ticketId) {
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
    const { delivered, reason: dmReason } = await generateAndSendTranscript(interaction, ticket);

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

async function handleConfirmCloseButton(interaction, ticketId) {
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

async function handleRequestClose(interaction, ticketId) {
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

async function handleNextPage(interaction, departmentId, page) {
  const pending = pendingCreations.get(interaction.user.id);
  if (!pending || pending.departmentId !== departmentId) {
    return interaction.reply({ content: '❌ Session expired. Please start again.', ephemeral: true });
  }
  return showModalPage(interaction, departmentId, page, pending.answers);
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
      const { ActionRowBuilder: AR, ButtonBuilder: BT, ButtonStyle: BS } = await import('discord.js');
      await opener.send({
        embeds: [dmEmbed],
        components: [new AR().addComponents(BT().setLabel('Open Ticket').setStyle(BS.Link).setURL(`https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}`))],
      }).catch(() => null);
    }

    await interaction.editReply({ content: '✅ Close request sent.' });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function handleCancelClose(interaction, ticketId) {
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

  const { Ticket } = await import('../../database/models/Ticket.js');
  await Ticket.findOneAndUpdate(
    { ticketId },
    { closeRequest: { active: false, requestedBy: '', requestedAt: null } }
  );

  await interaction.editReply({ content: 'Close request cancelled.', embeds: [], components: [] });
}

async function handleAlert(interaction, ticketId) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: '❌ Staff only.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const { ticket, dmFailed } = await ticketService.handleAlert(interaction.channel, interaction.user);
    const dmStatus = dmFailed ? ' (DM failed)' : ' (DM sent)';
    await interaction.editReply({
      content: `🔔 Alert sent to <@${ticket.creatorId}>${dmStatus}`,
    });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function handleForceAdd(interaction, ticketId, targetId) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: '❌ Staff only.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!targetMember) {
    return interaction.editReply({ content: '❌ User not found.' });
  }

  try {
    await ticketService.forceAddParticipant(interaction.channel, targetMember, interaction.user);
    await interaction.editReply({ content: `✅ ${targetMember} added to ticket.` });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function handleClaim(interaction, ticketId) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: '❌ Staff only.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await ticketService.claimTicket(interaction.channel, interaction.user);
    await interaction.editReply({ content: `✅ ${interaction.user} claimed this ticket.` });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function handleUnclaim(interaction, ticketId) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: '❌ Staff only.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await ticketService.unclaimTicket(interaction.channel, interaction.user);
    await interaction.editReply({ content: `✅ ${interaction.user} unclaimed this ticket.` });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function handleLock(interaction, ticketId) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: '❌ Staff only.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await ticketService.lockTicket(interaction.channel, interaction.user);
    await interaction.editReply({ content: '🔒 Ticket locked. The user can no longer send messages.' });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function handleUnlock(interaction, ticketId) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: '❌ Staff only.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await ticketService.unlockTicket(interaction.channel, interaction.user);
    await interaction.editReply({ content: '🔓 Ticket unlocked. The user can now send messages again.' });
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}


