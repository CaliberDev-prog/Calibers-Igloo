import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('clearbot')
  .setDescription('Clears recent Penguuu messages from this channel without affecting other users')
  .addIntegerOption((opt) =>
    opt.setName('count')
      .setDescription('Number of recent bot messages to delete (default: all, max 100)')
      .setMinValue(1)
      .setMaxValue(100)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const limit = interaction.options.getInteger('count') ?? 100;

  try {
    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter(msg => msg.author.id === interaction.client.user.id);
    const toDelete = botMessages.first(limit);

    if (!toDelete.length) {
      return interaction.editReply({ content: 'No bot messages found to delete.' });
    }

    const deleted = await interaction.channel.bulkDelete(toDelete, true);
    await interaction.editReply({ content: `Deleted **${deleted.size}** bot message(s).` });
  } catch (err) {
    console.error('[CLEARBOT] Error:', err);
    await interaction.editReply({ content: `Failed to delete messages: ${err.message}` });
  }
}
