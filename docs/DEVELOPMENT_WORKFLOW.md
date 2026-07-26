# Development Workflow
## Penguuu Bot + Dashboard — Working with Cursor/Cline

> **Version:** 1.0
> **Last Updated:** 2026-07-26
> **Purpose:** How to use AI coding assistants effectively with this codebase.

---

## Table of Contents

- [1. Before You Start](#1-before-you-start)
- [2. Session Setup](#2-session-setup)
- [3. Task Workflow](#3-task-workflow)
- [4. Reading the Codebase](#4-reading-the-codebase)
- [5. Making Changes](#5-making-changes)
- [6. Verification](#6-verification)
- [7. Common Tasks](#7-common-tasks)
- [8. Pitfalls and Workarounds](#8-pitfalls-and-workarounds)
- [9. Documentation References](#9-documentation-references)

---

## 1. Before You Start

### Essential Reading

Every session should begin by understanding:

1. **Development Standard** (`docs/DEVELOPMENT_STANDARD.md`) — the frozen rules. Read this first if you haven't worked on this project before.
2. **Design System** (`docs/design/DESIGN_SYSTEM.md`) — visual tokens and patterns. Read before any UI work.
3. **Coding Style Guide** (`docs/CODING_STYLE_GUIDE.md`) — code conventions. Read before writing any code.

### Environment Requirements

- **Node.js:** v18+ (check with `node --version`)
- **Git:** Latest (check with `git --version`)
- **Git executable path:** `C:\Program Files\Git\cmd\git.exe`
- **MongoDB Atlas:** Connection string in `.env` (MONGODB_URI)
- **Discord Bot Token:** In `.env` (DISCORD_TOKEN)
- **Render:** Auto-deploys from `main` branch

### Critical Environment Variables

```
# Bot
DISCORD_TOKEN=...
MONGODB_URI=...
OWNER_ID=1293164546005012512
PREFIX=!

# Dashboard Server
JWT_SECRET=...          # REQUIRED - server fails fast without it
OWNER_ID=1293164546005012512
CLIENT_URL=https://calibers-dashboard.onrender.com
PORT=3001

# Dashboard Client (Vite)
VITE_API_URL=https://calibers-dashboard.onrender.com
```

---

## 2. Session Setup

### For Cursor/Cline

1. Open the project root (`calibers-igloo-bot/`).
2. Read the relevant documentation before making changes:
   - UI changes: Read Design System first
   - Bot changes: Read Development Standard
   - API changes: Read both Development Standard and Coding Style Guide
3. Understand the file you're about to modify — read its context, imports, and neighbors.
4. Plan the change before implementing. Explain what you're doing and why.

### For Human Developers

1. `git pull origin main` to get latest
2. `npm install` in project root (bot dependencies)
3. `cd dashboard/client && npm install` (dashboard client dependencies)
4. `cp .env.example .env` and fill in secrets (if first time)
5. Read the relevant docs before making changes

---

## 3. Task Workflow

### Step-by-Step Process

```
1. UNDERSTAND
   What is the user asking for?
   What files are involved?
   Are there existing patterns to follow?

2. SEARCH
   Find existing code that does something similar
   Check for existing components that could be reused
   Look for existing tests that cover this area

3. PLAN
   Describe the change in plain language
   Identify which files need modification
   Consider edge cases and error handling

4. IMPLEMENT
   Make the changes following the style guide
   Follow existing patterns exactly
   Add error handling for every async operation

5. VERIFY
   Run lint (npm run lint)
   Run typecheck (npm run typecheck)
   Run build (npm run build)
   Run tests (npm test)

6. REPORT
   What was changed and why
   What was NOT changed (and why)
   Any known limitations or follow-up items
```

### When AI Should Stop and Ask

Stop implementation and ask the user when:
- The task requires understanding business context not in the codebase
- The change affects 5+ files with architectural implications
- There are multiple valid approaches with trade-offs
- The task conflicts with existing patterns
- The task has irreversible consequences (data migration, schema change)

---

## 4. Reading the Codebase

### File Discovery

Use glob patterns to find relevant files:

```
Bot commands:          src/commands/*.js
Bot services:          src/services/*.js
Bot models:            src/database/models/*.js
Dashboard API:         dashboard/server/routes/*.js
Dashboard middleware:   dashboard/server/middleware/*.js
Dashboard models:      dashboard/server/models/*.js
Dashboard pages:       dashboard/client/src/pages/*.jsx
Dashboard components:  dashboard/client/src/components/*.jsx
Dashboard utilities:   dashboard/client/src/lib/*.js
Tests:                 tests/*.test.js
Config:                src/config/*.js, dashboard/client/tailwind.config.js
```

### Understanding a File

Before modifying any file, read:
1. The file itself (full content)
2. Its imports (what it depends on)
3. Its direct neighbors (files in the same directory)
4. Its consumers (files that import it)

### Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `src/index.js` | Bot entry | Env validation, client setup, event handlers |
| `src/services/ticketService.js` | ~1227 | Ticket business logic (known debt: needs refactoring) |
| `src/services/giveawayService.js` | Giveaway logic | Atomic ending, role enforcement |
| `dashboard/server/routes/api.js` | ~945 | All REST API endpoints (known debt: needs splitting) |
| `dashboard/server/middleware/auth.js` | Auth | JWT verification, role checking |
| `dashboard/server/services/discord.js` | Discord API | Server-side Discord helper |
| `dashboard/client/src/lib/api.js` | Frontend API | Client-side API client |
| `dashboard/client/src/lib/auth.jsx` | Auth provider | React context for authentication |
| `dashboard/client/src/App.jsx` | Router | All routes, ErrorBoundary wrapper |
| `dashboard/client/src/index.css` | Styles | Tailwind directives + custom classes |
| `dashboard/client/tailwind.config.js` | Theme | Color tokens, animations, shadows |

---

## 5. Making Changes

### Change Types and Safety

| Change Type | Risk | Verification |
|-------------|------|-------------|
| UI text change | Low | Visual check |
| Style/class change | Low | Visual check + build |
| Component prop change | Medium | Check all consumers |
| API endpoint change | High | Check all frontend callers |
| Database schema change | Critical | Migration plan + rollback |
| Bot command change | Medium | Test in Discord dev server |
| Auth/middleware change | Critical | Full auth flow test |
| Dependency update | Medium | Full regression test |

### Modifying Bot Code

1. Read the file and its neighbors
2. Check `src/config/constants.js` for shared values
3. Follow existing command patterns (look at similar commands)
4. Add error handling with try/catch
5. Log errors with logger, not console.log
6. Test in Discord dev server before pushing

### Modifying Dashboard Server

1. Read the route file and its middleware
2. Check `dashboard/server/models/` for related models
3. Validate all inputs (use existing validation patterns)
4. Return consistent response format: `{ success: true, data: ... }`
5. Add audit logging for sensitive operations
6. Test with API client or curl

### Modifying Dashboard Client

1. Read the page component and its imports
2. Check `dashboard/client/src/components/` for reusable components
3. Check `dashboard/client/src/lib/api.js` for API calls
4. Follow the Design System tokens (no arbitrary values)
5. Handle loading/empty/error states
6. Add keyboard accessibility (focus ring, aria labels)
7. Test at 320px width (mobile)

### Adding New Files

1. Check if something similar already exists
2. Follow naming conventions from the style guide
3. Place in the correct directory
4. Import in the correct order
5. Add to relevant documentation if it's a significant addition

---

## 6. Verification

### Automated Checks

```bash
# Bot
npm run lint          # ESLint
npm test              # Unit tests

# Dashboard Client
cd dashboard/client
npm run lint          # ESLint
npm run typecheck     # TypeScript (if applicable)
npm run build         # Vite build
```

### Manual Checks

After any UI change:
1. Open in browser
2. Check loading state (skeleton appears)
3. Check empty state (appears with CTA)
4. Check error state (toast + friendly message)
5. Check mobile (320px width)
6. Check keyboard (Tab through all interactive elements)
7. Check screen reader (aria labels present)

After any API change:
1. Test with valid auth
2. Test without auth (should get 401)
3. Test with invalid input (should get 400/422)
4. Test the error response format

After any bot change:
1. Test the command in Discord
2. Test error cases (missing permissions, invalid input)
3. Check console for unhandled errors
4. Verify database state after command

### Build Verification

The build must pass before any push:
```
npm run build
# Should produce: dashboard/client/dist/
# JS < 500KB raw, CSS < 44KB raw
```

---

## 7. Common Tasks

### Adding a New Bot Command

1. Create `src/commands/my-command.js`
2. Export: `{ data: SlashCommandBuilder, async execute(interaction) {} }`
3. Add to command registration in `src/index.js`
4. Add prefix alias in `src/index.js` if needed
5. Add to `src/config/constants.js` if it uses shared values
6. Test in Discord dev server

### Adding a New Dashboard Page

1. Create `dashboard/client/src/pages/MyPage.jsx`
2. Follow page composition: PageHeader + StatsGrid + Toolbar + ContentCard
3. Add route in `dashboard/client/src/App.jsx`
4. Add sidebar link in `dashboard/client/src/components/Sidebar.jsx`
5. Handle loading/empty/error states
6. Add API endpoint in `dashboard/server/routes/api.js` if needed
7. Add auth protection if sensitive

### Adding a New API Endpoint

1. Add route in `dashboard/server/routes/api.js` (or new route file)
2. Add auth middleware: `authenticateToken` or `requireOwner`
3. Validate all inputs
4. Use consistent response format
5. Add audit logging if mutating
6. Update API client in `dashboard/client/src/lib/api.js` if frontend needs it

### Adding a New Database Model

1. Create `dashboard/server/models/MyModel.js` or `src/database/models/MyModel.js`
2. Add timestamps: `{ timestamps: true }`
3. Add indexes for query fields
4. Add `toJSON` transform to strip sensitive fields
5. Consider migration strategy for existing data
6. Add to relevant service files

### Fixing a Bug

1. Reproduce the bug (get exact steps)
2. Find the root cause (read the relevant code)
3. Write a test that catches the bug (if possible)
4. Fix the bug with minimal code change
5. Verify the test passes
6. Verify no regressions (run full test suite)
7. Add regression test to prevent recurrence

---

## 8. Pitfalls and Workarounds

### Known Issues

| Issue | Workaround |
|-------|-----------|
| `ticketService.js` is 1227 lines | Read it in sections; don't modify without understanding the full flow |
| `api.js` frontend is 945 lines | Use the domain-specific sections; don't modify the whole file |
| Tests test local copies, not actual source | Tests are a safety net but don't guarantee correctness of actual source files |
| `constants.js` is duplicated across files | Always check all 3+ locations when modifying shared values |
| `prefixService.js` uses filesystem | Don't add new prefix features; the system is migrating to MongoDB |

### Git Gotchas

- Auto-formatting may reformat entire files. Review diffs carefully before committing.
- Windows line endings: Use LF, not CRLF. Configure git: `git config core.autocrlf false`
- Large files: Don't commit `.env`, `node_modules/`, or `dist/`. Check `.gitignore`.

### Render Deployment

- Auto-deploys on push to `main`
- Build command: `cd dashboard/client && npm install && npm run build && cd .. && npm install`
- Start command: `node dashboard/server/index.js`
- Health check: `GET /health`
- Logs available in Render dashboard
- If deploy fails: check build logs, usually a dependency or build error

### Discord API Limits

- 50 requests/second per route
- 2000 character message limit (use embeds for longer content)
- 10 channel deletes per 10 minutes per guild
- Rate limit headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset-After`
- Always handle rate limit errors (429) with retry

### MongoDB Atlas

- Connection string includes password — never commit it
- Free tier: 512MB storage, shared RAM
- Indexes: Each collection has specific indexes defined in the schema
- Connection pooling: Mongoose handles this automatically
- If queries are slow: check indexes, use `explain()`, consider `lean()` for reads

---

## 9. Documentation References

### When to Reference Each Document

| Task | Document |
|------|----------|
| Writing any code | Development Standard (rules) + Coding Style Guide (conventions) |
| UI/component work | Design System (tokens, patterns) |
| Bug fixes | Development Standard Section D (implementation rules) |
| Performance work | Development Standard Section B (performance budgets) |
| Accessibility work | Development Standard Section F + Design System Section 21 |
| Database changes | Development Standard Section E (database safety) |
| API changes | Development Standard Section D6 (API design) |
| Deployment | Development Standard Section Y (release policy) |
| Code review | Development Standard Section J (review checklist) |
| AI assistance | Development Standard Sections P-Q (AI framework) |

### Document Version Policy

| Document | Version | Update Policy |
|----------|---------|---------------|
| Development Standard | v4.0 (Frozen) | Only for recurring problems, incorrect rules, or fundamental changes |
| Design System | v1.0 (Frozen) | Only for recurring visual inconsistencies |
| Coding Style Guide | v1.0 (Living) | Update when new patterns emerge |
| This document | v1.0 (Living) | Update when workflow changes |

---

*This workflow document is a living reference. Update it when new patterns emerge, new tools are adopted, or existing processes prove inadequate. The goal is to make every development session productive and consistent.*