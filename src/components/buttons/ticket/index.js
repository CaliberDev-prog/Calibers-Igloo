import { handleDepartmentSelect, handleTicketModal, handleNextPage } from './creation.js';
import { handleClose, handleCloseReasonModal, handleConfirmCloseButton, handleRequestClose, handleCloseRequestModal, handleCancelClose } from './close.js';
import { handleAlert, handleForceAdd, handleClaim, handleUnclaim, handleLock, handleUnlock } from './actions.js';
import { logError } from '../../../services/ticketLoggingService.js';

export { handleTicketModal, handleCloseReasonModal, handleCloseRequestModal };

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
