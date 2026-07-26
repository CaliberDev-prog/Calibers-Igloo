import { EmbedBuilder } from 'discord.js';

const OWNER_ID = process.env.OWNER_ID;

let alertsEnabled = true;
let cachedClient = null;

export function setClient(client) {
  cachedClient = client;
}

export function isAlertsEnabled() {
  return alertsEnabled;
}

export function setAlertsEnabled(enabled) {
  alertsEnabled = enabled;
}

export async function notifyOwner(guild, action, details = {}) {
  if (!alertsEnabled) return;

  const client = cachedClient || guild?.client;
  if (!client) return;

  const owner = await client.users.fetch(OWNER_ID).catch(() => null);
  if (!owner) return;

  const color = details.color || 0x75cff5;

  const fields = [];
  const truncate = (s, max = 1024) => String(s || '').slice(0, max);
  if (details.user) fields.push({ name: 'User', value: truncate(details.user), inline: true });
  if (details.performedBy) fields.push({ name: 'By', value: truncate(details.performedBy), inline: true });
  if (details.department) fields.push({ name: 'Department', value: truncate(details.department), inline: true });
  if (details.channel) fields.push({ name: 'Channel', value: truncate(details.channel), inline: true });
  if (details.ticketId) fields.push({ name: 'Ticket', value: truncate(details.ticketId), inline: true });
  if (details.reason) fields.push({ name: 'Reason', value: truncate(details.reason), inline: false });
  if (details.extra) fields.push({ name: 'Details', value: truncate(details.extra), inline: false });

  const embed = new EmbedBuilder()
    .setTitle(action)
    .setColor(color)
    .setTimestamp();

  if (details.description) {
    embed.setDescription(details.description);
  }

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  await owner.send({ embeds: [embed] }).catch(() => null);
}
