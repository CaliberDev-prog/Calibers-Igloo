import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export async function handleRules(message) {
  if (!message.inGuild() || message.author.bot) return;
  if (message.content.trim().toLowerCase() !== '!rules') return;

  const isGuildOwner = message.author.id === message.guild.ownerId;
  const isConfiguredOwner = process.env.OWNER_ID && message.author.id === process.env.OWNER_ID;
  const isAdministrator = message.member.permissions.has(PermissionFlagsBits.Administrator);

  if (!isGuildOwner && !isConfiguredOwner && !isAdministrator) {
    await message.reply({
      content: '❌ You must be the server owner or have **Administrator** permission.',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🧊 Caliber\'s Igloo - Server Rules')
    .setDescription(
      'Welcome to **Caliber\'s Igloo**! Please follow these rules to keep the server fun and safe for everyone.\n\n' +
      'By being here you agree to follow these guidelines.'
    )
    .setColor(0x75cff5)
    .addFields(
      {
        name: '1️⃣ Be Respectful',
        value: 'Treat everyone with respect. No harassment, hate speech, personal attacks, bullying, or discrimination of any kind. Keep disagreements civil.',
      },
      {
        name: '2️⃣ No Spamming',
        value: 'Don\'t spam messages, emojis, pings, images, or copypastas. This includes excessive caps, wall of text, or chain messages.',
      },
      {
        name: '3️⃣ No Advertising or Self-Promotion',
        value: 'Don\'t promote your server, channel, brand, or service without explicit permission from staff. This includes DM advertising.',
      },
      {
        name: '4️⃣ Keep Content Appropriate',
        value: 'No NSFW, gore, graphic, or otherwise inappropriate content. Keep things server-friendly.',
      },
      {
        name: '5️⃣ Use Channels Correctly',
        value: 'Post content in the appropriate channels. Keep conversations on-topic and use the ticket system for support rather than pinging staff.',
      },
      {
        name: '6️⃣ No Doxxing or Sharing Private Info',
        value: 'Don\'t share anyone\'s personal information (yours or others\'). This includes real names, addresses, phone numbers, socials, etc.',
      },
      {
        name: '7️⃣ Listen to Staff',
        value: 'Staff decisions are final. If you have an issue with a decision, open a ticket to discuss it rather than arguing in public channels.',
      },
      {
        name: '8️⃣ No Exploiting or Abuse',
        value: 'Don\'t exploit bugs, loopholes, or abuse bot commands/features. Report issues to staff instead.',
      }
    )
    .setFooter({ text: 'Rules may be updated at any time. Stay frosty! ❄️' })
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
}
