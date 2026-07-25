# Caliber's Igloo Setup Bot

A safe, repeatable Discord.js v14 setup bot that creates the approved server roles, categories, text channels, voice **Cabins**, staff area, and **Vault**.

## Requirements

- Node.js 22.12.0 or newer
- A Discord bot invited with `bot` and `applications.commands`
- Administrator permission during setup
- The bot role placed above every role it needs to create/manage

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in:
   - `DISCORD_TOKEN`: bot token
   - `CLIENT_ID`: application ID
   - `GUILD_ID`: server ID
   - `OWNER_ID`: your Discord user ID
3. Install dependencies:

```bash
npm install
```

4. Register the test-server slash commands:

```bash
npm run deploy
```

5. Start the bot:

```bash
npm start
```

6. Run `/setup`, review the preview, then press **Create Server**.

## Important behavior

- The bot never deletes existing roles or channels.
- Exact matching role/channel names are reused.
- Re-running `/setup` is intended to be safe.
- The setup includes public channels, Cabins, staff channels, and the Vault logs.
- The ticket panel itself is a placeholder in this first build; ticket functionality comes next.

## Bot invite permissions

During initial setup, Administrator is easiest. After setup, permissions can be reduced later.
