import { EmbedBuilder } from 'discord.js';
import { notifyOwner } from './ownerNotify.js';

const inviteCache = new Map();
const TRACKING_CHANNEL = '1530595513924059289';
const COLORS = {
  primary: 0x75cff5,
  success: 0x57f287,
  error: 0xed4245,
};

export async function handleInviteTracking(guild, member) {
  if (!guild) return;

  if (!member) {
    const invites = await guild.invites.fetch().catch(() => null);
    if (!invites) return;

    for (const [code, invite] of invites) {
      inviteCache.set(code, {
        uses: invite.uses,
        inviterId: invite.inviter?.id || null,
      });
    }
    return;
  }

  const trackingChannel = await guild.channels.fetch(TRACKING_CHANNEL).catch(() => null);
  if (!trackingChannel) return;

  const newInvites = await guild.invites.fetch().catch(() => null);
  if (!newInvites) return;

  let usedInvite = null;

  for (const [code, invite] of newInvites) {
    const cached = inviteCache.get(code);
    if (cached && invite.uses > cached.uses) {
      usedInvite = invite;
      break;
    }
  }

  for (const [code, invite] of newInvites) {
    const cached = inviteCache.get(code);
    inviteCache.set(code, {
      uses: invite.uses,
      inviterId: invite.inviter?.id || null,
    });
  }

  if (!usedInvite) {
    const embed = new EmbedBuilder()
      .setTitle('📥 Member Joined')
      .setDescription(`${member} joined, but the invite could not be determined.`)
      .setColor(COLORS.primary)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();
    await trackingChannel.send({ embeds: [embed] }).catch(() => null);
    return;
  }

  const inviterId = usedInvite.inviter?.id || 'Unknown';
  const inviterTag = usedInvite.inviter?.tag || 'Unknown';

  const embed = new EmbedBuilder()
    .setTitle('📥 Member Joined')
    .setDescription(`${member} joined via invite **${usedInvite.code}**`)
    .setColor(COLORS.success)
    .addFields(
      { name: 'User', value: `${member} (${member.id})`, inline: true },
      { name: 'Invite Code', value: usedInvite.code, inline: true },
      { name: 'Invited By', value: `<@${inviterId}> (${inviterTag})`, inline: true },
      { name: 'Uses', value: String(usedInvite.uses), inline: true }
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  await trackingChannel.send({ embeds: [embed] }).catch(() => null);

  await notifyOwner(guild, '📥 Member Joined', {
    user: `${member.user.tag} (${member.id})`,
    extra: `Invited by ${inviterTag} via \`${usedInvite.code}\``,
    color: COLORS.success,
  });
}
