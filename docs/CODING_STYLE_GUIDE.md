# Coding Style Guide
## Penguuu Bot + Dashboard — Code Conventions

> **Version:** 1.0
> **Last Updated:** 2026-07-26
> **Companion to:** DEVELOPMENT_STANDARD.md v4.0

---

## Table of Contents

- [1. Project Structure](#1-project-structure)
- [2. JavaScript Style](#2-javascript-style)
- [3. React Component Style](#3-react-component-style)
- [4. CSS and Tailwind Style](#4-css-and-tailwind-style)
- [5. Naming Conventions](#5-naming-conventions)
- [6. Import Order](#6-import-order)
- [7. File Organization](#7-file-organization)
- [8. Comments and Documentation](#8-comments-and-documentation)
- [9. Error Handling Patterns](#9-error-handling-patterns)
- [10. Anti-Patterns to Avoid](#10-anti-patterns-to-avoid)

---

## 1. Project Structure

```
calibers-igloo-bot/
├── src/                          # Bot source code
│   ├── commands/                 # Slash + prefix commands
│   ├── database/                 # MongoDB models and connection
│   ├── services/                 # Business logic
│   ├── config/                   # Constants and configuration
│   └── index.js                  # Bot entry point
├── dashboard/
│   ├── server/                   # Express API
│   │   ├── middleware/           # Auth, rate limiting
│   │   ├── models/              # Dashboard-specific models
│   │   ├── routes/              # API routes
│   │   ├── services/            # Discord API helpers
│   │   └── index.js             # Server entry point
│   └── client/                   # React frontend
│       ├── src/
│       │   ├── components/      # Shared components
│       │   ├── pages/           # Route pages
│       │   ├── lib/             # Utilities and API client
│       │   └── index.css        # Global styles + Tailwind
│       ├── tailwind.config.js   # Tailwind theme tokens
│       └── vite.config.js       # Build config
├── tests/                        # Unit tests
├── docs/                         # Engineering documentation
└── .env                          # Secrets (never committed)
```

---

## 2. JavaScript Style

### General Rules
- Use ES modules (`import`/`export`) everywhere. No CommonJS `require()` in dashboard code.
- Bot code (`src/`) uses CommonJS (`require`/`module.exports`) — this is dictated by Discord.js v14 conventions.
- Use `const` by default. Use `let` only when reassignment is necessary. Never use `var`.
- Use template literals for string interpolation, not concatenation.
- Use optional chaining (`?.`) and nullish coalescing (`??`) instead of manual null checks.
- Use destructuring for object/array access when it improves readability.
- Use arrow functions for callbacks and short functions. Use `function` declarations for top-level named functions.

### Example: Good vs Bad

```js
// GOOD
const { channelId, guildId } = interaction.options;
const channel = guild.channels.cache.get(channelId);
if (!channel) return;

// BAD
var channelId = interaction.options.channelId;
var guildId = interaction.options.guildId;
var channel = guild.channels.cache.get(channelId);
if (channel == null || channel == undefined) {
  return;
}
```

### Async/Await
- Always use `async/await` over raw Promises.
- Every `async` function must have a `try/catch`.
- Never use `.then()/.catch()` chains in new code.

```js
// GOOD
async function sendMessage(channel, content) {
  try {
    await channel.send(content);
  } catch (error) {
    logger.error('Failed to send message', { channelId: channel.id, error });
  }
}

// BAD
function sendMessage(channel, content) {
  return channel.send(content).catch((err) => {
    console.log(err);
  });
}
```

### Equality
- Use `===` and `!==` (strict equality) always.
- Never use `==` or `!=` (loose equality).

### String Quotes
- Use single quotes for strings: `'hello'`
- Use double quotes only in JSX attributes: `className="foo"`
- Use backticks for template literals: `` `Hello ${name}` ``

---

## 3. React Component Style

### Component Declarations
- Use arrow function components with `export default`.
- One component per file. File name matches component name (PascalCase).

```jsx
// GOOD
export default function StatCard({ icon, label, value, trend }) {
  return (
    <div className="stat-card">
      <div className="icon-container">{icon}</div>
      <span className="value">{value}</span>
      <span className="label">{label}</span>
    </div>
  );
}

// BAD
const StatCard = (props) => {
  // ...
}
export default StatCard;
```

### Hooks Rules
- Call hooks at the top level. Never inside loops, conditions, or nested functions.
- Custom hooks prefixed with `use`: `useAuth`, `useToast`.
- `useEffect` always has a dependency array. Always return a cleanup function when needed.
- Use `useCallback` for functions passed to child components or used in `useEffect` dependencies.
- Use `useMemo` for expensive computations, not for trivial derivations.

```jsx
// GOOD
const fetchData = useCallback(async () => {
  const id = ++fetchIdRef.current;
  try {
    setLoading(true);
    const data = await api.getTickets();
    if (id === fetchIdRef.current) {
      setTickets(data);
    }
  } catch (err) {
    toast.error('Failed to load tickets');
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  fetchData();
  return () => { cancelled = true; };
}, [fetchData]);

// BAD
useEffect(() => {
  fetch('/api/tickets')
    .then((res) => res.json())
    .then((data) => setTickets(data))
    .catch((err) => console.log(err));
}, []);
```

### State Management
- Local state with `useState` is the default.
- Lift state up only when two sibling components need the same data.
- No global state library (Redux, Zustand). Auth state lives in `AuthContext`.
- Derived state: compute during render, don't store in state.

```js
// GOOD — derive state, don't store it
const filteredTickets = tickets.filter(t => t.status === filter);

// BAD — storing derived state
const [filteredTickets, setFilteredTickets] = useState([]);
useEffect(() => {
  setFilteredTickets(tickets.filter(t => t.status === filter));
}, [tickets, filter]);
```

### Conditional Rendering
- Use early returns for loading/error/empty states.
- Use ternary for binary choices only.
- Use `&&` for conditional elements, but never with numbers (`count && <span>{count}</span>` renders "0").

```jsx
// GOOD — early returns for states
if (loading) return <Skeleton />;
if (error) return <ErrorState message={error} />;
if (items.length === 0) return <EmptyState />;

// GOOD — ternary for binary
{isOpen ? <OpenBadge /> : <ClosedBadge />}

// BAD — && with number
{count && <span>{count} items</span>}
```

### Props
- Destructure props in the function signature.
- No prop spreading (`{...props}`) unless building a wrapper component.
- Boolean props: use `is` prefix (`isLoading`, `isActive`).
- Callback props: use `on` prefix (`onClick`, `onSubmit`, `onChange`).

---

## 4. CSS and Tailwind Style

### Tailwind-First
- Use Tailwind utility classes for all styling.
- No inline `style={{}}` attributes unless absolutely necessary (dynamic values only).
- No CSS modules. No styled-components. No CSS-in-JS.
- Custom CSS goes in `index.css` only, using Tailwind's `@layer` directives.

### Custom Classes
- Only create custom classes in `index.css` when the same Tailwind string appears 3+ times.
- Prefix custom classes with a clear intent: `.btn-primary`, `.stat-card`, `.glass`.
- Keep custom classes minimal — delegate to Tailwind utilities internally.

```css
/* GOOD — minimal, delegates to Tailwind */
.btn-primary {
  @apply bg-ice-300/15 hover:bg-ice-300/25 active:bg-ice-300/30
         text-ice-300 border border-ice-300/25 hover:border-ice-300/40
         rounded-xl font-medium text-sm transition-all duration-200;
}

/* BAD — raw CSS duplicating Tailwind */
.btn-primary {
  background-color: rgba(117, 207, 245, 0.15);
  color: #75cff5;
  border: 1px solid rgba(117, 207, 245, 0.25);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}
```

### Class String Construction
- Use template literals for conditional classes.
- Use `clsx` library if conditional logic gets complex (3+ conditions).

```jsx
// GOOD — template literal
className={`stat-card ${isActive ? 'active' : ''}`}

// GOOD — clsx for complex conditions
className={clsx(
  'table-row',
  isSelected && 'bg-ice-300/10',
  isDisabled && 'opacity-50',
  isCritical && 'border-red-400/20'
)}
```

### Arbitrary Values
- Use official tokens from the Design System before inventing new values.
- The following arbitrary sizes are official tokens: `text-[9px]`, `text-[10px]`, `text-[11px]`, `w-[18px]`, `h-[18px]`.
- Any new arbitrary value must be added to the Design System first.
- Prefer `w-4` over `w-[16px]` when a Tailwind scale value exists.

---

## 5. Naming Conventions

### Files

| Type | Convention | Examples |
|------|-----------|----------|
| React components | PascalCase.jsx | `StatCard.jsx`, `Toast.jsx` |
| React pages | PascalCasePage.jsx | `TicketsPage.jsx`, `LoginPage.jsx` |
| Utility modules | camelCase.js | `api.js`, `auth.js` |
| Bot commands | kebab-case.js | `ban.js`, `setup-ticket.js` |
| Bot services | camelCase.js | `giveawayService.js`, `ticketService.js` |
| Database models | PascalCase.js | `Ticket.js`, `Giveaway.js` |
| CSS files | camelCase.css | `index.css` |
| Config files | camelCase.js | `tailwind.config.js`, `vite.config.js` |
| Test files | same as source + .test.js | `validation.test.js` |

### Variables and Functions

| Type | Convention | Examples |
|------|-----------|----------|
| Variables | camelCase | `ticketCount`, `isLoading` |
| Constants | UPPER_SNAKE_CASE | `MAX_TICKETS`, `DEFAULT_PREFIX` |
| Functions | camelCase | `sendMessage()`, `validateInput()` |
| React components | PascalCase | `StatCard`, `EmptyState` |
| Custom hooks | use prefix | `useAuth()`, `useToast()` |
| Boolean variables | is/has/can prefix | `isOpen`, `hasPermission`, `canEdit` |
| Event handlers | handle/on prefix | `handleSubmit()`, `onClick` |
| Refs | Ref suffix | `fetchIdRef`, `scrollRef` |

### Database

| Type | Convention | Examples |
|------|-----------|----------|
| Model name | PascalCase singular | `Ticket`, `Giveaway` |
| Collection name | auto (Mongoose pluralizes) | `tickets`, `giveaways` |
| Field names | camelCase | `guildId`, `createdAt` |
| Index names | descriptive | `guildId_1_status_1` |

### Discord

| Type | Convention | Examples |
|------|-----------|----------|
| Command names | lowercase, hyphenated | `setup-ticket`, `giveaway-start` |
| Command descriptions | Title Case | `Setup Ticket System`, `Start Giveaway` |
| Embed titles | Title Case | `Ticket Created`, `Giveaway Ended` |
| Embed fields | Title Case | `User`, `Channel`, `Reason` |

---

## 6. Import Order

Imports are grouped in this order, separated by blank lines:

### Bot Code (src/)

```js
// 1. Node.js built-ins
const path = require('path');
const fs = require('fs');

// 2. External packages
const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');

// 3. Internal config
const { PREFIX, EMBED_COLORS } = require('./config/constants');

// 4. Internal services
const ticketService = require('./services/ticketService');
const giveawayService = require('./services/giveawayService');

// 5. Internal models
const Ticket = require('./database/models/Ticket');
```

### Dashboard Server

```js
// 1. Node.js built-ins
const path = require('path');

// 2. External packages
const express = require('express');
const jwt = require('jsonwebtoken');

// 3. Internal config
const { OWNER_ID } = require('./config');

// 4. Internal middleware
const { authenticateToken } = require('./middleware/auth');

// 5. Internal models
const AuditLog = require('./models/AuditLog');

// 6. Internal services
const { fetchGuild } = require('./services/discord');
```

### Dashboard Client (React)

```jsx
// 1. React and external libraries
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

// 2. Internal utilities
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

// 3. Components
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';

// 4. Icons (lucide-react)
import { Users, Settings, Shield } from 'lucide-react';
```

---

## 7. File Organization

### Component File Structure

```jsx
// 1. Imports
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

// 2. Sub-component declarations (if any)
function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

// 3. Main component
export default function MyPage() {
  // 4. State declarations
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 5. Derived state
  const filteredData = data.filter(item => item.active);

  // 6. Effects
  useEffect(() => {
    fetchData();
  }, []);

  // 7. Handler functions
  async function fetchData() {
    try {
      const result = await api.getData();
      setData(result);
    } catch (err) {
      // handled by api client
    } finally {
      setLoading(false);
    }
  }

  // 8. Early returns for states
  if (loading) return <Skeleton />;
  if (data.length === 0) return <EmptyState />;

  // 9. Render
  return (
    <div className="space-y-6">
      <PageHeader title="My Page" />
      {/* content */}
    </div>
  );
}
```

### Service File Structure (Bot)

```js
// 1. Imports
const Ticket = require('../database/models/Ticket');
const { EMBED_COLORS } = require('../config/constants');

// 2. Constants
const CLOSE_DELAY = 1000 * 60 * 5;

// 3. Helper functions (private)
function buildTranscript(messages) {
  // ...
}

// 4. Exported functions
module.exports = {
  async createTicket(guildId, channelId, userId, department) {
    // ...
  },

  async closeTicket(ticketId, closedBy) {
    // ...
  },

  async getOpenTickets(guildId) {
    // ...
  },
};
```

---

## 8. Comments and Documentation

### When to Comment

| Situation | Action |
|-----------|--------|
| Complex algorithm | Comment the approach, not every line |
| Non-obvious business logic | Explain why, not what |
| Workaround for external bug | Link to issue, explain the workaround |
| Magic number | Extract to named constant with comment |
| TODO | Format: `// TODO(username): description` |
| HACK | Format: `// HACK(username): description — remove when X` |

### When NOT to Comment

| Situation | Action |
|-----------|--------|
| Obvious code | Don't comment — the code should be self-documenting |
| Restating the code | `// increment counter` above `counter++` is noise |
| Commented-out code | Delete it. Git remembers. |
| JSDoc on every simple function | Only on exported APIs and complex logic |

### JSDoc Format

```js
/**
 * Creates a ticket in the specified department channel.
 * @param {string} guildId - Discord guild snowflake ID
 * @param {string} channelId - Channel where ticket command was used
 * @param {string} userId - User requesting the ticket
 * @param {string} department - Department key (support, reports, hiring)
 * @returns {Promise<Ticket>} Created ticket document
 * @throws {Error} If department config is invalid
 */
async function createTicket(guildId, channelId, userId, department) {
  // ...
}
```

---

## 9. Error Handling Patterns

### Pattern: Structured API Error Response

```js
// Server
app.post('/api/tickets', authenticateToken, async (req, res) => {
  try {
    const ticket = await createTicket(req.body);
    res.json({ success: true, data: ticket });
  } catch (error) {
    logger.error('Failed to create ticket', { error, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to create ticket',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});
```

### Pattern: Frontend Fetch with Toast

```jsx
async function handleDelete(id) {
  try {
    await api.deleteTicket(id);
    setTickets(prev => prev.filter(t => t.id !== id));
    toast.success('Ticket deleted');
  } catch (err) {
    toast.error('Failed to delete ticket');
  }
}
```

### Pattern: Race Condition Guard

```jsx
const fetchIdRef = useRef(0);

const fetchData = useCallback(async () => {
  const id = ++fetchIdRef.current;
  try {
    setLoading(true);
    const data = await api.getData();
    if (id === fetchIdRef.current) {
      setData(data);
    }
  } catch (err) {
    if (id === fetchIdRef.current) {
      toast.error('Failed to load data');
    }
  } finally {
    if (id === fetchIdRef.current) {
      setLoading(false);
    }
  }
}, []);
```

### Pattern: Cleanup on Unmount

```jsx
useEffect(() => {
  let cancelled = false;

  async function load() {
    try {
      const data = await api.getData();
      if (!cancelled) setData(data);
    } catch (err) {
      if (!cancelled) toast.error('Failed to load');
    }
  }

  load();
  return () => { cancelled = true; };
}, []);
```

### Pattern: Bot Command Error Reply

```js
// In command handler
try {
  await doSomething(interaction);
} catch (error) {
  logger.error('Command failed', {
    command: interaction.commandName,
    user: interaction.user.id,
    error,
  });

  const reply = {
    content: 'An error occurred while running this command.',
    ephemeral: true,
  };

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(reply).catch(() => {});
  } else {
    await interaction.reply(reply).catch(() => {});
  }
}
```

---

## 10. Anti-Patterns to Avoid

### Never

| Anti-Pattern | Why | Instead |
|-------------|-----|---------|
| Empty catch blocks | Silently swallows errors | Log and/or show user message |
| `console.log` in production | Pollutes logs, leaks data | Use structured logger |
| `console.error` (except ErrorBoundary) | Inconsistent with toast pattern | Use toast + logger |
| Hardcoded secrets | Security risk | Use .env |
| Default fallbacks for secrets | Hides misconfiguration | Fail fast if missing |
| `var` declarations | Hoisting bugs, function scope | Use `const`/`let` |
| Loose equality (`==`) | Type coercion bugs | Use `===` |
| `.then()/.catch()` chains | Harder to read/debug | Use async/await |
| Inline styles | Hard to maintain, no tokens | Use Tailwind classes |
| Prop spreading (`{...props}`) | Implicit API, hard to track | Pass explicit props |
| Derived state in useState | Stays stale, sync bugs | Compute during render |
| Magic numbers | Unclear meaning | Extract to named constant |
| Commented-out code | Noise, git remembers | Delete it |
| `useEffect` without dependency array | Runs every render | Always specify deps |
| Synchronous side effects in render | Causes re-render loops | Move to useEffect |
| Global mutable state | Race conditions, stale data | Use React state/context |
| More than one primary button per section | Confuses users | One primary action per section |
| Console errors in production frontend | Inconsistent error handling | Use ErrorBoundary + toast |

---

*This style guide is a living document. Update it when new patterns emerge or existing conventions prove inadequate. Always reference the codebase for precedent before adding new conventions.*