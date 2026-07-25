import { randomBytes } from 'node:crypto';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { config } from '../config/verification.js';
import { notifyOwner } from './ownerNotify.js';

const TIMEOUT_LOG_CHANNEL = '1530531652122579066';
const activeSessions = new Map();

async function sendTimeoutNotification(userId, guild) {
  if (!guild) return;
  const logChannel = await guild.channels.fetch(TIMEOUT_LOG_CHANNEL).catch(() => null);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setTitle('⏰ Verification Timed Out')
    .setDescription(`Verification session for <@${userId}> has expired.\nUser did not complete verification within the time limit.`)
    .setColor(0xed4245)
    .setTimestamp();
  await logChannel.send({ embeds: [embed] }).catch(() => null);

  await notifyOwner(guild, '⏰ Verification Timed Out', {
    user: `<@${userId}>`,
    color: 0xed4245,
  });
}

function generateCode() {
  const { codeMinLength, codeMaxLength, charset } = config.verification;
  const length = codeMinLength + Math.floor(Math.random() * (codeMaxLength - codeMinLength + 1));
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += charset[bytes[i] % charset.length];
  }
  return code;
}

function createSession(userId, guild) {
  const code = generateCode();
  activeSessions.set(userId, {
    code,
    expiresAt: Date.now() + config.verification.timeoutMs,
  });

  setTimeout(() => {
    if (activeSessions.has(userId)) {
      const session = activeSessions.get(userId);
      if (session && Date.now() >= session.expiresAt) {
        activeSessions.delete(userId);
        sendTimeoutNotification(userId, guild);
      }
    }
  }, config.verification.timeoutMs);

  return code;
}

function getSession(userId) {
  const session = activeSessions.get(userId);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(userId);
    return null;
  }
  return session;
}

function cleanupSession(userId) {
  activeSessions.delete(userId);
}

function isExpired(session) {
  return Date.now() > session.expiresAt;
}

async function getOrCreateUnverifiedRole(guild) {
  const roleName = config.roles.unverified;
  let role = guild.roles.cache.find((r) => r.name === roleName);
  if (!role) {
    role = await guild.roles.create({
      name: roleName,
      color: 0xa8d8ea,
      reason: 'Auto-created for verification system',
    });
  }
  return role;
}

async function getVerifiedRole(guild) {
  return guild.roles.cache.find((r) => r.name === config.roles.verified) || null;
}

async function setupChannelPermissions(guild) {
  if (!config.setupPermissions) return;
  if (!config.channels.verification) return;

  const unverifiedRole = await getOrCreateUnverifiedRole(guild);
  const verificationChannelId = String(config.channels.verification);

  for (const [, channel] of guild.channels.cache) {
    if (channel.isVoiceBased()) continue;

    if (String(channel.id) === verificationChannelId) {
      await channel.permissionOverwrites
        .edit(unverifiedRole, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          AddReactions: true,
        })
        .catch(() => null);
    } else if (!config.exemptChannels.includes(String(channel.id))) {
      await channel.permissionOverwrites
        .edit(unverifiedRole, { ViewChannel: false })
        .catch(() => null);
    }
  }
}

function buildCodeMessage(code) {
  const minutes = config.verification.timeoutMs / 60000;
  const embed = new EmbedBuilder()
    .setTitle(config.embeds.codePrompt.title)
    .setDescription(
      `Your code is:\n\n**\`${code}\`**\n\n` +
        '📝 Type this code in the modal to verify.\n' +
        `⏰ This code expires in **${minutes} minute(s)**.\n\n` +
        '*Tip: The code is case-insensitive!*'
    )
    .setColor(config.colors.primary)
    .setFooter({ text: config.embeds.codePrompt.footer });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_enter_code')
      .setLabel('🔒 Enter Code')
      .setStyle(ButtonStyle.Success)
  );

  return { embeds: [embed], components: [row] };
}

