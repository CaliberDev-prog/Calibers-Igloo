import { Giveaway } from '../database/models/Giveaway.js';
import { isMongoConnected } from './mongodb.js';
import { notifyOwner } from './ownerNotify.js';

export async function checkGiveawayEnd(client) {
  if (!isMongoConnected()) return;

  let expired;
  try {
    expired = await Giveaway.find({
      status: 'active',
      endAt: { $lte: new Date() },
    });
  } catch {
    return;
  }

  for (const giveaway of expired) {
    try {
      const updated = await Giveaway.findOneAndUpdate(
        { _id: giveaway._id, status: 'active' },
        { $set: { status: 'ended', endedAt: new Date() } },
        { new: true },
      );
      if (!updated) continue;

      const entries = updated.entries || [];
      const winnerCount = Math.min(updated.winners || 1, entries.length);
      const shuffled = [...entries].sort(() => Math.random() - 0.5);
      const selectedWinners = shuffled.slice(0, winnerCount);

      await Giveaway.findOneAndUpdate(
        { _id: updated._id },
        { $set: { winnerIds: selectedWinners } },
      );

      if (updated.messageId && updated.channelId) {
        const channel = client.channels.cache.get(updated.channelId);
        if (channel) {
          const mentions = selectedWinners.map((id) => `<@${id}>`).join(', ') || 'No valid entries';
          const embed = {
            title: `\uD83C\uDF89 ${updated.prize}`,
            description: `**Winner(s):** ${mentions}\n\nThis giveaway has ended.`,
            color: 0x57f287,
          };
          const msg = await channel.messages.fetch(updated.messageId).catch(() => null);
          if (msg) {
            await msg.edit({ embeds: [embed], content: '' }).catch(() => null);
            await msg.reactions.removeAll().catch(() => null);
          }
          if (selectedWinners.length > 0) {
            await channel.send({
              content: `\uD83C\uDF89 Congratulations ${mentions}! You won **${updated.prize}**!`,
              allowedMentions: { users: selectedWinners },
            }).catch(() => null);
          }
        }
      }

      notifyOwner(client.guilds.cache.first(), '\uD83C\uDF89 Giveaway Ended', {
        prize: updated.prize,
        winners: selectedWinners.length > 0 ? selectedWinners.map((id) => `<@${id}>`).join(', ') : 'No entries',
        entries: String(entries.length),
      }).catch(() => null);
    } catch (err) {
      console.error(`[GIVEAWAY] Failed to end giveaway ${giveaway._id}:`, err.message);
    }
  }
}

export async function handleGiveawayReactionAdd(reaction, user) {
  if (user.bot) return;
  if (!isMongoConnected()) return;

  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }

  if (reaction.emoji.name !== '\uD83C\uDF89') return;

  const giveaway = await Giveaway.findOne({
    messageId: reaction.message.id,
    status: 'active',
  }).catch(() => null);
  if (!giveaway) return;

  if (giveaway.endAt && new Date(giveaway.endAt) <= new Date()) return;

  if (giveaway.requirementRoleId) {
    const member = await reaction.message.guild?.members.fetch(user.id).catch(() => null);
    if (!member || !member.roles.cache.has(giveaway.requirementRoleId)) {
      const reactionUser = await reaction.users.fetch().catch(() => null);
      if (reactionUser) {
        await reaction.users.remove(user.id).catch(() => null);
      }
      return;
    }
  }

  await Giveaway.findOneAndUpdate(
    { _id: giveaway._id, status: 'active', entries: { $ne: user.id } },
    { $addToSet: { entries: user.id } },
  ).catch(() => null);
}

export async function handleGiveawayReactionRemove(reaction, user) {
  if (user.bot) return;
  if (!isMongoConnected()) return;

  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }

  if (reaction.emoji.name !== '\uD83C\uDF89') return;

  const giveaway = await Giveaway.findOne({
    messageId: reaction.message.id,
    status: 'active',
  }).catch(() => null);
  if (!giveaway) return;

  await Giveaway.findOneAndUpdate(
    { _id: giveaway._id },
    { $pull: { entries: user.id } },
  ).catch(() => null);
}
