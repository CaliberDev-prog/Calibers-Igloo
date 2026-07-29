# PENGUUU DASHBOARD v1.0 Master Roadmap - Expanded Edition

## Document Role

Single source of truth for implementation, testing, review, and release readiness.

## Current Milestone

Batch 1 complete; Batch 2 complete; Batch 3 Issue 1 and Issue 2 complete. Issue 3 ready after baseline review.

## Quality Baseline

Engineering Standard v4.0, Design System v1.0, Coding Style Guide, Development Workflow.

## Rule

No issue or batch is complete until code, tests, documentation, and acceptance criteria all pass.

---

## 1. How to Use This Roadmap

Implement in dependency order. Do not begin work that depends on an unfinished shared layer unless the issue explicitly permits parallel work.

One issue, one controlled change set. Keep commits focused, testable, and easy to review or revert.

Preserve behavior during refactors. Architecture work must not silently change permissions, API contracts, database records, transcript output, or user-visible behavior.

Require evidence. Every completion report must list files changed, tests added, test totals, manual checks, known limitations, and commit hash.

Stop scope creep. New improvements discovered during implementation should be recorded as follow-up issues unless required to safely complete the active issue.

## 2. Global Definition of Done

- Acceptance criteria are satisfied and documented.
- Automated tests cover success, failure, permission, validation, and regression cases.
- The full test suite passes from a clean environment.
- The production build completes without warnings that indicate real defects.
- No secrets, tokens, personal data, stack traces, or internal identifiers leak to users.
- Code follows the approved architecture and design system.
- Documentation and changelog entries are updated.
- Manual smoke tests are completed for affected user journeys.
- The change can be safely reverted or rolled back.

## 3. Overall Batch Status

| Batch | Primary Focus | Status | Release Gate |
|-------|---------------|--------|-------------|
| 1 | Security Criticals | Complete | All 15 issues complete; 323 tests passing across 8 files. |
| 2 | Architecture | Complete | All ten architecture issues complete and behavior preserved. |
| 3 | Performance | Issue 2 Complete | Performance instrumentation deployed. Controlled baseline captured (see reports/). Optimization (Issue 3+) ready after baseline review. |
| 4 | Accessibility | Pending | WCAG 2.2 AA review completed. |
| 5 | UX Polish | Pending | No unfinished, inconsistent, or confusing primary journeys. |
| 6 | Testing | Pending | Required unit, integration, and E2E coverage complete. |
| 7 | Forms and Validation | Pending | Every form uses shared patterns and accessible validation. |
| 8 | Error Handling and Observability | Pending | Failures are safe, diagnosable, and recoverable. |
| 9 | Design System Adoption | Pending | No unjustified one-off UI patterns remain. |
| 10 | Production Readiness | Pending | Deployment, monitoring, recovery, and final QA approved. |
| 11 | Gambling System | Planned | Full virtual economy with 20+ games. See section 17. |

## 4. Batch 1 - Security Criticals (Complete)

Outcome: the authentication, API, transcript, database, and authorization foundations were hardened before architectural refactoring.

- JWT authentication, refresh rotation, token revocation, and replay detection.
- Protected routes and bot permission validation.
- Input validation, NoSQL injection prevention, and XSS mitigation.
- Secure transcript generation, filename handling, download limits, and response headers.
- CORS, CSRF defense, security headers, and rate limiting.
- Secure error responses, security audit logging, and MongoDB connection hardening.

Final reported evidence: all 15 issues complete, 323 tests passing across 8 test files.

## 5. Batch 2 - Architecture

Goal: reduce coupling, duplication, and oversized files while preserving runtime behavior and security guarantees established in Batch 1.

### 5.1 Dependency-Ordered Implementation Plan