function buildVerificationPanel() {
  const embed = new EmbedBuilder()
    .setTitle(config.embeds.panel.title)
    .setDescription(config.embeds.panel.description)
    .setColor(config.colors.primary)
    .setFooter({ text: config.embeds.panel.footer })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_panel')
      .setLabel('❄️ Verify Me')
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}

async function sendVerificationPanel(channel) {
  await channel.send(buildVerificationPanel());
}

async function handleVerifyButton(interaction) {
  const verifiedRole = await getVerifiedRole(interaction.guild);
  if (verifiedRole && interaction.member.roles.cache.has(verifiedRole.id)) {
    return interaction.reply({
      content: '✅ You\'re already verified!',
      ephemeral: true,
    });
  }

  const code = createSession(interaction.user.id, interaction.guild);
  await interaction.reply({ ...buildCodeMessage(code), ephemeral: true });
}

async function handleEnterCodeButton(interaction) {
  const session = getSession(interaction.user.id);

  if (!session) {
    return interaction.reply({
      content: '⚠️ No active verification session. Click the **Verify** button on the panel first.',
      ephemeral: true,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId('verify_code_submit')
    .setTitle('🔒 Enter Verification Code');

  const codeInput = new TextInputBuilder()
    .setCustomId('code')
    .setLabel('Verification Code')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Type the code here...')
    .setRequired(true)
    .setMaxLength(config.verification.codeMaxLength);

  modal.addComponents(new ActionRowBuilder().addComponents(codeInput));
  await interaction.showModal(modal);
}

async function handleCodeSubmission(interaction) {
  const userId = interaction.user.id;
  const session = getSession(userId);
  const input = interaction.fields.getTextInputValue('code').trim();

  if (!session) {
    return interaction.reply({
      content: '⚠️ No active verification session. Click the **Verify** button on the panel to start.',
      ephemeral: true,
    });
  }

  if (isExpired(session)) {
    cleanupSession(userId);
    const newCode = createSession(userId, interaction.guild);
    const embed = new EmbedBuilder()
      .setTitle(config.embeds.expired.title)
      .setDescription(
        `Your previous code expired. Here's a new one:\n\n**\`${newCode}\`**\n\n` +
          '📝 Type this code in the modal to verify.'
      )
      .setColor(config.colors.warn)
      .setFooter({ text: config.embeds.expired.footer });

    return interaction.reply({ ...buildCodeMessage(newCode), embeds: [embed], ephemeral: true });
  }

  if (input.toLowerCase() === session.code.toLowerCase()) {
    cleanupSession(userId);

    const verifiedRole = await getVerifiedRole(interaction.guild);
    if (verifiedRole) {
      await interaction.member.roles.add(verifiedRole).catch(() => null);
    }

    const unverifiedRole = await getOrCreateUnverifiedRole(interaction.guild);
    if (interaction.member.roles.cache.has(unverifiedRole.id)) {
      await interaction.member.roles.remove(unverifiedRole).catch(() => null);
    }

    const msg = config.embeds.success;
    const embed = new EmbedBuilder()
      .setTitle(msg.title)
      .setDescription(msg.description(interaction.member))
      .setColor(config.colors.success)
      .setFooter({ text: msg.footer });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return { success: true, member: interaction.member };
  }

  const newCode = createSession(userId, interaction.guild);
  const embed = new EmbedBuilder()
    .setTitle(config.embeds.incorrect.title)
    .setDescription(
      `That code was incorrect. Here's a new one:\n\n**\`${newCode}\`**\n\n` +
        '📝 Type this code in the modal to verify.\n' +
        '*Tip: The code is case-insensitive!*'
    )
    .setColor(config.colors.error)
    .setFooter({ text: config.embeds.incorrect.footer });

  await interaction.reply({ ...buildCodeMessage(newCode), embeds: [embed], ephemeral: true });
  return null;
}

export {
  generateCode,
  createSession,
  getSession,
  cleanupSession,
  getOrCreateUnverifiedRole,
  getVerifiedRole,
  setupChannelPermissions,
  buildVerificationPanel,
  sendVerificationPanel,
  handleVerifyButton,
  handleEnterCodeButton,
  handleCodeSubmission,
};
