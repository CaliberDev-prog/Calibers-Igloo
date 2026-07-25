import { config } from '../config/verification.js';
import {
  getOrCreateUnverifiedRole,
  setupChannelPermissions,
  sendVerificationPanel,
} from '../services/verificationService.js';

export async function handleMemberAdd(member) {
  if (member.user.bot) return;

  const { guild } = member;
  console.log(`[VERIFY] ${member.user.tag} joined ${guild.name}`);

  await setupChannelPermissions(guild).catch((err) => {
    console.error('[VERIFY] Channel permission setup failed:', err.message);
  });

  const unverifiedRole = await getOrCreateUnverifiedRole(guild).catch((err) => {
    console.error('[VERIFY] Failed to get unverified role:', err.message);
    return null;
  });

  if (unverifiedRole) {
    await member.roles.add(unverifiedRole).catch((err) => {
      console.error('[VERIFY] Failed to assign unverified role:', err.message);
    });
    console.log(`[VERIFY] Assigned Unverified role to ${member.user.tag}`);
  }

  const verificationChannelId = config.channels.verification;
  if (!verificationChannelId) {
    console.error('[VERIFY] No VERIFICATION_CHANNEL_ID configured');
    return;
  }

  const channel = guild.channels.cache.get(verificationChannelId);
  if (!channel) {
    console.error(`[VERIFY] Verification channel ${verificationChannelId} not found in cache`);
    return;
  }

  const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const hasPanel = messages?.some(
    (m) =>
      m.author.id === guild.members.me.id &&
      m.components.some((row) =>
        row.components.some((comp) => comp.customId === 'verify_panel')
      )
  );

  if (!hasPanel) {
    await sendVerificationPanel(channel).then(() => {
      console.log('[VERIFY] Sent verification panel');
    }).catch((err) => {
      console.error('[VERIFY] Failed to send verification panel:', err.message);
    });
  } else {
    console.log('[VERIFY] Verification panel already exists');
  }
}