| Order | Issue | Implementation | Dependencies | Completion Evidence |
|-------|-------|---------------|--------------|-------------------|
| 1 | #16 Async route wrapper | Create dashboard/server/middleware/asyncHandler.js. Wrap rejected promises and forward errors through centralized handling. | Batch 1 error contract | Unit tests for resolve, reject, next(error), headers already sent, and no double responses. |
| 2 | #18 Shared models index | Create dashboard/server/models/index.js and consolidate Ticket, TicketBlacklist, Counter, BotConfig, and Giveaway models. | Existing model definitions audited | No OverwriteModelError, indexes preserved, all callers use shared imports. |
| 3 | #17 Split api.js | Split the 920-line API router into domain routers. | Issues #16 and #18 | Route parity table, permission parity, status-code parity, full regression suite. |
| 4 | #19 Constants deduplication | Replace three local COMPONENTS_V2 declarations with the canonical constants.js export. | None | Repository search confirms one source of truth. |
| 5 | #22 Ticket command guard | Extract withTicketGuard(fn) to remove thirteen duplicated inTicket and isStaff checks. | Ticket permission behavior documented | Every command retains exact denial order and response behavior. |
| 6 | #20 Shared useApi hook | Create data-fetching hook supporting loading, error, abort, refetch, auth refresh, and stale-response protection. | Stable API contracts after #17 | Hook tests plus page-by-page migration checks. |
| 7 | #25 Shared pagination hook | Create usePagination(apiFn) with page, limit, total, reset, filters, abort handling, and boundary behavior. | Issue #20 | Tests for empty results, final page deletion, filter reset, race conditions. |
| 8 | #21 Split ticketService.js | Divide responsibilities by ticket lifecycle, permissions, participants, transcripts, and persistence. | Shared models and route boundaries | No circular imports; service contracts documented. |
| 9 | #23 Split ticketButtons.js | Separate button routing from domain actions and response formatting. | Ticket service split | All component custom IDs and permission outcomes preserved. |
| 10 | #24 Split ServerPage.jsx | Extract page sections, hooks, dialogs, tables, and configuration panels into focused components. | Shared frontend hooks | No visual regression; keyboard and responsive behavior preserved. |

### 5.2 Required Domain Route Structure

- **routes/overview.js**: GET /overview and GET /health. Health must not expose secrets or internal stack details.
- **routes/config.js**: Bot configuration, channel settings, patch operations, permission checks, validation, and audit events.
- **routes/tickets.js**: Ticket read/update/close/delete/participant/transcript routes with permission parity and safe downloads.
- **routes/blacklists.js**: Blacklist list/create/update/delete operations with owner or staff restrictions.
- **routes/messages.js**: Managed message CRUD, embed preview/send operations, URL validation, and message logging.
- **routes/giveaways.js**: Giveaway CRUD, end, reroll, permission checks, scheduling validation, and audit logging.
- **routes/users.js**: Dashboard user CRUD, role changes, session revocation, and sensitive field stripping.
- **routes/auditLogs.js**: Read/filter/export audit entries; creation through logging service rather than arbitrary client input.
- **routes/terminal.js**: Strictly allowlisted administrative commands, owner-only access, output limits, rate limits, and complete audit history.

### 5.3 Architecture Safety Rules

- Preserve route paths, HTTP methods, status codes, response envelopes, authorization requirements, and validation behavior unless a separate issue explicitly changes them.
- Do not import database models directly from UI code, commands, or event handlers.
- Preferred dependency direction: UI -> API route -> service -> repository/model -> database.
- Route files should parse and validate input, authorize the actor, call a service, and format the response. They should not own complex business logic.
- Services must not depend on React, Express response objects, or Discord interaction response formatting.
- Utilities must remain stateless unless their state ownership is explicitly documented.
- Avoid index files that create circular dependencies. Use domain-level exports carefully.
- Add a route parity checklist before deleting the original api.js implementation.

### 5.4 Batch 2 Acceptance Tests

