# Design System
## Penguuu Dashboard — Visual Reference v1.0 (Frozen)

> **Version:** 1.0 (Frozen)
> **Last Updated:** 2026-07-26
> **Status:** Active — single source of truth for all visual decisions.

---

## Table of Contents

- [1. Design Goals](#1-design-goals)
- [2. Color Tokens](#2-color-tokens)
- [3. Typography Scale](#3-typography-scale)
- [4. Spacing Scale](#4-spacing-scale)
- [5. Border Radius](#5-border-radius)
- [6. Elevation](#6-elevation)
- [7. Layout and Page Structure](#7-layout-and-page-structure)
- [8. Responsive Density](#8-responsive-density)
- [9. Buttons](#9-buttons)
- [10. Inputs and Forms](#10-inputs-and-forms)
- [11. Cards and Stat Cards](#11-cards-and-stat-cards)
- [12. Tables and Lists](#12-tables-and-lists)
- [13. Modals and Overlays](#13-modals-and-overlays)
- [14. Navigation](#14-navigation)
- [15. Badges and Status Indicators](#15-badges-and-status-indicators)
- [16. Toasts and Alerts](#16-toasts-and-alerts)
- [17. Loading, Empty, and Error States](#17-loading-empty-and-error-states)
- [18. Icons](#18-icons)
- [19. Motion and Reduced Motion](#19-motion-and-reduced-motion)
- [20. Responsive Behavior](#20-responsive-behavior)
- [21. Accessibility Requirements](#21-accessibility-requirements)
- [22. Do and Don't Examples](#22-do-and-dont-examples)
- [23. Component Acceptance Checklist](#23-component-acceptance-checklist)

---

## 1. Design Goals

The dashboard should feel **calm, modern, and efficient**. It should never overwhelm the user.

Every screen should answer:
- What am I looking at?
- What should I do next?
- Where is the primary action?

**Avoid:** giant gradients, glowing borders everywhere, oversized icons, thick borders, unnecessary shadows, neon accents on every element.

**Prefer:** subtle elevation, soft borders, consistent spacing, muted backgrounds, accent colors only where meaningful.

---

## 2. Color Tokens

### Primary: Ice Blue

| Token | Hex | Usage |
|-------|-----|-------|
| ice-300 | #75cff5 | Primary accent. Active states, links, primary buttons, focus rings, navigation highlights. |
| ice-400 | #38bdf8 | Gradient endpoints, login button, secondary emphasis. |
| ice-500 | #0ea5e9 | Gradient endpoints, ambient glow, deep accent. |

Use ice-300 as the default accent. Escalate to ice-400/ice-500 only for gradients and high-emphasis elements.

### Secondary: Dark Slate

| Token | Hex | Usage |
|-------|-----|-------|
| dark-100 | #f1f5f9 | Primary text (headings, values) |
| dark-200 | #e2e8f0 | Secondary text (labels, hover states) |
| dark-300 | #cbd5e1 | Tertiary text (sub-labels) |
| dark-400 | #94a3b8 | Muted text (descriptions, subtitles) |
| dark-500 | #64748b | Subtle text (placeholders, secondary labels) |
| dark-600 | #475569 | Faint text (timestamps, tertiary) |
| dark-700 | #334155 | Borders, dividers, scrollbar thumb |
| dark-800 | #1e293b | Card/surface backgrounds |
| dark-900 | #0f172a | Deep surfaces (inputs, sidebar) |
| dark-950 | #020617 | Base page background, modal overlays |

### Semantic Colors

| Color | Token | Background | Text | Border |
|-------|-------|-----------|------|--------|
| Success | green-400 | bg-green-400/10 | text-green-400 | border-green-400/20 |
| Error | red-400 | bg-red-400/10 | text-red-400 | border-red-400/20 |
| Warning | yellow-400 | bg-yellow-400/10 | text-yellow-400 | border-yellow-400/20 |
| Info | blue-400 | bg-blue-400/10 | text-blue-400 | border-blue-400/20 |
| Danger | red-500 | bg-red-500/15 | text-red-400 | border-red-500/25 |

### Opacity Scale

| Opacity | Usage |
|---------|-------|
| /5 | Subtle background glows |
| /10 | Icon container backgrounds, badge backgrounds |
| /15 | Button default backgrounds, stat card backgrounds |
| /20 | Hover backgrounds, badge borders |
| /25 | Button active borders |
| /30 | Button hover states, focus rings, toggle active |
| /40 | Button hover borders, toast borders |
| /50 | Overlays, disabled states |
| /60 | Glass backgrounds, progress bars |
| /70 | Modal overlays |
| /80 | Table headers, mobile header |

---

## 3. Typography Scale

### Font Sizes

The following sizes are official tokens, not arbitrary values:

| Token | Size | Usage |
|-------|------|-------|
| text-[9px] | 9px | Keyboard shortcut badges only |
| text-[10px] | 10px | Timestamps, sidebar nav labels, section meta |
| text-[11px] | 11px | Sidebar subtitle, badge text, disclaimers |
| text-xs | 12px | Labels, table cells, descriptions |
| text-sm | 14px | Body text, inputs, buttons, card content |
| text-base | 16px | Empty state titles |
| text-lg | 18px | ErrorBoundary heading, section titles |
| text-xl | 20px | Login title |
| text-2xl | 24px | Page titles, stat card values |

### Font Weights

| Class | Usage |
|-------|-------|
| font-medium | Navigation items, badges, buttons, secondary labels |
| font-semibold | Section headings, sidebar brand, table headers |
| font-bold | Page titles, stat values, card headings |

### Font Features

| Class | Usage |
|-------|-------|
| font-mono | Ticket IDs, timestamps, terminal, code displays |
| tabular-nums | All numeric displays (counts, dates, percentages) |
| tracking-tight | Headings (text-2xl font-bold tracking-tight) |
| tracking-wider | Section titles, labels (uppercase tracking-wider) |
| tracking-widest | Sidebar section labels (text-[10px] uppercase tracking-widest) |
| uppercase | Section titles, labels, badge text |

### Text Hierarchy

```
Primary:      text-dark-100 font-bold     (headings, values)
Secondary:    text-dark-300 font-medium   (sub-headings, active items)
Tertiary:     text-dark-400               (descriptions, subtitles)
Muted:        text-dark-500               (placeholders, labels)
Faint:        text-dark-600               (timestamps, meta)
Accent:       text-ice-300                (links, active states, primary actions)
Error:        text-red-400                (errors, destructive labels)
Success:      text-green-400              (success states, open status)
```

---

## 4. Spacing Scale

### Page-Level

| Pattern | Classes |
|---------|---------|
| Main content padding | p-4 md:p-8 lg:p-10 |
| Page max width | max-w-[1400px] mx-auto |
| Section vertical spacing | space-y-6 or space-y-8 |
| Page header bottom margin | mb-8 |

### Component Internal

| Pattern | Classes |
|---------|---------|
| Card padding | p-5 (stat cards), p-6 (content panels) |
| Modal padding | p-6 |
| Toolbar/filter bar | p-3 or p-3.5 |

### Gap Scale

| Value | Usage |
|-------|-------|
| gap-0.5 | Mini chart bars, progress bars |
| gap-1 | Pagination buttons, badge internals |
| gap-1.5 | Sort buttons, breadcrumbs, selectors |
| gap-2 | Button groups, toolbar buttons |
| gap-2.5 | Sidebar nav items |
| gap-3 | Card layouts, filter toolbar, toasts |
| gap-4 | Grid gaps (sm), table header gaps |
| gap-6 | Grid gaps (lg) |

### Grid Breakpoints

| Layout | Classes |
|--------|---------|
| Stat cards | grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 |
| Quick actions | grid-cols-2 sm:grid-cols-4 gap-3 |
| Content panels | grid-cols-1 lg:grid-cols-2 gap-6 |
| Settings layout | grid-cols-1 lg:grid-cols-4 gap-6 |

---

## 5. Border Radius

| Token | Usage |
|-------|-------|
| rounded-sm | Mini chart bars |
| rounded-md | Color swatches, kbd elements |
| rounded-lg | Skeleton shapes, btn-sm, progress bars |
| rounded-xl | Most common. Buttons, inputs, nav items, badges, toggles, cards |
| rounded-2xl | Glass panels, icon containers, sidebar brand, modals, command palette |
| rounded-full | Avatars, status dots, badges (.badge), toggles, spinners, blur blobs |

---

## 6. Elevation

Define elevation levels with consistent shadow tokens. Extend the Tailwind theme with named shadows:

| Level | Token | Value | Usage |
|-------|-------|-------|-------|
| 0 | (none) | - | Backgrounds, base surfaces |
| 1 | shadow-card | 0 8px 25px rgba(0,0,0,0.15) | Cards at rest, stat cards |
| 2 | shadow-dropdown | 0 8px 32px rgba(0,0,0,0.4) | Dropdowns, color pickers, popovers |
| 3 | shadow-modal | 0 25px 60px rgba(0,0,0,0.5) | Modals, command palette |
| glow | shadow-glow | 0 0 20px rgba(117,207,245,0.06) | Glow border cards |
| brand | shadow-brand | 0 0 20px rgba(117,207,245,0.15) | Brand icon, login button |

### Usage Rules
- Cards at rest: no shadow or shadow-card
- Cards on hover: escalate to shadow-card (add if not present)
- Dropdowns: shadow-dropdown
- Modals and overlays: shadow-modal
- Decorative glow: shadow-glow or shadow-brand (use sparingly)
- Never combine multiple shadow tokens on one element

### Tailwind Theme Extension

```js
// tailwind.config.js
boxShadow: {
  card: '0 8px 25px rgba(0,0,0,0.15)',
  dropdown: '0 8px 32px rgba(0,0,0,0.4)',
  modal: '0 25px 60px rgba(0,0,0,0.5)',
  glow: '0 0 20px rgba(117,207,245,0.06)',
  brand: '0 0 20px rgba(117,207,245,0.15)',
}
```

---

## 7. Layout and Page Structure

Every page follows this structure:

```
PageHeader (title + subtitle + primary action)
StatsGrid (optional)
Toolbar (filters, search)
ContentCard (tables, charts, lists)
SecondaryCard (optional)
```

### Page Composition

```
Page
+-- PageHeader
+-- StatsGrid (optional, grid of StatCards)
+-- Toolbar (filters, search, action buttons)
+-- ContentCard (glass panel with main content)
|   +-- CardHeader (section title, link)
|   +-- CardBody (table, list, or grid)
+-- Footer (pagination, secondary actions)
```

### Card Composition

```
Card
+-- Header (section title, action link)
+-- Body (main content)
+-- Footer (pagination, submit buttons, secondary actions)
```

### Layout Shell

```
Sidebar: fixed left, 256px expanded, 72px collapsed
Main: flex-1, overflow-auto, p-4 md:p-8 lg:p-10
Content: max-w-[1400px] mx-auto
Page root: space-y-6 or space-y-8
```

### Mobile Layout
- Sidebar collapses to overlay below 768px
- Hamburger menu in sticky header: sticky top-0 z-30 bg-dark-950/80 backdrop-blur-xl
- Padding reduces: p-4
- Grids stack: grid-cols-1
- Tables become horizontally scrollable: overflow-x-auto

---

## 8. Responsive Density

Define how content density changes across breakpoints:

| Element | Mobile (< 640px) | Tablet (640-1024px) | Desktop (> 1024px) |
|---------|-------------------|---------------------|---------------------|
| Tables | Card layout per row | Table with reduced padding (py-2) | Full table (py-3.5) |
| Stat cards | 2 columns, compact | 3 columns | 6 columns |
| Content panels | Single column, stacked | 2 columns | 2-3 columns |
| Filters | Stacked vertically | Wrapped row | Single row |
| Modals | Full width, rounded-none on edges | Centered, max-w-md | Centered, max-w-lg |
| Navigation | Overlay with hamburger | Collapsible sidebar | Fixed sidebar |
| Padding | p-4 | md:p-8 | lg:p-10 |

### Density Rules
- Never try to squeeze a desktop table onto a phone — convert to cards
- On mobile, reduce padding but never reduce touch target sizes
- Stat cards should always be a grid, never a list
- Filter bars should wrap gracefully, not overflow hidden

---

## 9. Buttons

### btn-primary — Primary Action

```
bg-ice-300/15 hover:bg-ice-300/25 active:bg-ice-300/30
text-ice-300 border border-ice-300/25 hover:border-ice-300/40
rounded-xl font-medium text-sm
focus-visible:ring-2 focus-visible:ring-ice-300/30
```

### btn-danger — Destructive Action

```
bg-red-500/15 hover:bg-red-500/25 active:bg-red-500/30
text-red-400 border border-red-500/25 hover:border-red-500/40
rounded-xl font-medium text-sm
focus-visible:ring-2 focus-visible:ring-red-500/30
```

### btn-ghost — Secondary/Neutral

```
hover:bg-dark-700/50 active:bg-dark-700/70
text-dark-400 hover:text-dark-200
rounded-xl font-medium text-sm
focus-visible:ring-2 focus-visible:ring-dark-600/50
```

### btn-sm — Small Variant

Stack on any button class: text-xs px-3 py-1.5 rounded-lg

### Login CTA Button (Gradient)

```
bg-gradient-to-r from-ice-400 to-ice-500
hover:from-ice-300 hover:to-ice-400
text-dark-950 rounded-xl font-semibold text-sm
shadow-brand
```

### Interaction Priority

When multiple actions appear together, follow this visual hierarchy:

```
Primary     ->  Filled/accent button (btn-primary or gradient)
Secondary   ->  Outline/subtle button (btn-ghost with border)
Tertiary    ->  Ghost/text button (btn-ghost, no border)
Danger      ->  Red button (btn-danger)
Disabled    ->  Any button with disabled:opacity-50
```

### Button Rules
- One primary action per section
- Loading state: replace icon with w-4 h-4 border-2 border-{color}/30 border-t-{color} rounded-full animate-spin
- Disabled: disabled:opacity-50 disabled:cursor-not-allowed
- Focus: always visible ring, never rely on outline alone
- One icon per button maximum
- Icon always appears before text (left side)

---

## 10. Inputs and Forms

### input-dark — Standard Input

```
w-full bg-dark-900/60 border border-dark-700/50 rounded-xl
px-4 py-2.5 text-dark-100 placeholder-dark-600 text-sm
focus:outline-none focus:border-ice-300/40 focus:ring-1 focus:ring-ice-300/15
disabled:opacity-40 disabled:cursor-not-allowed
```

### Select Dropdowns

```
input-dark appearance-none pr-10 cursor-pointer
```

With absolute chevron: absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none

### Toggle Switch

```
Track: w-11 h-6 rounded-full
Active: bg-ice-300/30
Inactive: bg-dark-700
Thumb: w-5 h-5 rounded-full
Active: bg-ice-300 left-[22px]
Inactive: bg-dark-500 left-0.5
```

### Form Label Pattern

```
text-xs font-medium text-dark-400 uppercase tracking-wider mb-1 block
```

### Form Rules
- Every input must have a <label> or aria-label
- Error messages: text-red-400 text-xs mt-1 with role="alert"
- Required fields: aria-required="true"
- All inputs must be keyboard-focusable with visible focus ring
- Labels always visible (never rely on placeholder as label)

---

## 11. Cards and Stat Cards

### Glass Card (.glass)

```
bg-dark-800/60 backdrop-blur-xl border border-dark-700/50 rounded-2xl
```

### Stat Card (.stat-card)

```
glass p-5 flex flex-col gap-1
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)
hover: shadow-card translateY(-1px)
```

- Icon container: w-10 h-10 rounded-xl with color background and ring
- Icon size: w-[18px] h-[18px]
- Value: text-2xl font-bold text-dark-100 tracking-tight
- Label: text-xs text-dark-500 mt-0.5
- Trend: text-green-400 (positive), text-red-400 (negative)

### Glow Border Card

```
border border-ice-300/15 shadow-glow
```

### When to Use Glass Morphism

**Use on:**
- Cards and panels (main content areas)
- Modals and overlays
- Sidebar
- Login card
- Command palette

**Don't use on:**
- Tooltips (too subtle for floating labels)
- Dropdown menus (use solid bg-dark-900)
- Inline alerts (use solid semantic backgrounds)
- Badges (too small for glass to read)
- Buttons (use opacity-based backgrounds instead)

---

## 12. Tables and Lists

### Table Header (.table-header)

```
sticky top-0 z-10 bg-dark-800/80 backdrop-blur-xl border-b border-dark-700/50
```

### Table Row (.table-row)

```
border-b border-dark-700/20 transition-colors duration-150
hover: bg-dark-700/15
```

### Table Rules
- Use semantic <table>, <thead>, <tbody>, <th> elements
- Column headers: px-4 py-3 text-left
- Cell padding: px-4 py-3.5
- Responsive: overflow-x-auto wrapper
- Hide columns on mobile: hidden sm:table-cell
- Convert to card layout below 640px for complex tables
- Section titles above tables: text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3

---

## 13. Modals and Overlays

### Modal Overlay

```
fixed inset-0 bg-dark-950/70 backdrop-blur-sm z-50 flex items-center justify-center
```

### Modal Content

```
glass p-6 w-full mx-4 space-y-4 max-h-[90vh] overflow-y-auto animate-fade-in shadow-modal
```

### Modal Sizes
- Default: max-w-md
- Large: max-w-lg
- Extra large: max-w-2xl

### Command Palette

```
Overlay: bg-dark-950/80 backdrop-blur-sm z-[100]
Content: glass rounded-2xl max-w-lg shadow-modal
```

### Modal Rules
- Must trap focus inside
- Must close on Escape
- Must return focus to trigger on close
- Must have role="dialog" and aria-modal="true"
- Maximum height: max-h-[90vh] with scroll
- On mobile: full width, reduced horizontal margin

---

## 14. Navigation

### Sidebar

```
Fixed left, full height
bg-dark-900/90 backdrop-blur-xl border-r border-dark-700/40
Width: 256px expanded, 72px collapsed
z-50
```

### Nav Items

```
Default: flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium
         text-dark-400 hover:text-dark-200 hover:bg-dark-800/40
Active:  bg-ice-300/10 text-ice-300 with left accent bar (w-[3px] h-4 rounded-r-full bg-ice-300)
```

### Section Labels

```
text-[10px] font-semibold text-dark-600 uppercase tracking-widest
```

### Brand Icon

```
w-10 h-10 rounded-xl bg-gradient-to-br from-ice-300 to-ice-500
shadow-brand
```

---

## 15. Badges and Status Indicators

### Badge (.badge)

```
text-[11px] px-2.5 py-1 rounded-full border font-medium
```

| Status | Classes |
|--------|---------|
| Open | bg-green-400/10 text-green-400 border-green-400/20 |
| Closed | bg-red-400/10 text-red-400 border-red-400/20 |
| Deleted | bg-dark-500/10 text-dark-500 border-dark-500/20 |
| Creating | bg-yellow-400/10 text-yellow-400 border-yellow-400/20 |

### Status Dots

```
w-2 h-2 rounded-full bg-green-400 shadow-brand
```

---

## 16. Toasts and Alerts

### Toast Container

```
fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none
```

### Toast Item

```
pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-modal
min-w-[280px] max-w-[400px]
```

| Type | Classes |
|------|---------|
| Success | border-ice-300/40 bg-ice-300/10 text-ice-300 |
| Error | border-red-400/40 bg-red-400/10 text-red-400 |
| Info | border-ice-300/20 bg-ice-300/5 text-ice-300/70 |

### Error Alert (Inline)

```
bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm
```

### Toast Rules
- Must have role="alert" for errors, role="status" for success/info
- Auto-dismiss after 3 seconds
- Maximum 5 visible toasts
- Pause timer on hover

---

## 17. Loading, Empty, and Error States

### Loading Spinner Sizes

| Size | Classes | Context |
|------|---------|---------|
| Small | w-4 h-4 border-2 border-{color}/20 border-t-{color} rounded-full animate-spin | Inside buttons |
| Medium | w-6 h-6 border-2 border-ice-300/20 border-t-ice-300 rounded-full animate-spin | Content loading |
| Large | w-8 h-8 border-2 border-ice-300/30 border-t-ice-300 rounded-full animate-spin | Page loading |
| XL | w-12 h-12 border-4 border-ice-300/30 border-t-ice-300 rounded-full animate-spin | App loading |

### Skeleton

```
background: linear-gradient(90deg, rgba(30,41,59,0.6) 0%, rgba(30,41,59,0.3) 50%, rgba(30,41,59,0.6) 100%)
background-size: 200% 100%
animation: shimmer 2s linear infinite
```

**Skeletons preferred over spinners.** Use skeletons for: page layouts, table rows, cards, stat cards.

### Empty State

```
Container: flex flex-col items-center justify-center py-20
Icon wrapper: w-20 h-20 rounded-2xl bg-dark-800/40 border border-dark-700/20
Title: text-base font-semibold text-dark-300 mb-1.5
Description: text-sm text-dark-500 max-w-xs text-center mb-6 leading-relaxed
Action: btn-primary text-sm
```

### Error Boundary

```
Container: min-h-screen bg-dark-950 flex items-center justify-center p-8
Card: glass p-8 max-w-md w-full text-center
Error icon: w-14 h-14 rounded-2xl bg-red-400/10 mx-auto
Title: text-lg font-semibold text-dark-100
Description: text-sm text-dark-400
```

### Loading State Rules
- Every data-fetching component must handle: loading, success, empty, error
- Show skeleton for layout, spinner for actions
- Never show a blank page during loading
- Never show zeros when data fails to load

---

## 18. Icons

### Size Scale

| Size | Classes | Context |
|------|---------|---------|
| Inline | w-3 h-3 | Indicators, small badges |
| Button | w-4 h-4 | Buttons, inputs, navigation |
| Section | w-5 h-5 | Section headers, sidebar |
| Header | w-6 h-6 | Page headers |
| Stat card | w-[18px] h-[18px] | Stat card icons |
| Container | w-10 h-10 | Icon containers in cards |
| Large | w-14 h-14 | Error boundary, empty states |

### Icon Colors
- Default: inherit from parent (text-current)
- Primary action: text-ice-300
- Success: text-green-400
- Error: text-red-400
- Muted: text-dark-500
- Sidebar active: text-ice-300

### Icon Source
All icons from lucide-react. No inline SVGs. No mixing icon libraries.

### Icon Usage Rules
- One icon per button or action
- Never mix filled and outlined icon sets — use lucide-react outline style consistently
- Icon always appears before text (left side in LTR)
- Don't color decorative icons with semantic colors (success/error)
- Avoid more than one status icon per row — use badges instead
- Icon color should match text color unless indicating status
- Don't use icons alone when text would be clearer (prefer icon + label over icon-only)

---

## 19. Motion and Reduced Motion

### Animation Scale

| Duration | Usage |
|----------|-------|
| 150ms | Micro-interactions (hover, focus, active) |
| 200ms | Standard transitions (page fade, modal enter, toast) |
| 300ms | Complex transitions (sidebar slide, content panel) |

### Available Animations

| Class | Duration | Effect |
|-------|----------|--------|
| animate-fade-in | 400ms | Opacity 0 to 1 |
| animate-fade-in-up | 400ms | Opacity 0 to 1 + translateY 12px to 0 |
| animate-slide-up | 400ms | Opacity 0 to 1 + translateY 20px to 0 |
| animate-slide-in-right | 300ms | Opacity 0 to 1 + translateX -12px to 0 |
| animate-scale-in | 200ms | Opacity 0 to 1 + scale 0.95 to 1 |
| animate-glow | 2s | Box-shadow pulse |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Animation Rules
- Duration: 150-250ms maximum for interactive transitions
- Avoid: bouncing, spinning (except loading), flashy effects, excessive scaling
- Prefer: fade, slight movement (4-8px), opacity, subtle scale (0.95-1.0)
- Loading animations communicate progress, not entertainment

---

## 20. Responsive Behavior

### Breakpoints

| Prefix | Width | Behavior |
|--------|-------|----------|
| (none) | < 640px | Mobile: single column, collapsed sidebar, reduced padding |
| sm: | >= 640px | Tablet: 2-3 col grids, multi-select filters |
| md: | >= 768px | Desktop: sidebar visible, md:p-8 |
| lg: | >= 1024px | Large: 2-3 col content panels, lg:p-10 |

### Responsive Patterns

| Element | Mobile | Desktop |
|---------|--------|---------|
| Sidebar | Overlay with hamburger | Fixed left panel |
| Stat cards | 2 columns, compact | 6 columns |
| Content panels | Single column | 2-3 columns |
| Tables | Card layout or scroll | Full width |
| Padding | p-4 | md:p-8 lg:p-10 |
| Page max width | 100% | max-w-[1400px] |
| Filters | Stacked | Single row |

### Mobile Rules
- All touch targets minimum 44x44px
- Tables must be scrollable or converted to cards, never broken
- Modals must fit within viewport
- No hover-dependent interactions (always provide alternatives)
- Filter bars should stack vertically

---

## 21. Accessibility Requirements

### Keyboard
- All interactive elements must be focusable
- Visible focus ring on every focusable element: focus-visible:ring-2 focus-visible:ring-{color}/30
- Tab order must follow visual order
- Escape closes modals, dropdowns, command palette

### Screen Readers
- All images: meaningful alt text
- All icon-only buttons: aria-label
- All modals: role="dialog", aria-modal="true", aria-labelledby
- All forms: <label> or aria-label on every input
- All errors: role="alert" or aria-live="assertive"
- Active navigation: aria-current="page"
- Tables: scope="col" on headers, aria-sort on sortable columns

### Color
- Text contrast: minimum 4.5:1 against background
- Never convey information through color alone (use icons, text, or patterns)
- Focus indicators visible against all backgrounds

### Motion
- Respect prefers-reduced-motion: reduce
- Provide @media fallback that disables animations

---

## 22. Do and Don't Examples

### DO

```
✅ Use glass morphism for cards and modals
✅ Use ice-300 for primary actions and active states
✅ Use semantic colors (green/red/yellow/blue) for status
✅ Use rounded-xl for buttons and inputs
✅ Use consistent spacing (4px grid, standard tokens)
✅ Use skeleton loading for page content
✅ Show loading, success, empty, and error states
✅ Use opacity escalation for hover states (15% -> 25% -> 30%)
✅ Keep one primary action per section
✅ Use tabular-nums for all numbers
✅ Define elevation levels (shadow-card, shadow-modal, etc.)
✅ Follow interaction priority (primary -> secondary -> ghost -> danger)
✅ One icon per button, icon before text
✅ Convert tables to cards on mobile
✅ Only use arbitrary text sizes (text-[9px], text-[10px], text-[11px]) from the official token scale
✅ Extend Tailwind theme with named shadow tokens (shadow-card, shadow-modal, etc.)
```

### DON'T

```
❌ Use arbitrary pixel values outside the token scale
❌ Use bright full-opacity colors for backgrounds
❌ Use glow effects on every card
❌ Use spinning animations for non-loading states
❌ Use hover-only interactions on mobile
❌ Show zeros when data fails to load
❌ Place more than one visually dominant button in a section
❌ Add console.log in production code
❌ Add UI controls without a clear user task
❌ Use glass morphism on tooltips, badges, or dropdowns
❌ Mix filled and outlined icon sets
❌ Use icons alone without text labels in navigation
❌ Squeeze desktop tables onto phone screens
❌ Place status icons in rows where badges would be clearer
❌ Use custom box-shadow values outside the shadow token system
```

---

## 23. Component Acceptance Checklist

Every new or modified component must pass:

```
[ ] Uses tokens from this design system (no arbitrary colors/sizes outside token scale)
[ ] Follows the spacing scale (4px grid, standard gap/padding values)
[ ] Uses standard border radius (rounded-xl default)
[ ] Has consistent text hierarchy (dark-100 through dark-600)
[ ] Has hover state with opacity escalation
[ ] Has focus-visible ring for keyboard navigation
[ ] Has aria-label if icon-only
[ ] Works at 320px width
[ ] Has loading/success/empty/error states if data-fetching
[ ] Respects prefers-reduced-motion
[ ] No custom CSS when Tailwind utilities suffice
[ ] Matches existing components of the same type
[ ] Uses elevation level from this system (not ad-hoc shadows)
[ ] Follows interaction priority if multiple actions present
[ ] Icon usage follows icon rules (one per button, before text, no mixing)
[ ] Mobile layout follows density rules (card layout for tables, stacked filters)
[ ] Glass morphism only on approved surfaces (cards, modals, sidebar — not tooltips/badges)
[ ] Shadow values use named tokens from Tailwind theme (shadow-card, shadow-modal, etc.)
```

---

*This is the single source of truth for all visual decisions. Every page, component, and new feature must conform to these tokens and patterns. If something is not covered here, check the existing codebase for precedent before inventing new values. This document is frozen as v1.0 — update only when a recurring inconsistency is discovered that the current system does not address.*