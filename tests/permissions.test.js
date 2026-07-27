import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function readSrc(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('Command permission validation — slash commands', () => {
  it('/ticket stats requires isStaff check', () => {
    const src = readSrc('src/commands/tickets/ticket.js');
    const statsFn = src.substring(src.indexOf('async function cmdStats'), src.indexOf('async function cmdClean'));
    assert.ok(statsFn.includes('isStaff'), '/ticket stats must check isStaff');
    assert.ok(statsFn.includes('Staff only'), '/ticket stats must return Staff only message');
  });

  it('/ticket clean requires owner-only check', () => {
    const src = readSrc('src/commands/tickets/ticket.js');
    const cleanFn = src.substring(src.indexOf('async function cmdClean'));
    assert.ok(cleanFn.includes('OWNER_ID') || cleanFn.includes('owner'), '/ticket clean must check owner');
    assert.ok(cleanFn.includes('Owner only'), '/ticket clean must return Owner only message');
  });

  it('/ticket close requires isStaff', () => {
    const src = readSrc('src/commands/tickets/ticket.js');
    const closeFn = src.substring(src.indexOf('async function cmdClose'), src.indexOf('async function cmdTranscript'));
    const hasDirectCheck = closeFn.includes('isStaff');
    const hasGuardWrapper = src.includes('withTicketGuard(cmdClose)');
    assert.ok(hasDirectCheck || hasGuardWrapper, '/ticket close must check isStaff (directly or via withTicketGuard)');
  });

  it('/ticket transcript requires isStaff', () => {
    const src = readSrc('src/commands/tickets/ticket.js');
    const fn = src.substring(src.indexOf('async function cmdTranscript'), src.indexOf('async function cmdMove'));
    const hasDirectCheck = fn.includes('isStaff');
    const hasGuardWrapper = src.includes('withTicketGuard(cmdTranscript)');
    assert.ok(hasDirectCheck || hasGuardWrapper, '/ticket transcript must check isStaff (directly or via withTicketGuard)');
  });

  it('/ticket move requires isStaff', () => {
    const src = readSrc('src/commands/tickets/ticket.js');
    const fn = src.substring(src.indexOf('async function cmdMove'), src.indexOf('async function cmdAdd'));
    const hasDirectCheck = fn.includes('isStaff');
    const hasGuardWrapper = src.includes('withTicketGuard(cmdMove)');
    assert.ok(hasDirectCheck || hasGuardWrapper, '/ticket move must check isStaff (directly or via withTicketGuard)');
  });

  it('/ticket add requires isStaff', () => {
    const src = readSrc('src/commands/tickets/ticket.js');
    const fn = src.substring(src.indexOf('async function cmdAdd'), src.indexOf('async function cmdRemove'));
    const hasDirectCheck = fn.includes('isStaff');
    const hasGuardWrapper = src.includes('withTicketGuard(cmdAdd)');
    assert.ok(hasDirectCheck || hasGuardWrapper, '/ticket add must check isStaff (directly or via withTicketGuard)');
  });

  it('/ticket remove requires isStaff', () => {
    const src = readSrc('src/commands/tickets/ticket.js');
    const fn = src.substring(src.indexOf('async function cmdRemove'), src.indexOf('async function cmdRename'));
    const hasDirectCheck = fn.includes('isStaff');
    const hasGuardWrapper = src.includes('withTicketGuard(cmdRemove)');
    assert.ok(hasDirectCheck || hasGuardWrapper, '/ticket remove must check isStaff (directly or via withTicketGuard)');
  });

  it('/ticket rename requires isStaff', () => {
    const src = readSrc('src/commands/tickets/ticket.js');
    const fn = src.substring(src.indexOf('async function cmdRename'), src.indexOf('async function cmdRequestClose'));
    const hasDirectCheck = fn.includes('isStaff');
    const hasGuardWrapper = src.includes('withTicketGuard(cmdRename)');
    assert.ok(hasDirectCheck || hasGuardWrapper, '/ticket rename must check isStaff (directly or via withTicketGuard)');
  });

  it('/ticket alert requires isStaff', () => {
    const src = readSrc('src/commands/tickets/ticket.js');
    const fn = src.substring(src.indexOf('async function cmdAlert'), src.indexOf('async function cmdPing'));
    const hasDirectCheck = fn.includes('isStaff');
    const hasGuardWrapper = src.includes('withTicketGuard(cmdAlert)');
    assert.ok(hasDirectCheck || hasGuardWrapper, '/ticket alert must check isStaff (directly or via withTicketGuard)');
  });

  it('/ticket ping requires isStaff', () => {
    const src = readSrc('src/commands/tickets/ticket.js');
    const fn = src.substring(src.indexOf('async function cmdPing'), src.indexOf('async function cmdPurge'));
    const hasDirectCheck = fn.includes('isStaff');
    const hasGuardWrapper = src.includes('withTicketGuard(cmdPing)');
    assert.ok(hasDirectCheck || hasGuardWrapper, '/ticket ping must check isStaff (directly or via withTicketGuard)');
  });

  it('/ticket purge requires isStaff', () => {
    const src = readSrc('src/commands/tickets/ticket.js');
    const fn = src.substring(src.indexOf('async function cmdPurge'), src.indexOf('async function cmdBlacklist'));
    const hasDirectCheck = fn.includes('isStaff');
    const hasGuardWrapper = src.includes('withTicketGuard(cmdPurge)');
    assert.ok(hasDirectCheck || hasGuardWrapper, '/ticket purge must check isStaff (directly or via withTicketGuard)');
  });

  it('/ticket blacklist requires canManageTicket', () => {
    const src = readSrc('src/commands/tickets/ticket.js');
    const fn = src.substring(src.indexOf('async function cmdBlacklist'), src.indexOf('async function cmdUnblacklist'));
    assert.ok(fn.includes('canManageTicket'), '/ticket blacklist must check canManageTicket');
  });

  it('/ticket unblacklist requires canManageTicket', () => {
    const src = readSrc('src/commands/tickets/ticket.js');
    const fn = src.substring(src.indexOf('async function cmdUnblacklist'), src.indexOf('async function cmdStats'));
    assert.ok(fn.includes('canManageTicket'), '/ticket unblacklist must check canManageTicket');
  });

  it('all ticket subcommands check inTicket (except stats/clean/blacklist/unblacklist)', () => {
    const src = readSrc('src/commands/tickets/ticket.js');
    const subcommandsNeedingInTicket = ['cmdClose', 'cmdTranscript', 'cmdMove', 'cmdAdd', 'cmdRemove', 'cmdRename', 'cmdRequestClose', 'cmdAlert', 'cmdPing', 'cmdPurge'];
    for (const fn of subcommandsNeedingInTicket) {
      const start = src.indexOf(`async function ${fn}`);
      assert.ok(start !== -1, `Function ${fn} not found`);
      const chunk = src.substring(start, start + 500);
      const hasDirectCheck = chunk.includes('inTicket');
      const hasGuardWrapper = src.includes(`withTicketGuard(${fn})`);
      assert.ok(hasDirectCheck || hasGuardWrapper, `${fn} must check inTicket (directly or via withTicketGuard)`);
    }
  });

  it('/purge (slash) requires hasModRole', () => {
    const src = readSrc('src/commands/slash/moderation.js');
    const purgeCmd = src.substring(
      src.indexOf("setName('purge')"),
      src.indexOf("setName('warning')")
    );
    assert.ok(purgeCmd.includes('hasModRole'), '/purge must check hasModRole');
    assert.ok(purgeCmd.includes('ManageMessages'), '/purge must set ManageMessages permission gate');
  });

  it('/warning (slash) requires hasModRole', () => {
    const src = readSrc('src/commands/slash/moderation.js');
    const warnCmd = src.substring(
      src.indexOf("setName('warning')"),
      src.indexOf("setName('slowmode')")
    );
    assert.ok(warnCmd.includes('hasModRole'), '/warning must check hasModRole');
    assert.ok(warnCmd.includes('ModerateMembers'), '/warning must set ModerateMembers permission gate');
  });

  it('/slowmode (slash) requires hasModRole', () => {
    const src = readSrc('src/commands/slash/moderation.js');
    const slowCmd = src.substring(
      src.indexOf("setName('slowmode')"),
      src.indexOf("setName('botalerts')")
    );
    assert.ok(slowCmd.includes('hasModRole'), '/slowmode must check hasModRole');
    assert.ok(slowCmd.includes('ManageChannels'), '/slowmode must set ManageChannels permission gate');
  });

  it('/botalerts requires owner-only', () => {
    const src = readSrc('src/commands/slash/moderation.js');
    const cmd = src.substring(
      src.indexOf("setName('botalerts')"),
      src.indexOf("setName('prefix')")
    );
    assert.ok(cmd.includes('OWNER_ID'), '/botalerts must check OWNER_ID');
    assert.ok(cmd.includes('Administrator'), '/botalerts must set Administrator permission gate');
  });

  it('/prefix requires owner-only', () => {
    const src = readSrc('src/commands/slash/moderation.js');
    const cmd = src.substring(src.indexOf("setName('prefix')"));
    assert.ok(cmd.includes('OWNER_ID'), '/prefix must check OWNER_ID');
    assert.ok(cmd.includes('Administrator'), '/prefix must set Administrator permission gate');
  });

  it('/setup requires Administrator permission gate', () => {
    const src = readSrc('src/commands/setup.js');
    assert.ok(src.includes('Administrator'), '/setup must set Administrator permission gate');
  });

  it('/staffadd requires Administrator + owner', () => {
    const src = readSrc('src/commands/staffadd.js');
    assert.ok(src.includes('Administrator'), '/staffadd must set Administrator permission gate');
    assert.ok(src.includes('OWNER_ID'), '/staffadd must check OWNER_ID');
    assert.ok(src.includes('Owner only'), '/staffadd must return Owner only message');
  });

  it('/ticketpanel requires Administrator', () => {
    const src = readSrc('src/commands/slash/panels.js');
    const cmd = src.substring(
      src.indexOf("setName('ticketpanel')"),
      src.indexOf("setName('sendembed')")
    );
    assert.ok(cmd.includes('Administrator'), '/ticketpanel must set Administrator permission gate');
  });

  it('/sendembed requires Administrator', () => {
    const src = readSrc('src/commands/slash/panels.js');
    const cmd = src.substring(
      src.indexOf("setName('sendembed')"),
      src.indexOf("setName('sendverify')")
    );
    assert.ok(cmd.includes('Administrator'), '/sendembed must set Administrator permission gate');
  });

  it('/sendverify requires Administrator', () => {
    const src = readSrc('src/commands/slash/panels.js');
    const cmd = src.substring(src.indexOf("setName('sendverify')"));
    assert.ok(cmd.includes('Administrator'), '/sendverify must set Administrator permission gate');
  });
});

describe('Command permission validation — prefix commands', () => {
  it('!purge requires hasModRole', () => {
    const src = readSrc('src/commands/prefix/moderation.js');
    const fn = src.substring(src.indexOf('export async function handlePurgeCommand'), src.indexOf('export async function handleWarningCommand'));
    assert.ok(fn.includes('hasModRole'), '!purge must check hasModRole');
  });

  it('!warning requires hasModRole', () => {
    const src = readSrc('src/commands/prefix/moderation.js');
    const fn = src.substring(src.indexOf('export async function handleWarningCommand'), src.indexOf('export async function handleSlowmodeCommand'));
    assert.ok(fn.includes('hasModRole'), '!warning must check hasModRole');
  });

  it('!slowmode requires hasModRole', () => {
    const src = readSrc('src/commands/prefix/moderation.js');
    const fn = src.substring(src.indexOf('export async function handleSlowmodeCommand'));
    assert.ok(fn.includes('hasModRole'), '!slowmode must check hasModRole');
  });

  it('!rolesfix requires guild owner, OWNER_ID, or Administrator', () => {
    const src = readSrc('src/commands/rolesfix.js');
    assert.ok(src.includes('isGuildOwner'), '!rolesfix must check guild owner');
    assert.ok(src.includes('OWNER_ID'), '!rolesfix must check OWNER_ID');
    assert.ok(src.includes('isAdministrator'), '!rolesfix must check Administrator');
  });

  it('!rules requires guild owner, OWNER_ID, or Administrator', () => {
    const src = readSrc('src/commands/rules.js');
    assert.ok(src.includes('isGuildOwner'), '!rules must check guild owner');
    assert.ok(src.includes('OWNER_ID'), '!rules must check OWNER_ID');
    assert.ok(src.includes('isAdministrator'), '!rules must check Administrator');
  });
});

describe('Command permission validation — button handlers', () => {
  it('ticket:close requires isStaff', () => {
    const src = readSrc('src/components/buttons/ticket/close.js');
    const fn = src.substring(src.indexOf('export async function handleClose'), src.indexOf('export async function handleCloseReasonModal'));
    assert.ok(fn.includes('isStaff'), 'ticket:close must check isStaff');
  });

  it('ticket:close-reason requires isStaff', () => {
    const src = readSrc('src/components/buttons/ticket/close.js');
    const fn = src.substring(src.indexOf('export async function handleCloseReasonModal'), src.indexOf('async function handleConfirmCloseButton'));
    assert.ok(fn.includes('isStaff'), 'ticket:close-reason must check isStaff');
  });

  it('ticket:confirm-close requires isStaff', () => {
    const src = readSrc('src/components/buttons/ticket/close.js');
    const fn = src.substring(src.indexOf('async function handleConfirmCloseButton'), src.indexOf('async function generateAndSendTranscript'));
    assert.ok(fn.includes('isStaff'), 'ticket:confirm-close must check isStaff');
  });

  it('ticket:alert requires isStaff', () => {
    const src = readSrc('src/components/buttons/ticket/actions.js');
    const fn = src.substring(src.indexOf('export async function handleAlert'), src.indexOf('export async function handleForceAdd'));
    assert.ok(fn.includes('isStaff'), 'ticket:alert must check isStaff');
  });

  it('ticket:force-add requires isStaff', () => {
    const src = readSrc('src/components/buttons/ticket/actions.js');
    const fn = src.substring(src.indexOf('export async function handleForceAdd'), src.indexOf('export async function handleClaim'));
    assert.ok(fn.includes('isStaff'), 'ticket:force-add must check isStaff');
  });

  it('ticket:claim requires isStaff', () => {
    const src = readSrc('src/components/buttons/ticket/actions.js');
    const fn = src.substring(src.indexOf('export async function handleClaim'), src.indexOf('export async function handleUnclaim'));
    assert.ok(fn.includes('isStaff'), 'ticket:claim must check isStaff');
  });

  it('ticket:unclaim requires isStaff', () => {
    const src = readSrc('src/components/buttons/ticket/actions.js');
    const fn = src.substring(src.indexOf('export async function handleUnclaim'), src.indexOf('export async function handleLock'));
    assert.ok(fn.includes('isStaff'), 'ticket:unclaim must check isStaff');
  });

  it('ticket:lock requires isStaff', () => {
    const src = readSrc('src/components/buttons/ticket/actions.js');
    const fn = src.substring(src.indexOf('export async function handleLock'), src.indexOf('export async function handleUnlock'));
    assert.ok(fn.includes('isStaff'), 'ticket:lock must check isStaff');
  });

  it('ticket:unlock requires isStaff', () => {
    const src = readSrc('src/components/buttons/ticket/actions.js');
    const fn = src.substring(src.indexOf('export async function handleUnlock'));
    assert.ok(fn.includes('isStaff'), 'ticket:unlock must check isStaff');
  });
});

describe('Hardcoded secrets — no hardcoded OWNER_ID', () => {
  it('staffadd.js uses process.env.OWNER_ID only', () => {
    const src = readSrc('src/commands/staffadd.js');
    assert.ok(!src.includes("'1293164546005012512'"), 'staffadd.js must not hardcode OWNER_ID');
    assert.ok(src.includes('process.env.OWNER_ID'), 'staffadd.js must use process.env.OWNER_ID');
  });

  it('slash/moderation.js uses process.env.OWNER_ID only', () => {
    const src = readSrc('src/commands/slash/moderation.js');
    assert.ok(!src.includes("'1293164546005012512'"), 'slash/moderation.js must not hardcode OWNER_ID');
    assert.ok(src.includes('process.env.OWNER_ID'), 'slash/moderation.js must use process.env.OWNER_ID');
  });

  it('prefix/moderation.js uses process.env.OWNER_ID only', () => {
    const src = readSrc('src/commands/prefix/moderation.js');
    assert.ok(!src.includes("'1293164546005012512'"), 'prefix/moderation.js must not hardcode OWNER_ID');
    assert.ok(src.includes('process.env.OWNER_ID'), 'prefix/moderation.js must use process.env.OWNER_ID');
  });
});

describe('Permission utility functions', () => {
  it('isStaff checks Administrator permission', async () => {
    const { isStaff } = await import('../src/utils/ticketPermissions.js');
    const fakeMember = { permissions: { has: () => true }, roles: { cache: { has: () => false } } };
    assert.equal(isStaff(fakeMember), true, 'isStaff should allow Administrator');
  });

  it('isStaff checks staff roles', async () => {
    const { isStaff } = await import('../src/utils/ticketPermissions.js');
    const fakeMember = {
      permissions: { has: () => false },
      roles: { cache: { has: (id) => id === '1530531573332447324' } },
    };
    assert.equal(isStaff(fakeMember), true, 'isStaff should allow staff role');
  });

  it('isStaff rejects non-staff', async () => {
    const { isStaff } = await import('../src/utils/ticketPermissions.js');
    const fakeMember = {
      permissions: { has: () => false },
      roles: { cache: { has: () => false } },
    };
    assert.equal(isStaff(fakeMember), false, 'isStaff should reject non-staff');
  });

  it('isStaff rejects null member', async () => {
    const { isStaff } = await import('../src/utils/ticketPermissions.js');
    assert.equal(isStaff(null), false, 'isStaff should reject null');
    assert.equal(isStaff(undefined), false, 'isStaff should reject undefined');
  });

  it('canManageTicket delegates to isStaff', async () => {
    const { canManageTicket } = await import('../src/utils/ticketPermissions.js');
    const staffMember = {
      permissions: { has: () => false },
      roles: { cache: { has: (id) => id === '1530531573332447324' } },
    };
    assert.equal(canManageTicket(staffMember), true);
    const nonStaff = {
      permissions: { has: () => false },
      roles: { cache: { has: () => false } },
    };
    assert.equal(canManageTicket(nonStaff), false);
  });

  it('canRequestClose allows ticket creator', async () => {
    const { canRequestClose } = await import('../src/utils/ticketPermissions.js');
    const member = { id: '123', permissions: { has: () => false }, roles: { cache: { has: () => false } } };
    const ticket = { creatorId: '123', participants: [] };
    assert.equal(canRequestClose(member, ticket), true);
  });

  it('canRequestClose allows staff', async () => {
    const { canRequestClose } = await import('../src/utils/ticketPermissions.js');
    const member = {
      id: '999',
      permissions: { has: () => false },
      roles: { cache: { has: (id) => id === '1530531573332447324' } },
    };
    const ticket = { creatorId: '123', participants: [] };
    assert.equal(canRequestClose(member, ticket), true);
  });

  it('canRequestClose rejects non-staff non-creator', async () => {
    const { canRequestClose } = await import('../src/utils/ticketPermissions.js');
    const member = {
      id: '999',
      permissions: { has: () => false },
      roles: { cache: { has: () => false } },
    };
    const ticket = { creatorId: '123', participants: [] };
    assert.equal(canRequestClose(member, ticket), false);
  });

  it('hasTicketAccess allows ticket creator', async () => {
    const { hasTicketAccess } = await import('../src/utils/ticketPermissions.js');
    const member = { id: '123', permissions: { has: () => false }, roles: { cache: { has: () => false } } };
    const ticket = { creatorId: '123', participants: [] };
    assert.equal(hasTicketAccess(member, ticket), true);
  });

  it('hasTicketAccess allows participants', async () => {
    const { hasTicketAccess } = await import('../src/utils/ticketPermissions.js');
    const member = { id: '456', permissions: { has: () => false }, roles: { cache: { has: () => false } } };
    const ticket = { creatorId: '123', participants: ['456'] };
    assert.equal(hasTicketAccess(member, ticket), true);
  });

  it('hasTicketAccess rejects unauthorized users', async () => {
    const { hasTicketAccess } = await import('../src/utils/ticketPermissions.js');
    const member = { id: '999', permissions: { has: () => false }, roles: { cache: { has: () => false } } };
    const ticket = { creatorId: '123', participants: ['456'] };
    assert.equal(hasTicketAccess(member, ticket), false);
  });
});
