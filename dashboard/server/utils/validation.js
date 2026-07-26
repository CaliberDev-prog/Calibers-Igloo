const DISCORD_ID_RE = /^\d{17,20}$/;
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;

export function isDiscordId(value) {
  return typeof value === 'string' && DISCORD_ID_RE.test(value);
}

export function isObjectId(value) {
  return typeof value === 'string' && OBJECT_ID_RE.test(value);
}

export function parseTicketId(value) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n < 1 ? null : n;
}