- All existing 323+ tests continue passing.
- New tests cover asyncHandler, model loading, route mounting, guards, hooks, and split services.
- Every previous API endpoint is included in a route parity matrix.
- Permission tests verify unauthenticated, normal user, staff, and owner behavior.
- Frontend tests verify cancellation on unmount and prevent stale requests from overwriting newer results.
- A clean startup does not register duplicate models or duplicate routes.
- No circular dependencies are reported by the selected dependency checker.
- Bundle and runtime behavior remain stable or improve.

## 6. Required Server and Message Logging System

This is a mandatory cross-batch feature. Its architecture begins in Batch 2, reliability and observability are completed in Batch 8, design consistency is completed in Batch 9, and deployment/retention verification is completed in Batch 10.

### 6.1 Logging Goals

- Give authorized staff a reliable history of important Discord server changes.
- Make moderation and configuration incidents easier to investigate.
- Record enough context to understand what changed, who caused it when Discord audit logs provide that information, and what values existed before and after.
- Avoid collecting unnecessary personal data or creating an unlimited surveillance archive.
- Keep logging asynchronous and resilient so failures never block normal bot operation.

### 6.2 Events That Must Be Supported

**Message activity**: Message created, edited, deleted, bulk deletion in configured channels. Attachment metadata and safe links.

**Channel activity**: Channel created, deleted, or updated. Name, topic, category, type, NSFW, slowmode, bitrate, user limit, forum tags, default reaction, permission overwrite changes. Before/after permission diffs.

**Role activity**: Role created, deleted, or updated. Name, color, icon, hoist, mentionable, position, permission changes. Role assigned/removed from members.

**Member and moderation activity**: Joins, leaves, kicks, bans, unbans, timeouts, nickname changes. Staff command actions, reasons, evidence references, case identifiers. Automatic moderation actions.

**Voice activity**: Voice join, leave, channel move, mute, deafen. Configurable per server.

**Server configuration**: Guild settings, emoji, sticker, webhook, integration, invite, scheduled event, and thread changes.

**Dashboard and bot activity**: Config changes, login success/failure, token replay, role changes, permission changes, exports, transcript downloads, terminal commands, destructive actions. Bot startup, shutdown, reconnect, degraded dependencies, job failures, configuration reloads.

### 6.3 Required Log Record Schema

- Identity: event ID, event type, severity, source, guild ID, timestamp, schema version.
- Location: channel/category/thread ID and display names.
- Actor: actor user ID, display name snapshot, actor type, confidence/source of attribution.
- Target: target user, role, channel, message, config object, or giveaway identifiers.
- Change: before object, after object, and normalized field-level diff.
- Message: message ID, author, safe content snapshot, attachment metadata, embed summary, reply reference.
- Moderation: reason, evidence references, case ID, duration, expiration, responsible command.
- Request: dashboard user ID, request ID, safe IP representation, user agent summary, endpoint/action.
- Integrity: createdAt, retention expiration, redaction state, optional hash for tamper-evidence.

### 6.4 Logging Architecture

- Centralized logging service with logEvent(), logChange(), logModerationAction(), logSystemEvent().
- Queue or buffered asynchronous writer for high-volume events with bounded retries and dead-letter strategy.
- Structured database records first; Discord log-channel embeds are a delivery view.
- Configurable destinations by category: messages, moderation, channels, roles, members, voice, config, security, system health.
- Prevent recursive logging. Handle uncached partial Discord objects. Use Discord audit-log lookups sparingly.
- Metrics: events received, written, dropped, retried, delivery failures, queue depth, processing latency.

### 6.5 Dashboard Logging Interface

- Unified log viewer with filters for date range, event category, action, actor, target, channel, severity, source.
- Expandable rows showing before/after diffs without exposing raw database internals.
- Full-text search where safe and indexed; message content search disabled by server policy.
- Pagination or cursor-based loading for large histories.
- Export to JSON or CSV only for authorized roles, with audit event for every export.
- Detail pages with related case, ticket, transcript, user, channel, or config links.
- Redaction controls for owners or designated privacy administrators.
- Clear empty, loading, permission-denied, retention-expired, and partial-data states.

