import * as ticketService from '../../../services/ticketService.js';
import { isStaff } from '../../../utils/ticketPermissions.js';

export async function handleAlert(interaction, ticketId) {
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

export async function handleForceAdd(interaction, ticketId, targetId) {
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

export async function handleClaim(interaction, ticketId) {
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

export async function handleUnclaim(interaction, ticketId) {
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

export async function handleLock(interaction, ticketId) {
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

export async function handleUnlock(interaction, ticketId) {
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
