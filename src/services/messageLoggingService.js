import {
  EmbedBuilder,
  AuditLogEvent,
  Events,
  AttachmentBuilder,
} from 'discord.js';

const LOG_CHANNEL_ID = process.env.MESSAGE_LOG_CHANNEL_ID || '1530531649517916250';

const COLORS = {
  edit: 0x5865f2,
  delete: 0xed4245,
  bulkDelete: 0xe74c3c,
  system: 0x95a5a6,
};

const MAX_FIELD_LEN = 1024;
const MAX_DESC_LEN = 4096;
const AUDIT_LOG_TIMEOUT_MS = 5000;

let logChannelCache = null;

async function getLogChannel(guild) {
  if (logChannelCache && logChannelCache.guild?.id === guild.id) return logChannelCache;
  const ch = guild.channels.cache.get(LOG_CHANNEL_ID) || await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (ch) logChannelCache = ch;
  return ch;
}

function esc(text) {
  if (!text) return '';
  return text.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function truncate(text, max = MAX_FIELD_LEN) {
  if (!text) return '*[empty]*';
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

function formatContent(content) {
  if (!content) return '*[no text content]*';
  return truncate(esc(content));
}

function formatAttachments(attachments) {
  if (!attachments || attachments.size === 0) return null;
  return attachments.map((a) => `[${a.name}](${a.url}) (${formatFileSize(a.size)})`).join('\n');
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatEmbeds(embeds) {
  if (!embeds || embeds.length === 0) return null;
  return embeds.map((e, i) => {
    const parts = [];
    if (e.title) parts.push(`**Title:** ${e.title}`);
    if (e.description) parts.push(`**Desc:** ${truncate(e.description, 200)}`);
    if (e.author?.name) parts.push(`**Author:** ${e.author.name}`);
    return parts.join('\n') || `*[Embed #${i + 1}]*`;
  }).join('\n\n');
}

function formatStickers(stickers) {
  if (!stickers || stickers.size === 0) return null;
  return stickers.map((s) => s.name).join(', ');
}

function isContentOnlyMentionsDiff(oldContent, newContent) {
  const oldNormalized = (oldContent || '').replace(/<@!?\d+>/g, '').trim();
  const newNormalized = (newContent || '').replace(/<@!?\d+>/g, '').trim();
  return oldNormalized === newNormalized;
}

async function fetchAuditLogWhoDeleted(message) {
  try {
    const logs = await message.guild.fetchAuditLogs({
      type: AuditLogEvent.MessageDelete,
      limit: 5,
    });

    const entry = logs.entries.find(
      (e) =>
        e.targetId === message.author.id &&
        e.extra?.channel?.id === message.channel.id &&
        Date.now() - e.createdTimestamp < AUDIT_LOG_TIMEOUT_MS
    );

    if (entry && entry.executorId !== message.author.id) {
      const executor = await message.guild.members.fetch(entry.executorId).catch(() => null);
      return executor || null;
    }
  } catch {
    // Audit log fetch can fail due to permissions
  }
  return null;
}

export async function handleMessageUpdate(oldMessage, newMessage) {
  if (!oldMessage.guild) return;
  if (oldMessage.author?.bot) return;
  if (oldMessage.author.system) return;

  const oldContent = oldMessage.content || '';
  const newContent = newMessage.content || '';
  if (oldContent === newContent) return;
  if (isContentOnlyMentionsDiff(oldContent, newContent)) return;

  const channel = await getLogChannel(oldMessage.guild);
  if (!channel) return;

  const author = oldMessage.author;
  const link = `https://discord.com/channels/${oldMessage.guild.id}/${oldMessage.channel.id}/${oldMessage.id}`;

  const beforeFormatted = formatContent(oldContent);
  const afterFormatted = formatContent(newContent);

  const embed = new EmbedBuilder()
    .setColor(COLORS.edit)
    .setAuthor({
      name: `${author.tag}`,
      iconURL: author.displayAvatarURL({ size: 128 }),
    })
    .setTitle('Message Edited')
    .setDescription(`[Jump to message](${link})`)
    .addFields(
      { name: 'Channel', value: `<#${oldMessage.channel.id}>`, inline: true },
      { name: 'Author', value: `<@${author.id}>`, inline: true },
      { name: 'Message ID', value: oldMessage.id, inline: true },
      { name: 'Before', value: beforeFormatted, inline: false },
      { name: 'After', value: afterFormatted, inline: false },
    )
    .setFooter({ text: `User ID: ${author.id} • Msg ID: ${oldMessage.id}` })
    .setTimestamp();

  channel.send({ embeds: [embed] }).catch(() => null);
}

export async function handleMessageDelete(message) {
  if (!message.guild) return;
  if (message.author?.bot) return;
  if (message.author?.system) return;

  const channel = await getLogChannel(message.guild);
  if (!channel) return;

  const author = message.author;
  const embed = new EmbedBuilder()
    .setColor(COLORS.delete)
    .setAuthor({
      name: `${author.tag}`,
      iconURL: author.displayAvatarURL({ size: 128 }),
    })
    .setTitle('Message Deleted')
    .addFields(
      { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
      { name: 'Author', value: `<@${author.id}>`, inline: true },
      { name: 'Sent At', value: `<t:${Math.floor(message.createdTimestamp / 1000)}:R>`, inline: true },
    )
    .setFooter({ text: `User ID: ${author.id}` })
    .setTimestamp();

  const contentFormatted = formatContent(message.content);
  if (contentFormatted && contentFormatted !== '*[no text content]*') {
    embed.addFields({ name: 'Content', value: contentFormatted, inline: false });
  }

  const attachmentText = formatAttachments(message.attachments);
  if (attachmentText) {
    embed.addFields({ name: `Attachments (${message.attachments.size})`, value: truncate(attachmentText), inline: false });
  }

  const embedText = formatEmbeds(message.embeds);
  if (embedText) {
    embed.addFields({ name: `Embeds (${message.embeds.length})`, value: truncate(embedText), inline: false });
  }

  const stickerText = formatStickers(message.stickers);
  if (stickerText) {
    embed.addFields({ name: 'Stickers', value: stickerText, inline: false });
  }

  const deletedBy = await fetchAuditLogWhoDeleted(message);
  if (deletedBy) {
    embed.addFields({ name: 'Deleted By', value: `<@${deletedBy.id}> (${deletedBy.user.tag})`, inline: true });
    if (deletedBy.id !== author.id) {
      embed.setColor(0xe74c3c);
      embed.setTitle('Message Deleted by Moderator');
    }
  }

  const attachmentFiles = [];
  const cachedAttachments = [...message.attachments.values()].filter(
    (a) => a.size < 8_000_000 && /\.(png|jpe?g|gif|webp)$/i.test(a.name)
  ).slice(0, 4);

  for (const att of cachedAttachments) {
    const fetched = await att.fetch().catch(() => null);
    if (fetched) {
      attachmentFiles.push(new AttachmentBuilder(fetched.attachment, { name: att.name }));
    }
  }

  channel.send({ embeds: [embed], files: attachmentFiles.length > 0 ? attachmentFiles : [] }).catch(() => null);
}

export async function handleMessageDeleteBulk(messages) {
  const first = messages.first();
  if (!first?.guild) return;

  const channel = await getLogChannel(first.guild);
  if (!channel) return;

  const totalDeleted = messages.size;
  const channelMention = `<#${first.channel.id}>`;
  const timeRange = messages.size > 1
    ? `${messages.last().createdAt.toLocaleString()} - ${first.createdAt.toLocaleString()}`
    : first.createdAt.toLocaleString();

  const embed = new EmbedBuilder()
    .setColor(COLORS.bulkDelete)
    .setTitle(`Bulk Delete: ${totalDeleted} Messages`)
    .addFields(
      { name: 'Channel', value: channelMention, inline: true },
      { name: 'Deleted At', value: new Date().toLocaleString(), inline: true },
      { name: 'Time Range', value: timeRange, inline: false },
    )
    .setFooter({ text: `${totalDeleted} messages deleted` })
    .setTimestamp();

  const uniqueAuthors = new Map();
  for (const [, msg] of messages) {
    if (msg.author) {
      const count = uniqueAuthors.get(msg.author.id) || 0;
      uniqueAuthors.set(msg.author.id, { user: msg.author, count: count + 1 });
    }
  }

  if (uniqueAuthors.size > 0) {
    const authorList = [...uniqueAuthors.values()]
      .map(({ user, count }) => `${user.tag} (${count})`)
      .slice(0, 15)
      .join('\n');
    embed.addFields({ name: 'Authors', value: truncate(authorList), inline: false });
  }

  try {
    const logs = await first.guild.fetchAuditLogs({
      type: AuditLogEvent.MessageBulkDelete,
      limit: 1,
    });
    const entry = logs.entries.first();
    if (entry && Date.now() - entry.createdTimestamp < AUDIT_LOG_TIMEOUT_MS) {
      const executor = await first.guild.members.fetch(entry.executorId).catch(() => null);
      if (executor) {
        embed.addFields({ name: 'Deleted By', value: `<@${executor.id}> (${executor.user.tag})`, inline: true });
      }
    }
  } catch {
    // Audit log fetch may fail
  }

  channel.send({ embeds: [embed] }).catch(() => null);
}

export function registerMessageLogging(client) {
  client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
    handleMessageUpdate(oldMessage, newMessage).catch(() => null);
  });

  client.on(Events.MessageDelete, (message) => {
    handleMessageDelete(message).catch(() => null);
  });

  client.on(Events.MessageBulkDelete, (messages) => {
    handleMessageDeleteBulk(messages).catch(() => null);
  });
}