### 6.6 Permissions and Privacy

- Logging configuration is owner-only unless explicitly delegated.
- Message content logs require explicit opt-in and configurable excluded channels/categories.
- Never log passwords, tokens, cookies, headers, keys, env vars, or request bodies with secrets.
- Redact webhook tokens, invite secrets, sensitive query parameters, PII patterns.
- Support retention policies: 7, 30, 90, 180, 365 days, plus controlled custom value.
- Allow legal/privacy deletion or redaction without corrupting unrelated audit history.
- Access to logs must itself be logged.

### 6.7 Logging Reliability and Performance

- Logging failures must not crash the bot or block the Discord event loop.
- Per-guild and global backpressure limits.
- Batch inserts where appropriate. Indexes for guildId, eventType, timestamp, actorId, targetId, expiration.
- TTL indexes verified for retention requirements.
- Large before/after objects size-limited and normalized.
- Alert on sustained failure rates without flooding staff channels.

### 6.8 Logging Test Matrix

- Create/update/delete tests for messages, channels, roles, and configured server settings.
- Before/after diff correctness including added, removed, and changed permission bits.
- Uncached message deletion and partial-object behavior.
- Audit-log actor attribution success, ambiguity, delay, and failure.
- Excluded channels and disabled message-content logging.
- Redaction of tokens, secrets, webhook URLs, sensitive headers.
- Permission tests for view, filter, export, configure, redact, and delete operations.
- High-volume tests verifying batching, backpressure, no recursion, no event-loop blocking.
- Retention expiration and export audit events.
- Discord delivery failure while database persistence remains successful.

### 6.9 Logging Definition of Done

- All required event categories have documented support or explicit platform limitation.
- Every record follows normalized schema with schema version.
- Permissions, privacy exclusions, retention, and redaction enforced server-side.
- Dashboard provides usable filtering and detail views.
- Database and Discord-channel delivery behavior independently observable.
- Failure, rate-limit, partial-cache, and high-volume tests pass.
- Operational documentation explains configuration, retention, storage impact, and troubleshooting.

## 7-14. Batches 3-10

See the per-batch tracking files and issue milestones for details. Batches 3 through 10 follow the standard structure: acceptance criteria, implementation plan, domain changes, and evidence requirements. They are not expanded here to avoid duplication with GitHub issue descriptions.

## 15. v1.0 Final Release Gate

- Batches 1-10 are closed with evidence.
- No open critical or high-severity security vulnerabilities.
- All automated checks pass on the release commit.
- Production build and database migrations verified.
- Core E2E journeys pass in production-like environment.
- Performance budgets met.
- WCAG 2.2 AA critical journeys verified.
- Logging, retention, privacy exclusions, export controls, monitoring operational.
- Backup restoration and rollback proven.
- Administrator, deployment, troubleshooting, and release documentation complete.
- Release tag and release notes created only after approval.

## 16. Required Completion Report Template

Use this structure for every completed issue:

1. Issue number and title.
2. Commit hash.
3. Files created, changed, moved, or deleted.
4. Behavior implemented or preserved.
5. Automated tests added and total tests passing.
6. Manual checks performed.
7. Security, privacy, accessibility, and performance considerations.
8. Known limitations or follow-up issues.
9. Confirmation that acceptance criteria and Definition of Done were met.

---

## 17. Batch 11 — Gambling System (Post-v1.0)

A complete virtual currency gambling system for entertainment only. No real money, cryptocurrency, or items with real-world value. All games use the bot's virtual economy.

### 17.1 Design Document

See `docs/design/GAMBLING_SYSTEM.md` for the full game specifications, including all 20+ games, fairness requirements, security rules, and UX guidelines.

### 17.2 Dependency-Ordered Phases

