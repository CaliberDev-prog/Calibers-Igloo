export const config = {
  channels: {
    verification: process.env.VERIFICATION_CHANNEL_ID || null,
    welcome: process.env.WELCOME_CHANNEL_ID || null,
    guidelines: '1530531580530004000',
    roles: '1530531583587651636',
    general: '1530531592420720721',
  },

  roles: {
    verified: process.env.VERIFIED_ROLE_NAME || '🧊︱Igloo Member',
    unverified: process.env.UNVERIFIED_ROLE_NAME || '❄️︱Unverified',
  },

  verification: {
    codeMinLength: 4,
    codeMaxLength: 6,
    timeoutMs: 2 * 60 * 1000,
    charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  },

  colors: {
    primary: 0x75CFF5,
    success: 0x57F287,
    error: 0xED4245,
    warn: 0xFEE75C,
  },

  embeds: {
    panel: {
      title: '❄️ Verification Required ❄️',
      description:
        'Welcome to **Caliber\'s Igloo**!\n\n' +
        'To access the server, please complete a quick verification step.\n' +
        'It\'s simple and only takes a moment.\n\n' +
        '🧊 *Click the button below to get started*',
      footer: 'Caliber\'s Igloo',
    },
    codePrompt: {
      title: '🔒 Your Verification Code',
      footer: 'Caliber\'s Igloo',
    },
    success: {
      title: '✅ Verification Complete!',
      description: (member) =>
        `Welcome to **Caliber's Igloo**, ${member}! 🧊\n\n` +
        'You now have full access to the server. Enjoy your stay!',
      footer: 'Caliber\'s Igloo',
    },
    incorrect: {
      title: '❌ Incorrect Code',
      footer: 'Caliber\'s Igloo',
    },
    expired: {
      title: '⏰ Code Expired',
      footer: 'Caliber\'s Igloo',
    },
    welcome: {
      description: (member, guild) =>
        `Hey ${member}, welcome to **Caliber's Igloo!**\n` +
        '~~                               ~~\n' +
        'We\'re thrilled to have you here. This is a place to connect, create, and have fun together.\n\n' +
        `📌 | \`Server\`: **${guild.name}**\n` +
        `👥 | \`Members\`: **${guild.memberCount}**\n` +
        '🏷️ | `Your Role:` **🧊 Igloo Member**\n\n' +
        '**Before you dive in, make sure to:**\n' +
        `📜 | Read the rules in <#${config.channels.guidelines}>\n` +
        `🎭 | Pick your roles in <#${config.channels.roles}>\n` +
        `💬 | Say hi in <#${config.channels.general}>\n` +
        '~~                               ~~\n' +
        '***We\'re glad to have you here. Stay frosty! 🧊***',
    },
  },

  setupPermissions: true,
  exemptChannels: [],
};
