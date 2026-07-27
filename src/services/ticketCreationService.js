import {
  ChannelType,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { Ticket } from '../database/models/Ticket.js';
import { getNextTicketId } from '../database/models/Counter.js';
import { ticketConfig } from '../config/tickets.js';
import { isMongoConnected } from './mongodb.js';
import { logTicketAction } from './ticketLoggingService.js';
import { buildChannelName, buildChannelTopic } from '../utils/ticketNaming.js';
import {
  checkBlacklist,
  getActiveTicketCount,
  getUserActiveTickets,
} from '../utils/ticketValidation.js';
import { notifyOwner } from './ownerNotify.js';
import { COMPONENTS_V2 } from '../config/constants.js';
import { getDeptConfig } from './ticketQueryService.js';

export function buildOpeningPanel(ticket, deptConfig, creator) {
  const answersText = (ticket.answers || [])
    .map((a) => `**${a.question}:** ${a.answer || '*No answer*'}`)
    .join('\n');

  const statusLine = ticket.locked ? '🔒 Locked' : 'Open';
  const claimLine = ticket.claimedBy ? `\n**Claimed by:** <@${ticket.claimedBy}>` : '';

  const container = new ContainerBuilder()
    .setAccentColor(ticketConfig.colors.primary)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${deptConfig.emoji} **Ticket #${String(ticket.ticketId).padStart(4, '0')}** - ${deptConfig.name}`
      )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Opened by:** <@${ticket.creatorId}>\n**Status:** ${statusLine}${claimLine}\n**Created:** <t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:R>`
      )
    );

  if (answersText) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Questions & Answers**\n${answersText}`)
    );
  }

  if (deptConfig.openingMessage) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(deptConfig.openingMessage)
    );
  }

  const id = ticket.ticketId;

  if (ticket.locked) {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ticket:unlock:${id}`).setLabel('🔓 Unlock').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ticket:close:${id}`).setLabel('🔒 Close').setStyle(ButtonStyle.Danger)
      )
    );
  } else {
    const claimBtn = ticket.claimedBy
      ? new ButtonBuilder().setCustomId(`ticket:unclaim:${id}`).setLabel('🙋 Unclaim').setStyle(ButtonStyle.Secondary)
      : new ButtonBuilder().setCustomId(`ticket:claim:${id}`).setLabel('🙋 Claim').setStyle(ButtonStyle.Success);

    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        claimBtn,
        new ButtonBuilder().setCustomId(`ticket:lock:${id}`).setLabel('🔒 Lock').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ticket:close:${id}`).setLabel('❌ Close').setStyle(ButtonStyle.Danger)
      )
    );
  }

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ticket:request-close:${id}`).setLabel('📋 Request Close').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`ticket:alert:${id}`).setLabel('🔔 Alert').setStyle(ButtonStyle.Primary)
    )
  );

  return container;
}

export async function createTicket(guild, creator, departmentId, answers) {
  const deptConfig = getDeptConfig(departmentId);
  if (!deptConfig || !deptConfig.enabled) throw new Error('Invalid or disabled department.');
  if (!isMongoConnected()) throw new Error('Database not connected.');

  const blacklisted = await checkBlacklist(creator.id, departmentId);
  if (blacklisted) {
    const scope = blacklisted.departmentId === 'global' ? 'globally' : `from ${getDeptConfig(blacklisted.departmentId)?.name || blacklisted.departmentId}`;
    throw new Error(`You are blacklisted ${scope}. Reason: ${blacklisted.reason}`);
  }

  const activeCount = await getActiveTicketCount(creator.id, departmentId, guild);
  if (activeCount >= ticketConfig.ticketLimitPerDepartment) {
    const existing = await getUserActiveTickets(creator.id, departmentId, guild);
    const refs = existing.map((t) => `#${String(t.ticketId).padStart(4, '0')}`).join(', ');
    throw new Error(
      `You already have ${ticketConfig.ticketLimitPerDepartment} active ticket(s) in ${deptConfig.name}: ${refs}`
    );
  }

  const ticketId = await getNextTicketId();
  const channelName = buildChannelName(departmentId, ticketId, creator.username);

  const permissionOverwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: creator.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
  ];

  if (deptConfig.supportRoleId) {
    permissionOverwrites.push({
      id: deptConfig.supportRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    });
  }

  for (const roleId of ticketConfig.staffRoles) {
    if (!permissionOverwrites.some((o) => o.id === roleId)) {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      });
    }
  }

  const parentId = deptConfig.categoryId || null;
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentId,
    permissionOverwrites,
    topic: '',
  });

  const answersArray = [];
  for (const [qId, answer] of Object.entries(answers)) {
    const q = deptConfig.questions.find((x) => x.id === qId);
    answersArray.push({
      questionId: qId,
      question: q?.label || qId,
      answer: answer || '',
    });
  }

  let reportedUserId = '';
  if (departmentId === 'reports') {
    reportedUserId = answers.target_user_id || '';
  }

  const ticket = await Ticket.create({
    ticketId,
    guildId: guild.id,
    channelId: channel.id,
    creatorId: creator.id,
    creatorTag: creator.tag || creator.username,
    departmentId,
    status: 'open',
    answers: answersArray,
    participants: [],
    reportedUserId,
    history: [
      {
        action: 'ticket_opened',
        performedBy: creator.tag || creator.username,
        newValue: deptConfig.name,
        timestamp: new Date(),
      },
    ],
  });

  await channel.setTopic(buildChannelTopic(ticket)).catch(() => null);

  const container = buildOpeningPanel(ticket, deptConfig, creator);

  if (deptConfig.supportRoleId) {
    channel.send({
      content: `<@&${deptConfig.supportRoleId}>`,
      allowedMentions: { roles: [deptConfig.supportRoleId] },
    }).catch(() => null);
  }

  channel.send({
    content: `<@${creator.id}>`,
    allowedMentions: { users: [creator.id] },
  }).catch(() => null);

  const sent = await channel.send({
    components: [container],
    flags: COMPONENTS_V2,
  }).catch((e) => { console.error('[TICKET] Failed to send opening panel:', e); return null; });

  if (sent) {
    await sent.pin().catch((e) => console.error('[TICKET] Failed to pin panel:', e.message));
  }

  logTicketAction(guild, 'ticket_opened', {
    ticketId,
    department: deptConfig.name,
    performedBy: creator.tag || creator.username,
    creatorId: creator.id,
    createdAt: ticket.createdAt,
    description: `Ticket #${String(ticket.ticketId).padStart(4, '0')} opened in ${deptConfig.name}`,
  }).catch(() => null);

  notifyOwner(guild, '🎫 Ticket Opened', {
    ticketId: `#${String(ticketId).padStart(4, '0')}`,
    user: `${creator.tag} (${creator.id})`,
    department: deptConfig.name,
    channel: `<#${channel.id}>`,
    color: ticketConfig.colors.primary,
  }).catch(() => null);

  return { ticket, channel };
}
