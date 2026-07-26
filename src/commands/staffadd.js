import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const data = new SlashCommandBuilder()
  .setName('staffadd')
  .setDescription('Add a dashboard staff member')
  .addUserOption((opt) => opt.setName('user').setDescription('Discord user').setRequired(true))
  .addStringOption((opt) => opt.setName('username').setDescription('Dashboard login username').setRequired(true))
  .addStringOption((opt) => opt.setName('password').setDescription('Dashboard login password').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const OWNER_ID = process.env.OWNER_ID || '1293164546005012512';
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: 'Owner only.', ephemeral: true });
  }

  const discordUser = interaction.options.getUser('user');
  const username = interaction.options.getString('username').toLowerCase().trim();
  const password = interaction.options.getString('password');

  if (password.length < 6) {
    return interaction.reply({ content: 'Password must be at least 6 characters.', ephemeral: true });
  }

  try {
    const conn = mongoose.connection;
    if (conn.readyState !== 1) {
      return interaction.reply({ content: 'Database not connected.', ephemeral: true });
    }

    const collection = conn.collection('dashboardusers');

    const existing = await collection.findOne({ $or: [{ userId: discordUser.id }, { username }] });
    if (existing) {
      return interaction.reply({ content: 'That user or username already has a dashboard account.', ephemeral: true });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await collection.insertOne({
      userId: discordUser.id,
      username,
      passwordHash,
      role: discordUser.id === OWNER_ID ? 'owner' : 'staff',
      createdAt: new Date(),
    });

    const embed = new EmbedBuilder()
      .setTitle('Dashboard Account Created')
      .addFields(
        { name: 'User', value: `<@${discordUser.id}>`, inline: true },
        { name: 'Username', value: username, inline: true },
      )
      .setColor(0x75CFF5);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    console.error('[STAFFADD] Error:', err);
    await interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
  }
}
