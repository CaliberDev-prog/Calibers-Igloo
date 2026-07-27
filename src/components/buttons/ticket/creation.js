import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { ticketConfig } from '../../../config/tickets.js';
import * as ticketService from '../../../services/ticketService.js';
import { getDeptQuestionsForPage, getTotalPages, validateAllAnswers } from '../../../utils/ticketValidation.js';

const pendingCreations = new Map();

export async function handleDepartmentSelect(interaction, departmentId) {
  const deptConfig = ticketService.getDeptConfig(departmentId);
  if (!deptConfig || !deptConfig.enabled) {
    return interaction.reply({ content: '❌ Unknown or disabled department.', ephemeral: true });
  }

  pendingCreations.delete(interaction.user.id);

  try {
    const { checkBlacklist, getActiveTicketCount } = await import('../../../utils/ticketValidation.js');
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
  } catch {
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

  const { logError } = await import('../../../services/ticketLoggingService.js');

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

export async function handleNextPage(interaction, departmentId, page) {
  const pending = pendingCreations.get(interaction.user.id);
  if (!pending || pending.departmentId !== departmentId) {
    return interaction.reply({ content: '❌ Session expired. Please start again.', ephemeral: true });
  }
  return showModalPage(interaction, departmentId, page, pending.answers);
}