| Phase | Focus | Description | Dependencies |
|-------|-------|-------------|--------------|
| 1 | Economy Foundation | Virtual currency system (coins/chips), balance management, atomic deposits/withdrawals, transaction history, starting balance, anti-exploit, cooldowns. `/balance`, `/pay`, `/leaderboard` commands. Economy service layer and database models. | None |
| 2 | Game Engine & Security | Shared game framework: secure randomness, input validation, bet resolution, payout calculation, interaction lifecycle (buttons, timeouts, cleanup). Race condition prevention, double-payout protection, overflow safety. Standard embed templates. | Phase 1 |
| 3 | Simple Games | Coin Flip, Dice, Slots, High-Low. Single-player, minimal UI, rapid development. Establish the game registration pattern so future games self-register. | Phase 2 |
| 4 | Interactive Games | Blackjack, Mines, Towers, Plinko. Multi-step interactions, buttons, stage management, animations, cash-out flows. | Phase 3 |
| 5 | Multiplayer & Jackpot | Texas Hold'em, War, Baccarat, Jackpot. Player rotation, dealer logic, hand evaluation, pool management, winner selection. | Phase 4 |
| 6 | Achievements & Leaderboards | Statistics tracking, achievement definitions, leaderboard computation, daily/weekly rewards, gambling XP and levels, player profiles. | Phase 1-5 |
| 7 | Admin Config & Polish | Admin configuration panel (enabled games, min/max bets, cooldowns, multipliers, house edge, jackpot limits). Balance tuning, edge-case hardening, performance optimization, full test suite, production readiness sign-off. | Phase 6 |

### 17.3 Economy Foundation (Phase 1) Requirements

Before any gambling game can exist, the shared economy must support:

- **Virtual currency**: Configurable name (coins/chips/tokens), starting balance, min/max limits.
- **User balance**: Per-user balance stored in MongoDB. Atomic increment/decrement via `findOneAndUpdate` with `$inc` to prevent race conditions.
- **Transactions**: Immutable history log with type (bet, win, loss, daily, pay, admin), amount, balance snapshot, timestamp, and optional reference ID.
- **Daily rewards**: Configurable amount, 24h cooldown, streak tracking, bonus for consecutive days.
- **Payments**: `/pay @user amount` with validation, anti-fraud minimums, and transaction logging.
- **Anti-exploit**: Negative balance prevention, maximum bet limits per config, cooldowns per game, rate limiting on balance-sensitive endpoints.

### 17.4 Game Registration Pattern

Each game module exports a standard interface:

```js
export const game = {
  name: 'blackjack',
  aliases: ['bj'],
  minBet: 1,
  maxBet: 10000,
  cooldown: 0,
  async execute(interaction, balance) { /* ... */ },
};
```

A central game registry (`src/games/index.js`) auto-discovers modules in `src/games/` and registers slash commands, cooldowns, and statistics hooks. Adding a new game requires only creating a file in `src/games/` following the interface — no modifications to existing code.

### 17.5 Security Rules

- Every interaction validated server-side: bet amount, user identity, channel, cooldown state.
- Balance operations use atomic MongoDB operations (`$inc`) — never read-modify-write.
- Payouts calculated and applied server-side before any response is sent to the client.
- Randomness uses `crypto.randomBytes` or `crypto.getRandomValues` — never `Math.random()`.
- Interaction tokens and custom IDs validated against session state to prevent replay.
- Daily rewards and cooldowns enforced via database timestamps, not in-memory state.
- Rate limiting on all economy-sensitive commands (min 1s between deposits/withdrawals).

### 17.6 Acceptance Criteria

- All 20+ games functional and playable from Discord.
- Balance never goes negative under any sequence of operations.
- Concurrent requests for the same user do not produce incorrect balances.
- Transaction history is complete and tamper-evident.
- All statistical counters are accurate after any sequence of wins and losses.
- Leaderboards update within configurable delay (default 60s).
- Achievements unlock correctly and only once.
- Admin configuration changes take effect without restart.
- Full test suite passes: unit, integration, and scenario-based economy tests.
- No regressions in existing bot functionality (337+ existing tests).
