import { EmbedBuilder } from 'discord.js';
import { config } from '../config/verification.js';

export function buildWelcomeEmbed(member) {
  const msg = config.embeds.welcome;

  return new EmbedBuilder()
    .setDescription(msg.description(member, member.guild))
    .setColor(config.colors.primary)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `${member.guild.name} • ${member.guild.memberCount} members` })
    .setTimestamp();
}

export async function sendWelcome(member, channel) {
  if (!channel) return;
  const embed = buildWelcomeEmbed(member);
  await channel.send({
    content: `${member}`,
    embeds: [embed],
  });
}
