import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const FILE_PATH = join(DATA_DIR, 'reminders.json');

function load() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (!existsSync(FILE_PATH)) return [];
    const raw = readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function save(reminders) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(FILE_PATH, JSON.stringify(reminders, null, 2), 'utf-8');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function initReminderService(client) {
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) return;

  const check = async () => {
    try {
      const reminders = load();
      const now = Date.now();
      let changed = false;

      for (const reminder of reminders) {
        if (!reminder.active) continue;
        const elapsed = now - new Date(reminder.cycleStart).getTime();
        const threshold = reminder.intervalMinutes * 60 * 1000;
        if (elapsed < threshold) continue;

        const channel = guild.channels.cache.get(reminder.channelId);
        if (!channel) continue;

        const user = guild.members.cache.get(reminder.userId) || await guild.members.fetch(reminder.userId).catch(() => null);
        if (!user) continue;

        const msg = await channel.send(`<@${reminder.userId}> ${reminder.message}`).catch(() => null);
        if (msg) {
          reminder.lastPingedAt = new Date().toISOString();
          reminder.cycleStart = new Date().toISOString();
          reminder.totalPingsSent = (reminder.totalPingsSent || 0) + 1;
          changed = true;
        }
      }

      if (changed) save(reminders);
    } catch (err) {
      console.error('[REMINDER] Check failed:', err.message);
    }
  };

  const interval = setInterval(check, 60 * 1000);
  check();

  return interval;
}

export async function handleReminderMessage(message) {
  if (message.author.bot) return;
  try {
    const reminders = load();
    let changed = false;

    for (const r of reminders) {
      if (!r.active) continue;
      if (r.channelId === message.channel.id && r.userId === message.author.id) {
        r.cycleStart = new Date().toISOString();
        r.lastResponseAt = new Date().toISOString();
        r.totalResponses = (r.totalResponses || 0) + 1;
        changed = true;
      }
    }

    if (changed) {
      save(reminders);
      console.log(`[REMINDER] Response detected: ${message.author.tag} in #${message.channel.name}`);
    }
  } catch (err) {
    console.error('[REMINDER] Message handler error:', err.message);
  }
}

export async function createReminder({ userId, channelId, guildId, message, intervalMinutes, createdBy }) {
  const reminders = load();
  const reminder = {
    _id: generateId(),
    userId,
    channelId,
    guildId,
    message: message || 'Time for your reminder!',
    intervalMinutes: Math.max(1, Math.min(1440, intervalMinutes || 5)),
    active: true,
    createdBy,
    lastPingedAt: null,
    lastResponseAt: null,
    cycleStart: new Date().toISOString(),
    totalPingsSent: 0,
    totalResponses: 0,
    createdAt: new Date().toISOString(),
  };
  reminders.push(reminder);
  save(reminders);
  return reminder;
}

export async function deleteReminder(reminderId) {
  const reminders = load();
  const idx = reminders.findIndex((r) => r._id === reminderId);
  if (idx === -1) return null;
  const [removed] = reminders.splice(idx, 1);
  save(reminders);
  return removed;
}

export async function listReminders(guildId) {
  const reminders = load();
  return reminders
    .filter((r) => r.guildId === guildId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function pauseReminder(reminderId) {
  const reminders = load();
  const reminder = reminders.find((r) => r._id === reminderId);
  if (!reminder) return null;
  reminder.active = false;
  save(reminders);
  return reminder;
}

export async function resumeReminder(reminderId) {
  const reminders = load();
  const reminder = reminders.find((r) => r._id === reminderId);
  if (!reminder) return null;
  reminder.active = true;
  reminder.cycleStart = new Date().toISOString();
  save(reminders);
  return reminder;
}
