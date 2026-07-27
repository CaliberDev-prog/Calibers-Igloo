import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// Test that model files load without error and register correctly
// We test the schema definitions directly without connecting to MongoDB

describe('Dashboard model definitions', () => {
  it('Ticket schema has required fields', async () => {
    const mod = await import('../dashboard/server/models/Ticket.js');
    const Ticket = mod.default;
    assert.ok(Ticket.schema);
    const paths = Object.keys(Ticket.schema.paths);
    assert.ok(paths.includes('ticketId'), 'ticketId field exists');
    assert.ok(paths.includes('status'), 'status field exists');
    assert.ok(paths.includes('creatorId'), 'creatorId field exists');
    assert.ok(paths.includes('departmentId'), 'departmentId field exists');
    assert.ok(paths.includes('channelId'), 'channelId field exists');
    assert.ok(paths.includes('notes'), 'notes field exists');
    assert.ok(paths.includes('participants'), 'participants field exists');
    assert.ok(paths.includes('history'), 'history field exists');
    assert.ok(paths.includes('transcript.generated'), 'transcript.generated field exists');
    assert.ok(paths.includes('closeRequest.active'), 'closeRequest.active field exists');
  });

  it('TicketBlacklist schema has required fields', async () => {
    const mod = await import('../dashboard/server/models/TicketBlacklist.js');
    const TicketBlacklist = mod.default;
    assert.ok(TicketBlacklist.schema);
    const paths = Object.keys(TicketBlacklist.schema.paths);
    assert.ok(paths.includes('userId'), 'userId field exists');
    assert.ok(paths.includes('departmentId'), 'departmentId field exists');
    assert.ok(paths.includes('reason'), 'reason field exists');
    assert.ok(paths.includes('addedBy'), 'addedBy field exists');
    assert.ok(paths.includes('active'), 'active field exists');
    assert.ok(paths.includes('expiresAt'), 'expiresAt field exists');
  });

  it('Counter schema has required fields', async () => {
    const mod = await import('../dashboard/server/models/Counter.js');
    const Counter = mod.default;
    assert.ok(Counter.schema);
    const paths = Object.keys(Counter.schema.paths);
    assert.ok(paths.includes('_id'), '_id field exists');
    assert.ok(paths.includes('seq'), 'seq field exists');
  });

  it('BotConfig schema has required fields', async () => {
    const mod = await import('../dashboard/server/models/BotConfig.js');
    const BotConfig = mod.default;
    assert.ok(BotConfig.schema);
    const paths = Object.keys(BotConfig.schema.paths);
    assert.ok(paths.includes('type'), 'type field exists');
    assert.ok(paths.includes('settings'), 'settings field exists');
  });

  it('Giveaway schema has required fields', async () => {
    const mod = await import('../dashboard/server/models/Giveaway.js');
    const Giveaway = mod.default;
    assert.ok(Giveaway.schema);
    const paths = Object.keys(Giveaway.schema.paths);
    assert.ok(paths.includes('messageId'), 'messageId field exists');
    assert.ok(paths.includes('channelId'), 'channelId field exists');
    assert.ok(paths.includes('prize'), 'prize field exists');
    assert.ok(paths.includes('status'), 'status field exists');
    assert.ok(paths.includes('entries'), 'entries field exists');
    assert.ok(paths.includes('winnerIds'), 'winnerIds field exists');
    assert.ok(paths.includes('endAt'), 'endAt field exists');
    assert.ok(paths.includes('endedAt'), 'endedAt field exists');
    assert.ok(paths.includes('requirementRoleId'), 'requirementRoleId field exists');
  });

  it('no route file uses inline mongoose.model() definitions', async () => {
    const fs = await import('fs');
    const files = [
      'dashboard/server/routes/api/tickets.js',
      'dashboard/server/routes/api/blacklists.js',
      'dashboard/server/routes/api/giveaways.js',
      'dashboard/server/routes/api/config.js',
    ];
    for (const file of files) {
      const content = fs.readFileSync(new URL('../' + file, import.meta.url), 'utf-8');
      assert.ok(!content.includes("mongoose.model("), `${file} has no inline mongoose.model()`);
    }
  });

  it('route files import models from shared model files', async () => {
    const fs = await import('fs');
    const ticketsContent = fs.readFileSync(
      new URL('../dashboard/server/routes/api/tickets.js', import.meta.url),
      'utf-8'
    );
    assert.ok(ticketsContent.includes("import Ticket from '../../models/Ticket.js'"), 'tickets.js imports shared Ticket');
    const blacklistsContent = fs.readFileSync(
      new URL('../dashboard/server/routes/api/blacklists.js', import.meta.url),
      'utf-8'
    );
    assert.ok(blacklistsContent.includes("import TicketBlacklist from '../../models/TicketBlacklist.js'"), 'blacklists.js imports shared TicketBlacklist');
    const giveawaysContent = fs.readFileSync(
      new URL('../dashboard/server/routes/api/giveaways.js', import.meta.url),
      'utf-8'
    );
    assert.ok(giveawaysContent.includes("import Giveaway from '../../models/Giveaway.js'"), 'giveaways.js imports shared Giveaway');
    const configContent = fs.readFileSync(
      new URL('../dashboard/server/routes/api/config.js', import.meta.url),
      'utf-8'
    );
    assert.ok(configContent.includes("import BotConfig from '../../models/BotConfig.js'"), 'config.js imports shared BotConfig');
  });
});
