# Development Standard
## Penguuu Bot + Dashboard — Engineering Standard v4.0 (Frozen)

> **Version:** 4.0 (Frozen)
> **Last Updated:** 2026-07-26
> **Status:** Active — frozen. Update only for recurring problems, incorrect rules, or fundamental architecture changes.

---

## Table of Contents

- [A. Engineering Principles](#a-engineering-principles)
- [B. Performance Budgets](#b-performance-budgets)
- [C. Quality Gates](#c-quality-gates)
- [D. Implementation Rules](#d-implementation-rules)
- [E. Database Safety](#e-database-safety)
- [F. Accessibility](#f-accessibility)
- [G. Observability](#g-observability)
- [H. Browser Testing](#h-browser-testing)
- [I. Release Checklist](#i-release-checklist)
- [J. Review Checklist](#j-review-checklist)
- [K. UI/UX Philosophy](#k-uiux-philosophy)
- [L. Animation](#l-animation)
- [M. Modern Dashboard](#m-modern-dashboard)
- [N. Reliability](#n-reliability)
- [O. Decision Rules](#o-decision-rules)
- [P. AI Decision Framework](#p-ai-decision-framework)
- [Q. AI Success Criteria](#q-ai-success-criteria)
- [R. Technical Debt](#r-technical-debt)
- [T. Refactoring](#t-refactoring)
- [U. Visual Consistency](#u-visual-consistency)
- [V. Design Review](#v-design-review)
- [W. Performance Monitoring](#w-performance-monitoring)
- [X. Maintainability](#x-maintainability)
- [Y. Production Release Policy](#y-production-release-policy)
- [Z. Long-Term Vision](#z-long-term-vision)
- [Appendix 1: Architecture Evolution](#appendix-1-architecture-evolution)
- [Appendix 2: Final Polish Pass](#appendix-2-final-polish-pass)
- [Appendix 3: AI Self Review](#appendix-3-ai-self-review)

---

## A. Engineering Principles

### 1. Reliability Over Features
Every feature must be implemented with production reliability as a first-class concern. A feature that crashes, loses data, or silently fails is worse than no feature at all.

### 2. Defensive Programming
Assume everything external can and will fail: Discord API, MongoDB, user input, browser APIs. Every call must have error handling. Every user-facing path must have graceful degradation.

### 3. Single Source of Truth
Every configuration value, constant, and shared definition lives in exactly one place. If a value appears in 3+ files, it belongs in `src/config/constants.js`.

### 4. Minimal Surface Area
Every exposed API, route, or component is a maintenance burden. Prefer fewer, well-tested endpoints over many narrow ones. Prefer composable components over monolithic ones.

### 5. Reversibility
Design every change so it can be reverted safely. Feature flags, atomic operations, idempotent handlers. Never make an irreversible change to production data without a backup.

---

## B. Performance Budgets

### Frontend (Dashboard Client)

| Metric | Budget |
|--------|--------|
| Initial JS bundle (raw) | < 500KB |
| Initial JS bundle (gzipped) | < 150KB |
| Initial CSS (gzipped) | < 15KB |
| First Contentful Paint | < 2s |
| Largest Contentful Paint | < 4s |
| Time to Interactive | < 5s |
| Total page weight | < 1MB |
| Route transitions | < 300ms |

### Backend (Bot + API)

| Metric | Budget |
|--------|--------|
| API response time (p50) | < 200ms |
| API response time (p95) | < 500ms |
| API response time (p99) | < 2s |
| MongoDB query time (p95) | < 100ms |
| Bot command response | < 3s |
| Health endpoint | < 100ms |

### Enforcement
- Bundle size checked in CI (npm run build fails if JS > 500KB raw)
- API response times logged in production (p50/p95/p99)
- Slow queries logged with threshold warnings
- Lighthouse score target: Performance > 90, Accessibility > 90

---

## C. Quality Gates

### Before Every Commit
1. **Lint passes:** `npm run lint` (zero errors, warnings documented)
2. **Typecheck passes:** `npm run typecheck` (zero errors)
3. **Build succeeds:** `npm run build` (no warnings in production)
4. **Tests pass:** `npm test` (all existing tests green)

### Before Every Deploy
1. All quality gates above pass
2. Manual smoke test of critical paths:
   - Login works
   - Dashboard loads without console errors
   - Bot connects to Discord
   - Ticket system creates and closes
   - Welcome messages send correctly
3. No new `console.log` or `console.error` added to production code (except ErrorBoundary)
4. No hardcoded URLs, ports, or secrets
5. All new API endpoints have input validation
6. All new database models have indexes

### Before Every Release
1. All items above pass
2. Full regression test of existing features
3. Performance budget checked
4. Accessibility audit (axe-core or equivalent)
5. Browser compatibility verified (Chrome, Firefox, Safari, Edge - latest 2 versions)
6. Mobile responsive verified (320px, 375px, 768px, 1024px, 1440px)

---

## D. Implementation Rules

### D1. Environment Variables
- **Never hardcode secrets.** All secrets come from `.env`.
- **Never provide default fallbacks for critical values.** `JWT_SECRET`, `OWNER_ID`, `DISCORD_TOKEN`, `MONGODB_URI` must be present or the server fails fast.
- **Log missing env vars at startup.** Never silently use empty strings.
- Validate env vars early in `index.js` / `server/index.js` before importing other modules.

### D2. Error Handling
- **Every try/catch must do something.** Empty catch blocks are forbidden.
- **API errors return structured responses:** `{ error: "Human-readable message", details: "Technical detail" }`.
- **Never expose internal errors to users.** Log them server-side, show friendly messages.
- **Every unhandled rejection and uncaught exception** must trigger graceful shutdown.

### D3. Async Operations
- **Every async function has a try/catch.**
- **Every database write is atomic** where possible (use `$set`, `$inc`, `$addToSet`, `$pull` operators).
- **Every API handler has a timeout.** Discord API calls: 10s. Database operations: 5s. External services: 15s.
- **Race conditions:** Use `AbortController` on frontend fetches. Use `fetchIdRef` patterns for sequential data loads.

### D4. Input Validation
- **All user input is validated server-side.** Client-side validation is UX only.
- **All Discord snowflakes** validated with regex: `/^\d{17,20}$/`.
- **All string inputs** have `maxLength` enforcement.
- **All numeric inputs** have `min`/`max` bounds.
- **All enum inputs** validated against allowed values.

### D5. Logging
- **Structured logging only.** No raw `console.log` in production.
- **Severity levels:** `error` (requires action), `warn` (monitored), `info` (audit trail), `debug` (development only).
- **Every log includes:** timestamp, context (which module/service), and relevant IDs.
- **Never log:** passwords, tokens, JWT secrets, raw user messages.

### D6. API Design
- **RESTful conventions:** GET (read), POST (create), PUT/PATCH (update), DELETE (remove).
- **Consistent response format:** `{ success: true, data: {...} }` or `{ success: false, error: "..." }`.
- **Pagination:** `?page=1&limit=25` with `{ data: [], total: N, page: N, totalPages: N }` response.
- **Rate limiting** on all mutation endpoints.
- **CORS** configured with dynamic origin callback, not wildcard.

### D7. Git Conventions
- **Commit format:** `type(scope): description` (e.g., `fix(tickets): resolve race condition`)
- **Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`
- **Scopes:** `bot`, `api`, `dashboard`, `tickets`, `giveaways`, `welcome`, `moderation`, `config`, `ci`
- **No WIP commits** to main. Squash or rebase before push.
- **One logical change per commit.** No mixed feature/fix commits.

---

## E. Database Safety

### E1. Schema Design
- **Every schema has timestamps:** `{ timestamps: true }`.
- **Every reference field** has an index.
- **Every query field** has an index (compound indexes for multi-field queries).
- **Every schema has a `toJSON` transform** that strips sensitive fields.
- **No schema references** without population strategy defined.

### E2. Query Safety
- **Never use `findOne` without a limit** when the collection could grow unbounded.
- **Never use `$where`** (server-side JavaScript in MongoDB).
- **Always use `lean()`** for read-only queries (Mongoose performance optimization).
- **Batch writes** when processing more than 100 documents.
- **Use `$inc`** for counters (atomic) instead of read-modify-write.

### E3. Migration Safety
- **Never drop a collection** in production without a backup.
- **Never rename a field** - add new field, migrate data, remove old field.
- **Every migration must be reversible.**
- **Test migrations against a copy of production data.**

### E4. Connection Safety
- **Connection pooling:** Use Mongoose defaults (min 5, max 10 connections).
- **Reconnection logic:** Exponential backoff with jitter.
- **Health check:** Verify MongoDB connectivity in `/health` endpoint.
- **Graceful degradation:** Bot continues running without DB; API returns 503.

---

## F. Accessibility

### F1. Keyboard Navigation
- Every interactive element must be focusable.
- Tab order must follow visual order.
- No keyboard traps (user can always Tab out of any component).
- Escape closes modals, dropdowns, and command palette.
- Enter/Space activates buttons and links.

### F2. Screen Readers
- All images have meaningful `alt` text (decorative images get `alt=""`).
- All icon-only buttons have `aria-label`.
- All modals have `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
- All forms have `<label>` or `aria-label` on every input.
- Active navigation has `aria-current="page"`.
- Tables have `scope="col"` on headers.

### F3. Visual Accessibility
- Text contrast minimum 4.5:1 against background.
- Never convey information through color alone (use icons, text, or patterns).
- Focus indicators visible against all backgrounds.
- Support `prefers-reduced-motion: reduce`.
- Support `prefers-color-scheme: dark` (future).

### F4. ARIA Roles
- Use semantic HTML elements first (`<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`).
- Add ARIA roles only when semantic HTML is insufficient.
- Use `aria-live="polite"` for dynamic content updates (toasts, status changes).
- Use `aria-live="assertive"` for errors.
- Use `aria-expanded` for collapsible sections.

---

## G. Observability

### G1. Logging Standards
- **Structured JSON logging** in production (not plain text).
- **Correlation IDs:** Every request gets a unique ID; log all related events with the same ID.
- **Log levels:** `error` (action required), `warn` (monitored), `info` (audit), `debug` (dev only).
- **Log rotation:** Daily files, 30-day retention, 100MB max per file.

### G2. Health Checks
- `GET /health` returns: `{ status: "ok", uptime: N, mongodb: "connected", discord: "connected" }`
- Health check must complete in < 100ms.
- Health check must not throw (return degraded status instead).
- Render uses this for auto-restart decisions.

### G3. Error Tracking
- Every unhandled error captured with full context (stack trace, user ID, request path, timestamp).
- Owner DM notification for critical errors.
- Error deduplication (don't spam the same error 100 times).
- Error categorization: transient (retry), permanent (fix required), user-caused (message user).

### G4. Performance Monitoring
- API response times tracked per endpoint.
- MongoDB slow query logging (> 100ms threshold).
- Memory usage tracked (Node.js `process.memoryUsage()`).
- Uptime tracking (continuous since last restart).

---

## H. Browser Testing

### H1. Required Browsers
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### H2. Viewport Testing
- 320px (iPhone SE, small phones)
- 375px (iPhone 12/13/14)
- 768px (iPad portrait)
- 1024px (iPad landscape, small laptops)
- 1440px (standard desktop)
- 1920px (full HD)

### H3. Interaction Testing
- All forms submit correctly
- All modals open/close
- All dropdowns select/deselect
- All toasts appear and dismiss
- All page transitions smooth
- All loading states display
- All error states display
- All empty states display

### H4. Edge Cases
- Slow network (3G throttle)
- JavaScript disabled (graceful degradation message)
- Window resize during interaction
- Multiple rapid clicks on same button
- Browser back/forward navigation
- Deep linking to specific pages

---

## I. Release Checklist

### Pre-Release
1. All quality gates pass (Section C)
2. All browser tests pass (Section H)
3. All accessibility requirements met (Section F)
4. Performance budgets met (Section B)
5. All TODO comments resolved or documented
6. All `console.log` removed from production code
7. All hardcoded values extracted to config/env
8. All new features have corresponding tests
9. Database migrations tested against production-like data
10. Rollback plan documented

### Release
1. Git tag with version number (`v1.x.x`)
2. Deploy to staging first (if applicable)
3. Smoke test critical paths
4. Deploy to production
5. Monitor for 30 minutes
6. Verify health endpoint

### Post-Release
1. Verify all features work in production
2. Check error logs for new issues
3. Verify performance metrics
4. Update documentation if needed
5. Close release milestone

---

## J. Review Checklist

### Every PR Must Have
1. Clear description of what changed and why
2. No unrelated changes in the same PR
3. All quality gates pass
4. Test coverage for new code (minimum: happy path + error path)
5. No hardcoded values
6. No `console.log` in production code
7. No dead code introduced
8. Input validation on all new endpoints
9. Error handling on all new async operations
10. Accessibility requirements met for new UI

### Reviewer Must Verify
1. Code follows existing patterns (don't invent new ones)
2. No security vulnerabilities introduced
3. No performance regressions
4. Database changes are backward compatible
5. API changes are backward compatible (or versioned)
6. Error messages are user-friendly
7. Loading/empty/error states handled
8. Mobile responsive (if UI change)
9. Keyboard accessible (if UI change)

---

## K. UI/UX Philosophy

### K1. Calm Design
The dashboard should feel calm, modern, and efficient. It should never overwhelm the user. Every screen should answer:
- What am I looking at?
- What should I do next?
- Where is the primary action?

### K2. Progressive Disclosure
Show only what the user needs at each step. Don't dump all options at once. Use collapsible sections, tabs, and step-by-step flows.

### K3. Immediate Feedback
Every user action gets immediate visual feedback:
- Button click -> loading spinner
- Form submit -> toast notification
- Navigation -> page transition
- Data load -> skeleton or spinner

### K4. Consistent Patterns
If two things look the same, they should work the same. If two things look different, they should work differently. Never break this mental model.

### K5. Error Recovery
Every error state should include a clear path to recovery:
- "Something went wrong" -> "Try Again" button
- "Access denied" -> "Request Access" link
- "Not found" -> "Go Home" link

---

## L. Animation

### L1. Animation Scale
| Duration | Usage |
|----------|-------|
| 150ms | Micro-interactions (hover, focus, active) |
| 200ms | Standard transitions (page fade, modal enter, toast) |
| 300ms | Complex transitions (sidebar slide, content panel) |

### L2. Animation Rules
- Duration: 150-250ms maximum for interactive transitions
- Avoid: bouncing, spinning (except loading), flashy effects, excessive scaling
- Prefer: fade, slight movement (4-8px), opacity, subtle scale (0.95-1.0)
- Loading animations communicate progress, not entertainment
- All animations must respect `prefers-reduced-motion: reduce`

### L3. Animation Easing
- Default: `cubic-bezier(0.4, 0, 0.2, 1)` (standard ease)
- Enter: `cubic-bezier(0, 0, 0.2, 1)` (decelerate)
- Exit: `cubic-bezier(0.4, 0, 1, 1)` (accelerate)
- Spring: `cubic-bezier(0.34, 1.56, 0.64, 1)` (bounce, use sparingly)

---

## M. Modern Dashboard

### M1. Page Composition
Every page follows this structure:
```
PageHeader (title + subtitle + primary action)
StatsGrid (optional)
Toolbar (filters, search)
ContentCard (tables, charts, lists)
SecondaryCard (optional)
```

### M2. Component Composition
```
Card
├── Header (section title, action link)
├── Body (main content)
└── Footer (pagination, submit buttons, secondary actions)
```

### M3. Layout Rules
- Sidebar: fixed left, 256px expanded, 72px collapsed
- Main content: flex-1, overflow-auto, max-w-[1400px] mx-auto
- Padding: `p-4 md:p-8 lg:p-10`
- Mobile: sidebar becomes overlay with hamburger menu

### M4. Glass Morphism
- Use on: cards, modals, sidebar, login card, command palette
- Don't use on: tooltips, dropdowns, badges, buttons, inline alerts
- Always pair with dark background (dark-800/60)
- Always include backdrop-blur-xl

---

## N. Reliability

### N1. Graceful Degradation
- Bot continues running without MongoDB (prefix commands from memory)
- Dashboard shows friendly error when API is down
- Welcome messages skip if target channel doesn't exist
- Reaction roles skip if reaction fails
- Transcripts attempt DM, fall back to log channel

### N2. Retry Logic
- Discord API calls: retry 3 times with exponential backoff
- MongoDB operations: Mongoose handles connection retries
- External services: retry 2 times, then fail gracefully
- Never retry non-idempotent operations without confirmation

### N3. Idempotency
- Webhook handlers must be idempotent (duplicate deliveries shouldn't cause duplicate effects)
- Ticket creation must be idempotent (same user shouldn't get 2 open tickets)
- Giveaway entries must be idempotent (same user can't enter twice)

### N4. State Machine
- Tickets follow explicit state machine: OPEN -> CLOSED -> ARCHIVED
- No state transitions skip steps
- Every state change is logged
- Invalid state transitions return clear error

---

## O. Decision Rules

### O1. When to Add a New Component
- If you need it in 3+ places, make it a component
- If it's more than 50 lines, consider breaking it into components
- If it has its own state management, it's a component
- If it's purely presentational and used once, keep it inline

### O2. When to Add a New API Endpoint
- If it serves a distinct user action, add a new endpoint
- If it's a variation of an existing endpoint, add a query parameter
- If it's a combination of existing endpoints, add a new endpoint
- Never add an endpoint that duplicates an existing one

### O3. When to Add a New Database Index
- If you query by a field more than 100 times/day, add an index
- If you sort by a field, add an index
- If you filter by a field in combination with another field, add a compound index
- Never add more than 5 indexes to a single collection

### O4. When to Refactor
- If a file exceeds 500 lines, consider splitting
- If a function exceeds 50 lines, consider extracting
- If you see a pattern repeated 3+ times, abstract it
- If you fix the same bug twice, add a guard/test

---

## P. AI Decision Framework

### P1. When AI Should Implement
- The task is clearly defined with acceptance criteria
- The implementation follows existing patterns in the codebase
- The scope is limited (1-3 files, < 200 lines)
- Tests can verify the implementation
- No architectural decisions are required

### P2. When AI Should Suggest
- The task requires understanding business context
- The implementation would affect 5+ files
- Architectural decisions are needed
- The task is ambiguous or has multiple valid approaches
- The user should make the final decision

### P3. When AI Should Ask
- The task is outside the defined scope
- The task requires access to external systems
- The task could introduce security vulnerabilities
- The task conflicts with existing patterns
- The task has irreversible consequences

### P4. AI Code Generation Rules
- Always read existing code before generating new code
- Always follow existing patterns (don't invent new ones)
- Always include error handling
- Always include input validation
- Always include loading/empty/error states for UI
- Never generate code that violates the security rules
- Never generate code that bypasses quality gates

---

## Q. AI Success Criteria

### Q1. Code Quality
- Zero lint errors
- Zero type errors
- Zero console.log in production code
- All functions have error handling
- All async functions have try/catch
- All user inputs are validated

### Q2. Testing
- All existing tests still pass
- New code has corresponding tests
- Tests cover happy path + error path
- Tests are deterministic (no flaky tests)

### Q3. Documentation
- Complex algorithms are commented
- All public APIs have JSDoc
- README is updated if setup changed
- CHANGELOG is updated for user-facing changes

### Q4. Performance
- No performance regressions
- Bundle size within budget
- No unnecessary re-renders
- No memory leaks

---

## R. Technical Debt

### R1. Known Debt
The following items are known technical debt that should be addressed in order of priority:

1. **`ticketService.js` (1227 lines)** - Needs refactoring into smaller service modules
2. **`api.js` frontend (945 lines)** - Needs splitting into domain-specific API modules
3. **`constants.js` duplicated across 3+ files** - Consolidate into single source of truth
4. **`prefixService.js` uses filesystem** - Migrate to MongoDB
5. **Tests test local copies, not actual source** - Fix test imports
6. **No Playwright/browser tests** - Add E2E test coverage
7. **Math.random in `Skeleton.jsx` render** - Move to useRef
8. **window.innerWidth in `Layout.jsx`** - Move to useState/useEffect
9. **Spread operator in `AnalyticsPage.jsx`** - Use Math.max with array
10. **Dead CSS in `index.css`** - Remove unused utility classes

### R2. Debt Prevention
- No new files > 500 lines without explicit justification
- No new duplicated constants
- No new console.log in production code
- No new hardcoded values
- No new empty catch blocks

### R3. Debt Tracking
- Track all debt in GitHub Issues with label `tech-debt`
- Review debt quarterly
- Allocate 20% of each sprint to debt reduction
- Never ship new features with known critical debt

---

## T. Refactoring

### T1. Refactoring Rules
- **Never refactor and add features** in the same PR
- **Always have tests** before refactoring
- **Always verify** the refactored code does exactly the same thing
- **Always update documentation** if API or behavior changed
- **Always do it in small steps** - commit frequently

### T2. Refactoring Checklist
1. Write tests for current behavior (if not existing)
2. Make the change
3. Verify tests still pass
4. Verify no behavior change (unless intentional)
5. Update documentation
6. Commit with clear message

### T3. Refactoring Anti-Patterns
- Don't refactor code you don't understand
- Don't refactor without a clear goal
- Don't refactor and fix bugs at the same time
- Don't refactor and optimize at the same time
- Don't refactor just because you can

---

## U. Visual Consistency

### U1. Color Usage
- Primary accent: `ice-300` (#75CFF5) - buttons, links, active states
- Success: `green-400` - open status, positive trends
- Error: `red-400` - errors, closed status, destructive actions
- Warning: `yellow-400` - warnings, creating status
- Info: `blue-400` - information, pending status
- Text: `dark-100` through `dark-600` (hierarchy)
- Backgrounds: `dark-800` through `dark-950` (depth)

### U2. Spacing
- Use the 4px grid system
- Standard padding: `p-4`, `p-6`, `p-8`
- Standard gaps: `gap-2`, `gap-3`, `gap-4`, `gap-6`
- Standard margins: `mb-4`, `mb-6`, `mb-8`

### U3. Typography
- Use only the font scale defined in the Design System
- Never use arbitrary pixel sizes outside the token scale
- All numbers use `tabular-nums`
- All headings use `tracking-tight`
- All labels use `uppercase tracking-wider`

---

## V. Design Review

### V1. Before Merging Any UI Change
1. Matches the Design System tokens
2. Uses existing components (no new ones without discussion)
3. Follows the spacing scale
4. Has proper text hierarchy
5. Works at 320px width
6. Has loading/empty/error states
7. Is keyboard accessible
8. Has proper aria labels
9. Respects reduced motion
10. No arbitrary values outside token scale

### V2. Design Review Checklist
- [ ] Uses tokens from Design System
- [ ] Follows spacing scale (4px grid)
- [ ] Uses standard border radius (rounded-xl default)
- [ ] Has consistent text hierarchy
- [ ] Has hover state with opacity escalation
- [ ] Has focus-visible ring
- [ ] Has aria-label if icon-only
- [ ] Works at 320px width
- [ ] No console.log in code
- [ ] No dead code

---

## W. Performance Monitoring

### W1. Frontend Performance
- Track Core Web Vitals (LCP, FID, CLS)
- Track bundle size on every build
- Track route load times
- Track component render times (React DevTools)

### W2. Backend Performance
- Track API response times per endpoint
- Track MongoDB query times
- Track Discord API response times
- Track memory usage over time
- Track uptime percentage

### W3. Performance Alerts
- API response time > 2s (warn)
- API response time > 5s (error)
- MongoDB query time > 500ms (warn)
- Memory usage > 80% (warn)
- Memory usage > 95% (error)
- Uptime < 99.9% (error)

---

## X. Maintainability

### X1. Code Organization
- Bot code: `src/` with clear module separation
- Dashboard server: `dashboard/server/` with routes, models, middleware
- Dashboard client: `dashboard/client/src/` with pages, components, lib
- Tests: `tests/` mirroring source structure
- Documentation: `docs/`

### X2. Naming Conventions
- Files: `PascalCase` for components, `camelCase` for utilities
- Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Classes: `PascalCase`
- Database models: `PascalCase` singular (e.g., `Ticket`, not `Tickets`)

### X3. Import Order
1. React / external libraries
2. Internal utilities / config
3. Components
4. Styles
5. Types (if TypeScript)

### X4. File Size Limits
- Components: < 300 lines (extract sub-components if larger)
- Pages: < 500 lines (extract sections if larger)
- Services: < 400 lines (split into domain services if larger)
- API routes: < 200 lines (split into route modules if larger)

---

## Y. Production Release Policy

### Y1. Deployment
- Auto-deploy on push to `main` (Render)
- Manual deploy for hotfixes
- No direct pushes to `main` without PR review
- All PRs must pass CI before merge

### Y2. Rollback
- Every release must have a rollback plan
- Rollback = revert to last known good commit
- Database migrations must be reversible
- Feature flags for gradual rollout (future)

### Y3. Hotfix Process
1. Create hotfix branch from `main`
2. Fix the issue
3. Add regression test
4. PR review (expedited)
5. Merge and deploy
6. Verify fix in production
7. Update changelog

### Y4. Version Numbering
- Major: breaking changes (v2.0.0)
- Minor: new features (v1.1.0)
- Patch: bug fixes (v1.0.1)
- Current: v1.0.0 (initial release)

---

## Z. Long-Term Vision

### Z1. Architecture Goals
- Clean separation between bot and dashboard
- Shared types and constants between bot and dashboard
- Comprehensive test coverage (> 80%)
- Full accessibility compliance (WCAG 2.1 AA)
- Performance budget enforcement in CI

### Z2. Feature Goals
- Complete ticket system with transcripts
- Comprehensive moderation tools
- Advanced analytics and reporting
- Role management automation
- Welcome and verification system
- Giveaway system with advanced features

### Z3. Quality Goals
- Zero critical bugs in production
- 99.9% uptime
- < 2s page load time
- > 90 Lighthouse score
- > 80% test coverage

---

## Appendix 1: Architecture Evolution

### Current Architecture
- Bot: Discord.js v14, MongoDB Atlas, Express.js
- Dashboard: React + Vite + Tailwind, Express.js API
- Deployment: Render (auto-deploy from main)
- Database: MongoDB Atlas (cloud)

### Future Architecture Considerations
- Rate limiting middleware (Redis-backed)
- WebSocket for real-time dashboard updates
- Background job queue (Bull/BullMQ)
- Structured logging (Winston/Pino)
- APM integration (New Relic/Datadog)
- CDN for static assets

---

## Appendix 2: Final Polish Pass

Before v1.0 release, every component needs:
1. Loading state (skeleton preferred)
2. Empty state (with clear CTA)
3. Error state (with recovery path)
4. Keyboard navigation
5. Screen reader labels
6. Reduced motion support
7. Mobile responsive
8. Focus management

---

## Appendix 3: AI Self Review

After every AI-generated change, verify:
1. No new console.log or console.error (except ErrorBoundary)
2. No hardcoded values (URLs, ports, secrets, IDs)
3. No empty catch blocks
4. No new arbitrary CSS values outside Design System tokens
5. All async functions have try/catch
6. All user inputs validated
7. All error states handled
8. No performance regressions
9. No accessibility regressions
10. Code follows existing patterns

---

*This document is frozen as v4.0. It will only be updated when a recurring problem is discovered, an incorrect rule is identified, or a fundamental architecture change occurs. All implementation decisions should reference this document first.*