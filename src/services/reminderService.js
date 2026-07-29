import { Reminder } from '../database/models/Reminder.js';
import { isMongoConnected } from './mongodb.js';

export async function initReminderService(client) {
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) return;

  const check = async () => {
    if (!isMongoConnected()) return;
    try {
      const due = await Reminder.find({ active: true, cycleStart: { $lte: new Date(Date.now() - 60000) } });
      for (const reminder of due) {
        const channel = guild.channels.cache.get(reminder.channelId);
        if (!channel) continue;
        const elapsed = Date.now() - new Date(reminder.cycleStart).getTime();
        const threshold = reminder.intervalMinutes * 60 * 1000;
        if (elapsed < threshold) continue;

        const user = guild.members.cache.get(reminder.userId) || await guild.members.fetch(reminder.userId).catch(() => null);
        if (!user) continue;

        const msg = await channel.send(`<@${reminder.userId}> ${reminder.message}`).catch(() => null);
        if (msg) {
          await Reminder.updateOne(
            { _id: reminder._id },
            { $set: { lastPingedAt: new Date() }, $inc: { totalPingsSent: 1 } }
          );
        }
      }
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
    const affected = await Reminder.updateMany(
      { channelId: message.channel.id, userId: message.author.id, active: true },
      { $set: { cycleStart: new Date(), lastResponseAt: new Date() }, $inc: { totalResponses: 1 } }
    );
    if (affected.modifiedCount > 0) {
      console.log(`[REMINDER] Response detected: ${message.author.tag} in #${message.channel.name}`);
    }
  } catch (err) {
    console.error('[REMINDER] Message handler error:', err.message);
  }
}

const RETRYABLE_CODES = new Set([10107, 13435, 13436, 11600, 11602]);

async function withRetry(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      if (err.code && RETRYABLE_CODES.has(err.code)) {
        console.log(`[MONGO] Retryable error (${err.codeName}), attempt ${i + 2}/${maxRetries}...`);
        await new Promise((r) => setTimeout(r, delay * (i + 1)));
      } else {
        throw err;
      }
    }
  }
}

export async function createReminder({ userId, channelId, guildId, message, intervalMinutes, createdBy }) {
  const reminder = await withRetry(() =>
    Reminder.create({
      userId,
      channelId,
      guildId,
      message: message || 'Time for your reminder!',
      intervalMinutes: Math.max(1, Math.min(1440, intervalMinutes || 5)),
      createdBy,
      cycleStart: new Date(),
    })
  );
  return reminder;
}

export async function deleteReminder(reminderId) {
  const reminder = await Reminder.findByIdAndDelete(reminderId);
  return reminder;
}

export async function listReminders(guildId) {
  const reminders = await Reminder.find({ guildId }).sort({ createdAt: -1 }).lean();
  return reminders;
}

export async function pauseReminder(reminderId) {
  const reminder = await Reminder.findByIdAndUpdate(
    reminderId,
    { $set: { active: false } },
    { new: true }
  );
  return reminder;
}

export async function resumeReminder(reminderId) {
  const reminder = await Reminder.findByIdAndUpdate(
    reminderId,
    { $set: { active: true, cycleStart: new Date() } },
    { new: true }
  );
  return reminder;
}
