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

  it('api.js imports models from shared files (no inline definitions)', async () => {
    const fs = await import('fs');
    const apiContent = fs.readFileSync(
      new URL('../dashboard/server/routes/api.js', import.meta.url),
      'utf-8'
    );
    assert.ok(!apiContent.includes("mongoose.model('Ticket', new mongoose.Schema"), 'no inline Ticket model');
    assert.ok(!apiContent.includes("mongoose.model('TicketBlacklist', new mongoose.Schema"), 'no inline TicketBlacklist model');
    assert.ok(!apiContent.includes("mongoose.model('Counter', new mongoose.Schema"), 'no inline Counter model');
    assert.ok(!apiContent.includes("mongoose.model('BotConfig', new mongoose.Schema"), 'no inline BotConfig model');
    assert.ok(!apiContent.includes("mongoose.model('Giveaway', new mongoose.Schema"), 'no inline Giveaway model');
    assert.ok(apiContent.includes("import Ticket from '../models/Ticket.js'"), 'imports shared Ticket');
    assert.ok(apiContent.includes("import TicketBlacklist from '../models/TicketBlacklist.js'"), 'imports shared TicketBlacklist');
    assert.ok(apiContent.includes("import BotConfig from '../models/BotConfig.js'"), 'imports shared BotConfig');
    assert.ok(apiContent.includes("import Giveaway from '../models/Giveaway.js'"), 'imports shared Giveaway');
  });
});
