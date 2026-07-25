import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription("Preview and create Caliber's Igloo server structure.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("Caliber's Igloo Setup")
    .setDescription('This creates the approved roles, public channels, cabins, staff area, and **Vault**. Existing items with matching names are reused. Nothing is deleted.')
    .addFields(
      { name: 'Categories', value: 'START HERE, CALIBER, COMMUNITY, GAMING, CREATE, SUPPORT, CABINS, STAFF AREA, VAULT' },
      { name: 'Safety', value: 'Idempotent setup: re-running it will not intentionally duplicate exact matching names.' }
    )
    .setColor(0x9eddf9);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`setup_confirm:${interaction.user.id}`).setLabel('Create Server').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`setup_cancel:${interaction.user.id}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}
