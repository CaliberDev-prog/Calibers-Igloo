import { EmbedBuilder } from 'discord.js';

const LOG_CHANNEL_ID = process.env.MESSAGE_LOG_CHANNEL_ID || '1530531649517916250';

async function getLogChannel(guild) {
  return guild.channels.cache.get(LOG_CHANNEL_ID) || guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
}

export async function handleMessageUpdate(oldMessage, newMessage) {
  if (!oldMessage.guild) return;
  if (oldMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  const channel = await getLogChannel(oldMessage.guild);
  if (!channel) return;

  const before = oldMessage.content || '';
  const after = newMessage.content || '';
  const truncatedBefore = before.length > 1024 ? before.slice(0, 1021) + '...' : before || '*[empty]*';
  const truncatedAfter = after.length > 1024 ? after.slice(0, 1021) + '...' : after || '*[empty]*';

  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL() })
    .setTitle('Message Edited')
    .addFields(
      { name: 'Channel', value: `<#${oldMessage.channel.id}>`, inline: true },
      { name: 'Before', value: truncatedBefore, inline: false },
      { name: 'After', value: truncatedAfter, inline: false },
    )
    .setFooter({ text: `ID: ${oldMessage.author.id}` })
    .setTimestamp();

  channel.send({ embeds: [embed] }).catch(() => null);
}

export async function handleMessageDelete(message) {
  if (!message.guild) return;
  if (message.author?.bot) return;

  const channel = await getLogChannel(message.guild);
  if (!channel) return;

  const content = message.content || '*[no text content]*';
  const truncated = content.length > 1024 ? content.slice(0, 1021) + '...' : content;

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
    .setTitle('Message Deleted')
    .addFields(
      { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
      { name: 'Author', value: `<@${message.author.id}>`, inline: true },
      { name: 'Content', value: truncated, inline: false },
    )
    .setFooter({ text: `ID: ${message.author.id}` })
    .setTimestamp();

  if (message.attachments.size > 0) {
    const files = message.attachments.map((a) => a.url).join('\n');
    embed.addFields({ name: 'Attachments', value: files.slice(0, 1024), inline: false });
  }

  channel.send({ embeds: [embed] }).catch(() => null);
}
