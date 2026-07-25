import { EmbedBuilder } from 'discord.js';
import { setupServer } from '../services/setupService.js';
import {
  handleVerifyButton,
  handleEnterCodeButton,
  handleCodeSubmission,
} from '../services/verificationService.js';
import { sendWelcome } from '../services/welcomeService.js';
import { config } from '../config/verification.js';
import {
  handleTicketButton,
  handleTicketModal,
  handleCloseReasonModal,
  handleCloseRequestModal,
} from '../components/buttons/ticketButtons.js';
import { logError } from '../services/ticketLoggingService.js';

export async function handleInteraction(interaction, commands) {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[COMMAND] ${interaction.commandName}:`, error);
      await logError(interaction.guild, `Command: /${interaction.commandName}`, error, {
        userId: interaction.user.id,
        channelId: interaction.channel?.id,
      });
      const message = {
        content: 'That command failed. Check the bot console for details.',
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred)
        await interaction.followUp(message).catch(() => null);
      else await interaction.reply(message).catch(() => null);
    }
    return;
  }

  if (interaction.isModalSubmit()) {
    try {
      if (interaction.customId === 'verify_code_submit') {
        const result = await handleCodeSubmission(interaction);
        if (result?.success && config.channels.welcome) {
          const welcomeChannel = interaction.guild.channels.cache.get(config.channels.welcome);
          if (welcomeChannel) {
            await sendWelcome(result.member, welcomeChannel).catch(console.error);
          }
        }
        return;
      }

      if (interaction.customId.startsWith('ticket:modal:')) {
        await handleTicketModal(interaction);
        return;
      }

      if (interaction.customId.startsWith('ticket:close-reason:')) {
        await handleCloseReasonModal(interaction);
        return;
      }

      if (interaction.customId.startsWith('ticket:close-request-modal:')) {
        await handleCloseRequestModal(interaction);
        return;
      }
    } catch (error) {
      console.error('[MODAL] Error:', error);
      await logError(interaction.guild, `Modal: ${interaction.customId}`, error, {
        userId: interaction.user.id,
        channelId: interaction.channel?.id,
      });
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({ content: 'An error occurred.', ephemeral: true })
          .catch(() => null);
      }
    }
    return;
  }

  if (interaction.isButton()) {
    try {
      if (interaction.customId.startsWith('ticket:')) {
        await handleTicketButton(interaction);
        return;
      }

      if (interaction.customId === 'verify_panel') {
        await handleVerifyButton(interaction);
        return;
      }

      if (interaction.customId === 'verify_enter_code') {
        await handleEnterCodeButton(interaction);
        return;
      }

      if (interaction.customId.startsWith('setup_')) {
        const [action, requesterId] = interaction.customId.split(':');
        if (interaction.user.id !== requesterId) {
          await interaction.reply({
            content: 'Only the person who opened this setup prompt can use it.',
            ephemeral: true,
          });
          return;
        }

        if (action === 'setup_cancel') {
          await interaction.update({
            content: 'Setup cancelled. No changes were made.',
            embeds: [],
            components: [],
          });
          return;
        }

        await interaction.update({
          content: 'Creating the server structure...',
          embeds: [],
          components: [],
        });

        const result = await setupServer(
          interaction.guild,
          process.env.OWNER_ID,
          (line) => console.log(`[SETUP] ${line}`)
        );
        const embed = new EmbedBuilder()
          .setTitle('Igloo setup complete')
          .addFields(
            { name: 'Roles', value: `${result.rolesCreated} created · ${result.rolesReused} reused`, inline: true },
            { name: 'Categories', value: `${result.categoriesCreated} created · ${result.categoriesReused} reused`, inline: true },
            { name: 'Channels', value: `${result.channelsCreated} created · ${result.channelsReused} reused`, inline: true },
            { name: 'Warnings', value: result.warnings.length ? result.warnings.join('\n').slice(0, 1024) : 'None' }
          )
          .setColor(0x57f287);

        await interaction.editReply({ content: '', embeds: [embed] });
        return;
      }
    } catch (error) {
      console.error('[BUTTON] Error:', error);
      await logError(interaction.guild, `Button: ${interaction.customId}`, error, {
        userId: interaction.user.id,
        channelId: interaction.channel?.id,
      });
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({ content: 'Something went wrong.', ephemeral: true })
          .catch(() => null);
      }
    }
    return;
  }
}
