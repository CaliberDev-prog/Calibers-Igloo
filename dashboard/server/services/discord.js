const BASE = 'https://discord.com/api/v10';

function headers() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error('DISCORD_BOT_TOKEN not configured');
  return { Authorization: `Bot ${token}` };
}

const GUILD_ID = process.env.DISCORD_GUILD_ID;
if (!GUILD_ID) {
  console.warn('[DISCORD] DISCORD_GUILD_ID not set. Guild-specific API calls will be unavailable.');
}

async function discordFetch(path) {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[Discord] ${res.status} ${path}:`, text.slice(0, 200));
    throw new Error('Discord API request failed');
  }
  return res.json();
}

async function discordMethod(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[Discord] ${res.status} ${method} ${path}:`, text.slice(0, 200));
    throw new Error('Discord API request failed');
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export async function getGuild() {
  return discordFetch(`/guilds/${GUILD_ID}?with_counts=true`);
}

export async function getChannels() {
  const channels = await discordFetch(`/guilds/${GUILD_ID}/channels`);
  return channels.sort((a, b) => a.position - b.position);
}

export async function getRoles() {
  const roles = await discordFetch(`/guilds/${GUILD_ID}/roles`);
  return roles.sort((a, b) => b.position - a.position);
}

export async function getChannel(channelId) {
  return discordFetch(`/channels/${channelId}`);
}

export async function getMessage(channelId, messageId) {
  return discordFetch(`/channels/${channelId}/messages/${messageId}`);
}

export async function getMessages(channelId, limit = 50, before) {
  let path = `/channels/${channelId}/messages?limit=${limit}`;
  if (before) path += `&before=${before}`;
  return discordFetch(path);
}

export async function sendMessage(channelId, content, embed) {
  const body = {};
  if (content) body.content = content;
  if (embed) body.embeds = [embed];
  return discordMethod('POST', `/channels/${channelId}/messages`, body);
}

export async function editMessage(channelId, messageId, content, embed) {
  const body = {};
  if (content !== undefined) body.content = content;
  if (embed) body.embeds = [embed];
  return discordMethod('PATCH', `/channels/${channelId}/messages/${messageId}`, body);
}

export async function deleteMessage(channelId, messageId) {
  await discordMethod('DELETE', `/channels/${channelId}/messages/${messageId}`);
  return { success: true };
}

export async function sendEmbed(channelId, embed) {
  return discordMethod('POST', `/channels/${channelId}/messages`, { embeds: [embed] });
}

export async function getMember(userId) {
  try {
    return await discordFetch(`/guilds/${GUILD_ID}/members/${userId}`);
  } catch {
    return null;
  }
}

export async function getMembers(limit = 50, after = '0') {
  return discordFetch(`/guilds/${GUILD_ID}/members?limit=${limit}&after=${after}`);
}

export async function deleteChannel(channelId) {
  await discordMethod('DELETE', `/channels/${channelId}`);
  return { success: true };
}

export async function editChannel(channelId, data) {
  return discordMethod('PATCH', `/channels/${channelId}`, data);
}

export async function editRole(roleId, data) {
  return discordMethod('PATCH', `/guilds/${GUILD_ID}/roles/${roleId}`, data);
}

export async function deleteRole(roleId) {
  await discordMethod('DELETE', `/guilds/${GUILD_ID}/roles/${roleId}`);
  return { success: true };
}

export async function reorderChannels(positions) {
  return discordMethod('PATCH', `/guilds/${GUILD_ID}/channels`, positions);
}

export async function reorderRoles(positions) {
  return discordMethod('PATCH', `/guilds/${GUILD_ID}/roles`, positions);
}
