import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { data as setup } from './commands/setup.js';
import { data as ping } from './commands/ping.js';
import { commands as ticketCommands } from './commands/tickets/ticket.js';
import { commands as panelCommands } from './commands/slash/panels.js';
import { commands as modCommands } from './commands/slash/moderation.js';
import * as staffadd from './commands/staffadd.js';

const required = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
const all = [
  setup.toJSON(),
  ping.toJSON(),
  staffadd.data.toJSON(),
  ...ticketCommands.map((c) => c.data.toJSON()),
  ...panelCommands.map((c) => c.data.toJSON()),
  ...modCommands.map((c) => c.data.toJSON()),
];

await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
  body: all,
});
console.log(`Deployed ${all.length} guild commands.`);
