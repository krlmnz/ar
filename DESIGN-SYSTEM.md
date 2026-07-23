# Andean Road Design System
## Specification & Developer Handoff

**Site:** Andean Road (andean-road.com) — Personal Chile Travel Guide
**Voice:** The bilingual best friend — born in Chile, raised in New York
**Audience:** Coastal elite creative professionals who travel well
**Design References:** Massimo Vignelli's Unigrid system, Condé Nast Traveler, The New Yorker
**Tech Stack:** Eleventy (11ty), Nunjucks templates, CSS custom properties, Netlify

---

## 1. Design Principles

### Editorial Over Utilitarian
Places are personal recommendations, not database entries. Each entry should read like a text from a friend, not a TripAdvisor listing. First-person voice. Personality in every description.

### Type-Driven Hierarchy
Following Vignelli's axiom: *the grid is the skeleton, type is the voice.* Typography carries 80% of the visual hierarchy. Contrast achieved through size, weight, and tracking — not color.

### Monochrome Restraint
Greyscale by default. Color is earned, not decorative: one teal accent where interaction is promised (links, actions, focus), hue on maps and in data visualization where a legend decodes it. When color appears, it should feel like a single accent on a black-and-white photograph.

### Geometry With Depth
Radius and elevation are part of the language now — the no-border-radius principle is retired (2026-07-23, see §18). The reason: the site stopped being only a broadsheet when the Atelier took the lead. Application chrome — buttons, inputs, panels, dialogs — earns product affordances, and hard rectangles everywhere made the editor read as a form printed on newsprint. Both live on fixed scales, never ad hoc: `--radius-*` (with `--radius-none` keeping square a deliberate choice — map canvas edges, tables) and `--elevation-*` paired with `--color-shadow`, reserved for surfaces that genuinely float. Horizontal rules and clean rectangles still structure the editorial pages.

### Content-First
The writing IS the design. Everything else serves the prose. Strip away decoration. A well-written description of a place needs no badge or badge color.

### Dual-Mode Reading
Design for both map and list views. Both should feel native, not like one is a retrofit. Offline-capable — static maps and downloadable guides.

---

## 2. Typography System

One family — **Rethink Sans** — across five tiers. The serif is retired
(2026-07-23, see §18): the sans/serif split was carrying a distinction that the
andean size and weight axes now carry alone. Rethink Sans still says
"magazine"; the "trust this voice" job the serif used to do now belongs to the
body tier's generous size and 1.5 line-height. Hierarchy comes from the tier,
not the family.

### Tiers

Every tier is a token triple — `--font-size-*`, `--font-weight-*`,
`--line-height-*` — on its family token (`--font-family-display`, `-heading`,
`-body`, `-component`; the action tier rides `--font-family-component`). All
four families resolve to Rethink Sans.

| Tier | Sizes (desktop) | Weight | Line height | Usage |
|-------|------|--------|-------------|-------|
| **Display 1–4** | 84 / 72 / 60 / 48px | 400 | 1.2 | Hero statements, homepage title |
| **Heading 1–6** | 48 / 40 / 34 / 28 / 24 / 20px | 500 | 1.2 | Page titles down to card titles |
| **Body 1–4** | 20 / 16 / 14 / 12px | 400 (bold: 500) | 1.5 | Ledes, prose, descriptions, micro-meta |
| **Component x-small–x-large** | 12 / 14 / 16 / 20 / 24px | 400 (semibold: 500) | 1.2 | Interface text: labels, chips, panels |
| **Action x-small–large** | 12 / 14 / 16 / 20px | 500 | 1.2 | Buttons and controls, by control size |

Inputs have their own pair: `--font-size-input-text` and
`--font-size-input-label` (both 14px), with `--font-weight-input-label` and
`--color-input-label` on the label.

Two weights exist in the entire system: **400 and 500**. The old
600/700/800 ladder converged on purpose — the display sizes are big enough to
carry authority without heft (§18).

### Responsive scaling

`clamp()` is gone. The token file owns responsiveness: display and heading
sizes step down inside `andean.css` at its two breakpoints (≤992px and
≤480px), so a component states its tier once and never carries its own fluid
math. Body, component and action sizes hold steady across breakpoints.

### What has no token axis

Letter-spacing and text-transform have no andean axis — they stay literal, per
component, where the design calls for them. The overline pattern is the
canonical example:

```css
.hero-overline {
  font-size: var(--font-size-body-4);
  font-weight: var(--font-weight-component-semibold);
  text-transform: uppercase;  /* no token axis for transform — deliberate literal */
  letter-spacing: 0.1em;      /* nor for tracking */
}
```

Monospace stacks also stay literal (`ui-monospace, SFMono-Regular, "SF Mono",
Menlo, monospace`) — the export carries no mono family token.

### Implementation

```css
h1 {
  font-family: var(--font-family-heading);
  font-size: var(--font-size-heading-1);   /* 48 → 40 → 34 via the token file */
  font-weight: var(--font-weight-heading-bold);
  line-height: var(--line-height-heading);
}
```

Fonts are self-hosted: `assets/css/fonts.css` loads Rethink Sans from
`/assets/fonts/` with absolute paths, safe to import from any page depth. No
Google Fonts request anywhere.

---

## 3. Spacing Scale

The single numbered ladder is retired. The andean layer spaces by **role**:
seven families whose names describe the job, so a reader can tell a card's
padding from a grid gutter without looking at values. The grid is very
important — context decides the family:

| Context | Family | Steps |
|---|---|---|
| Generic margins between blocks | `--space-{x-small…x-large}` | 8 / 12 / 16 / 24 / 40px |
| Container padding (cards, panels, dialogs) | `--space-container-padding-{xxx-small…xxx-large}` | 4–60px |
| Intra-component padding, horizontal | `--space-component-inline-padding-{xxx-small…xxx-large}` | 0–20px |
| Intra-component padding, vertical | `--space-component-stack-padding-{xx-small…x-large}` | 0–10px |
| Icon↔label and tight element gaps | `--space-component-gap-{x-small…large}` | 2 / 4 / 8 / 12px |
| Grid/flex `column-gap` | `--space-column-gap-{xx-small…x-large}` | 4 / 8 / 16 / 20 / 24 / 40px |
| Grid/flex `row-gap`, stacked-list rhythm | `--space-row-gap-{x-small…x-large}` | 8 / 16 / 20 / 24 / 40px |
| Page gutter (`.wrap` horizontal padding) | `--space-page-inline` | 20px |

**Usage examples:**
- Card padding: `var(--space-container-padding-small)`
- Button padding: `var(--space-component-stack-padding-medium) var(--space-component-inline-padding-xx-large)`
- Grid gutters: `gap: var(--space-row-gap-medium) var(--space-column-gap-medium)`
- Section top margin: `var(--space-x-large)`
- Beyond the scale's 60px ceiling, compose it: `calc(var(--space-x-large) * 2)` with a why-comment

`--page-width` (1200px) and `--content-width` (720px) are **layout constants,
not theme tokens** — they live in `main.css`'s own `:root` block. They are
measures of the page and would mean the same thing under any theme.

---

## 4. Color System

> Source of truth is `assets/css/andean.css` — a **hand-authored export**,
> adopted 2026-07-23, scoped to `[data-theme="andean"]` with the dark scheme
> under `[data-theme="andean"][data-colorscheme="dark"]`. Nothing generates it;
> to change a colour, you edit it, and then the gate measures what you did.
>
> The gate is `scripts/build-tokens.js`, which changed jobs with the adoption:
> it no longer writes the palette, it **verifies** it. `npm run tokens:check`
> parses `andean.css`, confirms the light and dark blocks declare the same set
> of `--color-*` names, confirms every value parses as a colour, and
> re-measures contrast across the real foreground/surface pairings in both
> schemes. Floors live in `scripts/tokens.config.json` at the WCAG line (4.5
> body, 3.0 large-or-UI); pairings that measured below the line on adoption
> day are allowlisted in `knownBelowFloor` with their measured values — so the
> gate fails on **regression**, never on history. Netlify still runs the check
> before every deploy.

### Roles, not primitives

There is still no `--gray-*`, `--white` or `--black`. The andean layer exposes
**role-named tokens only** — `--color-text-primary`,
`--color-container-background-primary`, `--color-action-standard`,
`--color-input-border-error`, and so on. Every role has a dark value, declared
in the same file; pick the token whose name describes the job and both schemes
come along for free. A palette nobody references is a trap (§18, 2026-07-21) —
so there isn't one. **Components consume roles. That is still the whole API.**

### Semantic tokens

The tables between the markers below are spliced by the gate's write mode
(`npm run tokens`) and refreshed whenever it runs — do not hand-edit them.

<!-- GENERATED:DOC-SEMANTIC:START -->
| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-page-background-primary` | #FFFFFF | #181C1F | Page background |
| `--color-page-background-secondary` | #F8FAFB | #21262A | Alternate page wash (app canvas, banded sections) |
| `--color-page-background-tertiary` | #F0F4F6 | #2B3135 | Deep-set page regions |
| `--color-container-background-primary` | #FFFFFF | #21262A | Cards, panels, elevated surfaces |
| `--color-container-background-secondary` | #F8FAFB | #2B3135 | Nested surfaces inside cards |
| `--color-container-background-tertiary` | #F0F4F6 | #3C4348 | Tinted blocks, code backgrounds |
| `--color-text-primary` | #21262A | #FFFFFF | Primary text, headlines |
| `--color-text-secondary` | #4C555B | #F0F4F6 | Secondary text, descriptions |
| `--color-text-tertiary` | #727E85 | #D5DEE3 | Overlines, captions, meta |
| `--color-link-text` | #017E89 | #00B3C2 | Links (hover/active/visited have their own tokens) |
| `--color-action-standard` | #017E89 | #00B3C2 | Filled actions — pair with --color-text-complementary |
| `--color-focus-indicator` | #017E89 | #00B3C2 | Focus rings, 2px |
<!-- GENERATED:DOC-SEMANTIC:END -->

**Measured contrast** — worst case across every surface the token renders on:

<!-- GENERATED:DOC-CONTRAST:START -->
| Foreground | Light (worst) | Dark (worst) | Floor |
|---|---|---|---|
| `--color-text-primary` | 12.44:1 | 10.05:1 | 4.5:1 |
| `--color-text-secondary` | 6.88:1 | 9.09:1 | 4.5:1 |
| `--color-text-tertiary` | 3.98:1\* | 9.66:1 | 4.5:1 |
| `--color-link-text` | 4.83:1 | 6.72:1 | 4.5:1 |
| `--color-text-inverse` | 4.83:1 | 5.98:1 | 4.5:1 |
| `--color-text-complementary` (on action-standard) | 5.71:1 | 13.18:1 | 4.5:1 |
| `--color-input-label` | 5.71:1 | 10.70:1 | 4.5:1 |
| `--color-input-placeholder` (on its input) | 1.98:1 | 3.66:1 | — (informational) |

\* ships below the WCAG floor — pinned in `tokens.config.json` `knownBelowFloor`; the gate fails only on further regression.
<!-- GENERATED:DOC-CONTRAST:END -->

These are regression floors enforced by the gate, not observations: the file
was measured on adoption day, the floors were set at the WCAG line, and
anything that measured below it is recorded in `knownBelowFloor` rather than
papered over. Full measurements for every audited pairing live in
`scripts/tokens.audit.json`.

### Color philosophy

**Neutral first, one accent.** Greyscale still carries the reading experience —
the writing is the color. The one accent is the andean teal, and it is spent
only where interaction is promised: links, actions, focus, selection.

**Data color is decoded, never decorative.** Visualisation draws from its own
`--color-data-*` palettes and is only legitimate under a legend or a list that
repeats the same colours (§17). Prose stays neutral.

### Implementation

The theme is **two attributes on `<html>`**, not a media query — it has to be
user-switchable and remembered:

- `data-theme="andean"` — the theme *name*, static, stamped in `base.njk`.
- `data-colorscheme="dark"` — the *scheme*, toggled at runtime.

```css
[data-theme="andean"]                          { --color-text-primary: #21262A; /* … */ }
[data-theme="andean"][data-colorscheme="dark"] { --color-text-primary: #FFFFFF; /* … */ }
```

The toggle flips `document.documentElement.dataset.colorscheme` and writes
`localStorage.theme` — key `'theme'`, value `'dark'`, both unchanged from the
old single-attribute system on purpose, so every visitor's saved preference
survived the migration. The read-back runs as a **blocking inline script in
`<head>`** (see `layouts/base.njk`) so the saved scheme is applied before first
paint — moving it to the end of `<body>` reintroduces a white flash for
dark-mode users.

---

## 5. Layout & Grid

### Container Widths

```css
--page-width: 1200px;      /* Max container for full layouts */
--content-width: 720px;    /* Reading column (place pages, guides) */
--column-narrow: 60ch;     /* Max-width for narrow text blocks */
```

### Padding & Margins

**Desktop (>1200px):**
- Page gutter: var(--space-page-inline)
- Section padding: var(--space-container-padding-x-large) horizontal

**Tablet (641–1200px):**
- Page gutter: var(--space-page-inline)
- Content reflows naturally (the token file's ≤992px block handles type)

**Mobile (≤640px):**
- Page gutter: var(--space-page-inline)
- Stacked layouts
- Full-width sections

### Page Types

#### Homepage
- Full-width sections with natural reflow
- Editorial entries (not cards) for "Places" and "Guides"
- Hero with overline → title → lede
- No cards, no database-style layouts
- Breathing room between sections (`calc(var(--space-x-large) * 2)` margin — past the scale's ceiling, composed on purpose)

#### Place Pages
- Narrow reading column (720px, centered)
- Full editorial prose with first-person voice
- Inline place metadata (cost level, duration, map link)
- Related/nearby places listed as editorial entries, not cards
- Max-width on all prose blocks

#### Guide Pages
- Same narrow reading column (720px)
- Sequential narrative structure
- Inline place references link to place pages
- Section-based table of contents at top (optional)

#### Practical Pages
- Same reading column width, but utilitarian tone
- Scannable lists (text only, no decoration)
- Utilitarian links with arrows
- No personality needed; pure information

### Grid Philosophy

No CSS Grid framework. Responsive behavior comes from:
1. The type tiers stepping down at the token file's 992/480 breakpoints
2. Max-width containers for text (var(--content-width), --column-narrow)
3. Padding adjustments at mobile breakpoint
4. Flexbox for simple one-dimensional layouts

This keeps the code simple and the design focused.

---

## 6. Components

All components are documented with structure, states, and usage guidelines.

> *(stale token names — see §18, 2026-07-23)* The CSS excerpts below predate
> the andean adoption and still show the old `--text`/`--bg`-era vocabulary.
> Structure, class names and usage guidance hold; for the current token per
> role, read §2–§4 — the shipped sheets are the reference for exact rules.

### Header

**.header**
```css
padding: var(--space-3) var(--space-4);
border-bottom: 2px solid var(--text);
display: flex;
justify-content: space-between;
align-items: center;
```

**Site Title** (`.header-title`)
- Uppercase
- Font: Rethink Sans 600, size 16px
- Usage: On all pages, links to homepage
- Example: "ANDEAN ROAD"

**Navigation** (`.header-nav`)
- Horizontal list
- Font: Rethink Sans, 11px, weight 500
- Letter-spacing: 0.04em
- Uppercase, uppercase
- Items: "Home", "Places", "Guides", "Practical", "About"
- Hover: underline animation (150ms)

**Theme Toggle** (`.header-theme-toggle`)
- Character: ◐ (half-moon, U+25D0)
- Font-size: --text-caption (13px)
- Cursor: pointer
- aria-label="Toggle dark mode"
- Click toggles `data-theme="dark"` on `<html>`

### Hero

**.hero**
```css
max-width: var(--content-width);
margin: var(--space-7) auto;
}
```

**Overline** (`.hero-overline`)
- Text-transform: uppercase
- Font: Rethink Sans, 11px, weight 600
- Letter-spacing: 0.1em
- Color: var(--text-3)
- Margin-bottom: var(--space-2)

**Title** (`.hero-title`)
- Font: --text-display
- Max-width: 14ch (prevents awkward breaks)
- Margin-bottom: var(--space-3)

**Lede** (`.hero-lede`)
- Font: Source Serif 4, 18–22px (fluid)
- Color: var(--text-2)
- Line-height: 1.65
- Max-width: var(--content-width)

### Section Header

**.section**
```css
margin-top: var(--space-6);
padding-bottom: var(--space-4);
border-bottom: 1px solid var(--border);
}
```

**Label** (`.section-label`)
- Overline style: 11px, uppercase, tracked 0.1em
- Color: var(--text-3)
- Margin-bottom: var(--space-1)

**Title** (`.section-title`)
- Font: --text-h2
- Margin-bottom: var(--space-2)

**Description** (`.section-description`)
- Font: Source Serif 4, 16–18px fluid
- Color: var(--text-2)
- Max-width: 60ch
- Margin-bottom: var(--space-3)

### Place Entry (Editorial Listing)

**.place-entry**
```css
padding: var(--space-2) var(--space-3);
margin-bottom: var(--space-4);
border-bottom: 1px solid var(--border-subtle);
transition: background 150ms ease;
}

.place-entry:hover {
  background: var(--surface);
}
```

**Overline** (`.place-entry__overline`)
- Place type: "Bar", "Restaurant", "Museum", "Hike", "Neighborhood"
- Font: Rethink Sans, 11px, weight 600
- Color: var(--text-3)
- Uppercase, tracked

**Name** (`.place-entry__name`)
- Font: --text-h3
- Weight: 700
- Margin: var(--space-1) 0

**Description** (`.place-entry__description`)
- Font: Source Serif 4, 16–18px fluid
- Color: var(--text-2)
- Max-width: 60ch
- Margin: var(--space-2) 0
- One-sentence hook: "Why should I care?"

**Metadata** (`.place-entry__meta`)
- Font: Rethink Sans, 13px, weight 400
- Color: var(--text-3)
- Format: "$$–$$$  |  2–3 hrs" (cost_level + duration)
- Margin-top: var(--space-1)

**Link behavior:**
- Entire entry is clickable (wrap in `<a>` or use JS)
- Cursor: pointer on hover

**Usage:** Homepage place listings, region pages

### Guide Entry (Featured Listing)

**.guide-entry**
```css
margin-bottom: var(--space-5);
padding-bottom: var(--space-4);
border-bottom: 1px solid var(--border);
}
```

**Overline** (`.guide-entry__overline`)
- Duration: "4 days", "Full day", "Half day"
- Style: Overline (11px, tracked, uppercase)

**Title** (`.guide-entry__title`)
- Font: --text-h2
- Weight: 800
- Transition: text-decoration 150ms ease
- Hover state: underline animation

**Description** (`.guide-entry__description`)
- Font: Source Serif 4, 16–18px
- Color: var(--text-2)
- Max-width: 50ch

**Link behavior:**
- Entire entry is clickable
- On hover, title underlines

**Usage:** Homepage guides section, guide index pages

### Card (Utility)

**.card** — Use sparingly. Default to editorial entries.

```css
border: 1px solid var(--border);
padding: var(--space-3);
background: var(--surface);
transition: border-color 150ms ease, background 150ms ease;
}

.card:hover {
  border-color: var(--text);
  background: var(--bg);
}
```

**Structure:**
1. Overline (category)
2. Title (--text-h3)
3. Description (source serif, --text-2)
4. Link (if applicable)

**Usage:** Only "You might also like" sections or supporting content. NEVER use for primary place listings.

### Practical Link Row

**.practical-link**
```css
display: flex;
justify-content: space-between;
align-items: center;
padding: var(--space-2) 0;
border-bottom: 1px solid var(--border-subtle);
text-decoration: none;
color: var(--text);
transition: transform 150ms ease;
}

.practical-link:hover {
  transform: translateX(-4px);
}

.practical-link::after {
  content: "→";
  margin-left: var(--space-2);
}
```

**Usage:** Practical pages (visa info, getting around, etc.). Full-width rows with right-aligned arrow.

### Buttons

**.btn**
```css
display: inline-block;
padding: var(--space-1) var(--space-3);
border: 1px solid var(--border);
background: transparent;
color: var(--text);
font-family: var(--font-sans);
font-size: 13px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.05em;
cursor: pointer;
transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
}

.btn:hover {
  border-color: var(--text);
}

.btn:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 2px;
}
```

**Variants:**

`--btn-filled`
```css
background: var(--text);
color: var(--surface);
}

.btn--filled:hover {
  opacity: 0.9;
}
```

`--btn-ghost`
```css
border-color: transparent;
}

.btn--ghost:hover {
  border-color: var(--text);
}
```

**Usage:** CTA buttons, form submissions. Keep text short and action-oriented.

### Tip Callout

**.tip**
```css
padding: var(--space-2) var(--space-3);
border-left: 2px solid var(--text);
background: var(--surface);
margin: var(--space-4) 0;
}

.tip-prefix {
  font-family: var(--font-sans);
  font-weight: 600;
}
```

**Structure:**
```html
<div class="tip">
  <span class="tip-prefix">Pro tip —</span> Your helpful advice here.
</div>
```

**Usage:** Practical advice, insider notes, things to know. One per section maximum.

### Breadcrumbs

**.breadcrumbs**
```css
margin-bottom: var(--space-4);
font-family: var(--font-sans);
font-size: 13px;
color: var(--text-3);
}

.breadcrumbs a {
  color: var(--accent);
  text-decoration: none;
}

.breadcrumbs a:hover {
  text-decoration: underline;
}

.breadcrumbs [aria-current="page"] {
  color: var(--text);
  pointer-events: none;
}

.breadcrumbs li::before {
  content: " / ";
  margin: 0 var(--space-1);
}
```

**Structure:**
```html
<nav aria-label="Breadcrumb">
  <ol class="breadcrumbs">
    <li><a href="/">Home</a></li>
    <li><a href="/guides/">Guides</a></li>
    <li><a href="/guides/atacama/">Atacama</a></li>
    <li><span aria-current="page">3 Days in San Pedro</span></li>
  </ol>
</nav>
```

**Usage:** On all pages except homepage. Always include current page as non-link.

### Tags

**.tag**
```css
display: inline-block;
padding: var(--space-1) var(--space-2);
border: 1px solid var(--border);
background: transparent;
font-family: var(--font-sans);
font-size: 11px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.05em;
color: var(--text);
transition: border-color 150ms ease, color 150ms ease;
}

.tag:hover {
  border-color: var(--text);
}
```

**Usage:** Filter tags on place listings, guide categories. No background color — minimal pill style.

---

## 7. Interaction States

Every interactive element must support these states:

| State | Treatment |
|-------|-----------|
| **Default** | As designed above |
| **Hover** | The family's `-hover` token (`--color-action-standard-hover`, `--color-input-border-primary-hover`, …) |
| **Focus-visible** | 2px solid var(--color-focus-indicator), 2px offset |
| **Active** | The family's `-active` token |
| **Disabled** | opacity: var(--opacity-disabled), pointer-events: none — plus the `-disabled` input colours where they exist |
| **Loading** | Spinner or shimmer (context-dependent) |

### Motion

The single `--transition` is retired. Motion is an explicit **duration/ease
pair**, chosen by what the motion is doing — each verb has its own curve:

| Motion | Pair |
|---|---|
| Colour/opacity hovers, fades | `var(--duration-fade-fast) var(--ease-fade)` |
| Things appearing (dialogs, panels, toasts in) | `var(--duration-appear-*) var(--ease-appear)` |
| Things disappearing | `var(--duration-disappear-*) var(--ease-disappear)` |
| Movement and size changes | `var(--duration-transform-fast) var(--ease-transform)` |

```css
/* Use throughout */
transition: background var(--duration-fade-fast) var(--ease-fade),
            color var(--duration-fade-fast) var(--ease-fade);
```

The `-emphasize` variants (longer, overshooting curves) exist for moments that
should be *felt*; spend them sparingly.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**All transitions must respect prefers-reduced-motion.** Test with `motion=reduce` in browser DevTools.

---

## 8. Responsive Behavior

### Mobile-First Approach

Build mobile layouts first, then enhance for larger screens.

### Breakpoint Logic

**Mobile (≤640px):**
- Page gutter: var(--space-page-inline)
- Typography: display/heading tiers step down inside the token file (its ≤480px block)
- Sections stack vertically
- Full-width images and maps
- Single-column layout

**Tablet (641–1200px):**
- Page gutter: var(--space-page-inline)
- Content reflows naturally (the token file's ≤992px block handles type)
- Two-column layouts where applicable
- No explicit tablet-only type styles — the token breakpoints do the work

**Desktop (>1200px):**
- Page gutter: var(--space-page-inline)
- Max-width containers (var(--page-width): 1200px)
- Two-column layouts with sidebars (future)

### Media Query Strategy

```css
/* Type never needs a media query in a component — andean.css steps
   the display/heading sizes itself at 992px and 480px. */
h1 {
  font-size: var(--font-size-heading-1);
}

/* Only use @media for layout changes */
@media (max-width: 640px) {
  .two-column {
    display: flex;
    flex-direction: column;
  }
}
```

Dark mode is **not** a media query — it is the `data-colorscheme` attribute
(§4). `prefers-color-scheme` is deliberately ignored: the choice belongs to
the reader, and it is remembered.

### Touch Targets

On mobile, ensure all interactive elements are at least 44×44px (WCAG 2.1 AAA).

```css
.btn {
  min-height: 44px;
  min-width: 44px;
}
```

---

## 9. Accessibility

### Structure

- **Skip to Content Link**: Hidden until focused, links to main content
  ```html
  <a href="#main" class="skip-to-content">Skip to content</a>
  ```
- **Semantic HTML**: Use `<header>`, `<nav>`, `<main>`, `<article>`, `<footer>`
- **Headings**: Proper hierarchy (h1 → h2 → h3). Never skip levels.
- **Lists**: Use `<ul>` for unordered, `<ol>` for ordered. Don't use divs.

### ARIA

- **Breadcrumbs**: `<nav aria-label="Breadcrumb">`, `aria-current="page"` on current item
- **Theme Toggle**: `aria-label="Toggle dark mode"`
- **Navigation**: `aria-label="Primary navigation"` on nav element
- **Live Regions**: Use `aria-live="polite"` for search results, filters

### Focus Management

```css
:focus-visible {
  outline: 2px solid var(--color-focus-indicator);
  outline-offset: 2px;
}

/* Visible focus styles on all interactive elements */
a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--color-focus-indicator);
  outline-offset: 2px;
}
```

Focus has its own token — `--color-focus-indicator`, the andean teal in both
schemes — so focus reads as interaction, not as ink that happens to have a box
around it.

**Never** use `outline: none` without a visible focus alternative.

### Color Contrast

All text/background combinations must meet **WCAG AA** (4.5:1 for normal text, 3:1 for large text).

Contrast is enforced by the deploy gate, not by a list in this document:
`npm run tokens:check` re-measures every audited foreground/surface pairing in
both schemes on every build (§4), and the measured values are recorded in
`scripts/tokens.audit.json`.

### Print Stylesheet

```css
@media print {
  header,
  nav,
  footer,
  .theme-toggle {
    display: none;
  }

  a[href]::after {
    content: " (" attr(href) ")";
  }

  body {
    background: white;
    color: black;
  }
}
```

---

## 10. Maps & Directory (shipped — one engine)

The `/map/` page pairs a **directory** with an **interactive map**. Selecting a
place in either surface drives the other. Since 2026-07-21 the page is plain
content (`content/map.md`) riding the same `map-split` layout and shared engine
as every other map page — the earlier self-contained `partials/map.njk`
component (a second, parallel engine) is retired; see the Audit Log.

### Files

| File | Role |
|---|---|
| `assets/js/andean-map.js` | THE engine — every map layout, one implementation. Lazy-loads mapbox-gl near the viewport. |
| `_includes/layouts/map-*.njk` | Six layouts; each emits a `#map-config` JSON block and includes the shared partials. |
| `_includes/partials/map-shell.njk`, `map-embed.njk`, `mapcard.njk` | Canvas + controls + legend; config + sprites + script; the wired place card. |
| `_data/mapbox.js` | Access token (env/local), style URL, dark style, GL JS version. Never hardcode these in templates. |
| `_data/placeIcons.json` | Place `type` → Phosphor icon name. Add a row when you add a type. |
| `assets/css/map-tokens.css`, `map-layouts.css` | Cartography tokens (`--map-*`, `--viz-*`, route) and all map component rules. |

Places come from `collections.places` via the `toFeatures`/`stepFeatures`
filters, so maps stay in sync automatically as content is added. Nothing is
maintained by hand.

### Layout

Layout belongs to the map layouts' own CSS (`.mapsplit`, `.mapstack`, `.story`,
`.route`, `.area`, `.hood` in `map-layouts.css`): panel + sticky map on wide
screens, single column on mobile. The retired `.dirmap` grid and its scoped
Loom token scale left `main.css` with the old component.

### Icons

Place types render as a **Phosphor glyph in a circle**: `.mapcard__icon` in
cards, a 30px `.mk` pin on the map (34px on hover, 38px active — sizes animate
because mapbox-gl owns the marker's `transform`). Both use the `{% icon %}`
shortcode at `fill` weight. Selection inverts the circle.

Unknown types fall back to `_default` (`map-pin`), so a new place type renders
sensibly before anyone updates `placeIcons.json`.

### Interaction contract

- **Card click** → map flies to the place, marker + card go active, popup opens.
- **Marker click** → same, plus the card scrolls into view.
- **Map click (empty)** → clears the selection, camera stays put.
- **Reset** → clears selection and re-fits all places.
- Cards carry a separate **"Read more →"** link. The card body jumps the map;
  only that link navigates. Never make the whole card a link — clicking it would
  navigate away instead of showing the place on the map.

### Popup construction — three non-obvious defaults

`mapboxgl.Popup` needs all three of these, and each fixes a real bug:

| Option | Why |
|---|---|
| `closeOnClick: false` | A marker click bubbles to the map canvas; the default would close the popup in the same tick it opened, so marker clicks appeared to do nothing. Marker handlers also call `stopPropagation()`. |
| `focusAfterOpen: false` | Defaults to **true**. `addTo()` calls `_focusFirstElement()`, pulling keyboard focus out of the directory onto the popup link on every selection — Tab then continued from the map, not the next card. |
| `setDOMContent()`, not `setHTML()` | Popup content is built from author-supplied titles. String concatenation would need manual escaping; `textContent` handles it. |

### Accessibility contract

Selection is otherwise conveyed **only** visually, which fails WCAG 4.1.2. The
component therefore also:

- toggles `aria-pressed` on every `[data-jump]` button,
- announces through a visually hidden `#map-status` (`role="status"`,
  `aria-live="polite"`) — "Showing X on the map." / "Map reset…",
- gives each jump button a short `aria-label` (`Show <title> on the map`).
  Without it the accessible name is the *entire card* — overline, title, full
  subtitle, cost and duration read as one run-on string.
- Markers are 44×44px, meeting the minimum touch target.

`prefers-reduced-motion` is honoured: `jumpTo()` replaces `flyTo()` and
`scrollIntoView` drops to `behavior: "auto"`. Never pass `essential: true` on
the camera animation — that flag exists to *override* the user's preference.

### Failure mode

Missing token, malformed config, GL bundle that never arrives, or an
origin-restricted token (probed directly — mapbox-gl swallows tile 403s): the
engine hides the map shell and stamps `.no-map` on the root so the grid
reflows. The directory stays fully usable — every card's "Read more" is a
plain link that needs no JavaScript. A 404 on the custom style falls back to a
stock Mapbox basemap instead of collapsing.

### Map chrome theming

Map chrome (markers, popups, controls, legend) is keyed to `--map-*` values in
`map-tokens.css`, which follow the **basemap**, not the page: legibility on a
map is relative to the tiles under it. The engine stamps `data-map-theme` on
`<html>` — it tracks the page theme only when a dark basemap is configured
(`mapbox.styleDark`, stock `dark-v11` until a designed twin exists), and the
theme toggle triggers `map.setStyle()` + a route redraw so GL layers re-read
their CSS custom properties.

Two aliases changed with the andean adoption (2026-07-23); the exemption did
not. The categorical ramp `--viz-1..8` now **aliases
`--color-data-category-1..8`** — one source of categorical truth, flipping with
the page scheme, which tracks the basemap in practice because a dark basemap is
always configured. And the `--panel-*` furniture aliases the andean container
tokens, so panels flip with the page like any other surface. The `--map-*`
chrome itself stays literal on the `data-map-theme` axis (values harmonized to
the andean neutrals): legibility on a map is still relative to the tiles under
it.

### Performance

- Place data is **inlined at build time** — no fetch, so no init waterfall.
- mapbox-gl (~230 KB gz) is **lazy-injected** by the engine when the map
  container comes within ~600px of the viewport; readers who never reach the
  map never download it.
- 19 HTML markers is well under the ~100 threshold where symbol layers become
  necessary. Past ~100 places, move to a GeoJSON source + symbol layer.
- One reused `Popup` instance rather than one per interaction.
- `preconnect` to `api.mapbox.com` is emitted on every map layout (the
  `mapPage: true` front-matter flag in base.njk).
- `cooperativeGestures: true` — the map never hijacks page scroll.
- Route layouts detach their `sourcedata`/`idle` draw listeners once the line
  is on the map — those events fire on every tile load forever.

---

## 11. Content Design Rules

These rules ensure the voice and tone remain consistent across all content.

### Places Are Personal Recommendations

Not database entries. Not TripAdvisor. Written in first person:

❌ **Don't:** "This restaurant is known for its ceviches and seafood offerings."
✓ **Do:** "I come here every time I'm in Santiago. The ceviches are unreal, and there's a quiet back patio where you can actually hear yourself think."

### Section Descriptions Set Emotional Context

Before listing places, tell the reader why this section matters:

✓ Example: "The Atacama Desert is not hospitable. It's also one of the most alive places I've ever been. Here's where to stay, what to eat, and how to not get lost."

### Overlines Classify Without Competing

Small, tracked, muted. They label without distraction.

```html
<div class="place-entry">
  <span class="place-entry__overline">Restaurant</span>
  <h3 class="place-entry__name">El Huerto</h3>
  <p class="place-entry__description">…</p>
</div>
```

### The Hook Is the Most Important Line

One sentence that answers: "Why should I care?"

❌ "This is a nice café in Valparaíso."
✓ "The coffee here tastes like someone cared. A lot."

✓ "Street art crawls these walls like vines. You could spend all morning here and feel like a local."

### Metadata Comes Last

Cost level ($$–$$$) + estimated time. Keep it factual.

```html
<p class="place-entry__meta">$$ | 1.5–2 hrs</p>
```

### Practical Pages Are the Exception

Utilitarian tone, scannable structure, no personality required.

Content types:
- Visa information
- Getting around (transit, car rental)
- Language basics
- Safety & health
- Packing lists
- Budget breakdown

These pages use practical links (row format with arrows) instead of editorial entries.

### Cards Are a Last Resort

Default to editorial entries. Only use cards for:
- "You might also like" suggestions
- Related guides
- Tangential supporting content

Never use cards for primary place listings.

---

## 12. Naming Convention

### CSS (Modified BEM)

```css
.block {}                       /* Main component */
.block__element {}              /* Child element */
.block__element--modifier {}    /* Variant */

/* Examples: */
.place-entry {}
.place-entry__overline {}
.place-entry__name {}
.place-entry__description {}
.place-entry__meta {}

.guide-entry {}
.guide-entry__title {}
.guide-entry__overline {}

.card {}
.card--heavy {}                 /* Variant: higher contrast */
.card--featured {}              /* Variant: featured listing */

.btn {}
.btn--filled {}                 /* Variant: solid background */
.btn--ghost {}                  /* Variant: borderless */
.btn--small {}                  /* Variant: reduced size */
```

### Template Files (Nunjucks)

```
_includes/
  layouts/
    base.njk                    /* Root layout */
    post.njk                    /* Place/guide layout */
    list.njk                    /* Listing page layout */
  partials/
    header.njk                  /* Site header */
    nav.njk                     /* Navigation */
    footer.njk                  /* Footer */
    breadcrumbs.njk             /* Breadcrumb nav */
    place-entry.njk             /* Place listing component */
    guide-entry.njk             /* Guide listing component */
    card.njk                    /* Card component */
    button.njk                  /* Button component */
    tip.njk                     /* Tip callout component */
    theme-toggle.njk            /* Dark mode toggle */
```

### Data Files

```
_data/
  site.json                     /* Site-wide metadata */
  regions.json                  /* Region definitions */
  audiences.json                /* Audience profiles */
  tags.json                     /* Content tags/categories */
  places.json                   /* Place directory (generated) */
```

### Directory Structure

```
andean-road/
  _includes/
    layouts/
    partials/
  _data/
  assets/
    css/
      index.css                 /* Main stylesheet */
      theme.css                 /* Dark mode variables */
      components.css            /* Component styles */
      print.css                 /* Print stylesheet */
    fonts/
      rethink-sans.woff2
      source-serif-4.woff2
  content/
    pages/
      index.md                  /* Homepage */
      places/
      guides/
      practical/
  DESIGN-SYSTEM.md              /* This file */
  eleventy.config.js
  package.json
```

---

## 13. Developer Quick Start

### CSS

Tokens are never defined by hand in a component sheet. `main.css` opens with
the import chain — order matters, tokens before consumers:

```css
@import url('fonts.css');             /* self-hosted Rethink Sans */
@import url('andean.css');            /* THE token layer — hand-authored (§4) */
@import url('andean-components.css'); /* the token vocabulary, implemented */
@import url('map-tokens.css');        /* cartography axis — basemap-keyed (§10) */
@import url('map-layouts.css');       /* map page furniture */
```

Layout constants that are measures rather than theme (`--page-width`,
`--content-width`) live in `main.css`'s own `:root` block, with a comment
saying why they are not tokens.

No Google Fonts. `assets/css/fonts.css` loads Rethink Sans from
`/assets/fonts/` with absolute paths, so it is safe to import from any page
depth — the Atelier shells use the same file.

### Theme wiring

`layouts/base.njk` is canonical — there is no separate `theme.js`. The shape:

```html
<html lang="en" data-theme="andean">   <!-- static theme name, never toggled -->
<head>
  <script>
    /* blocking, before first paint: restore the saved scheme */
    const t = localStorage.getItem('theme');
    if (t === 'dark') document.documentElement.dataset.colorscheme = 'dark';
  </script>
  <link rel="stylesheet" href="/assets/css/main.css">
</head>
```

The global `toggleTheme()` (declared in `base.njk`, invoked from the header's
`onclick`) flips `dataset.colorscheme`, writes `localStorage.theme`, and
dispatches the `themechange` CustomEvent the map engine listens for. The
localStorage key is `'theme'` and the dark value is `'dark'` — unchanged from
the old system, deliberately, so returning visitors keep their preference.

### Rules of consumption

- UI chrome consumes andean tokens only: `--color-*`, `--font-*`, `--space-*`,
  `--radius-*`, `--elevation-*`, `--duration-*`/`--ease-*`. A raw hex in
  chrome is a bug.
- Elevation tokens carry no colour — always pair them:
  `box-shadow: var(--elevation-level-2) var(--color-shadow)`.
- The exceptions: map chrome on the `data-map-theme` axis (§10), data/content
  palettes that *are* the thing displayed, the print block, and alpha
  hairlines over user-picked colours (§18, 2026-07-23).

No framework required. No build tool unless you need PostCSS.

---

## 14. Testing & QA

### Accessibility Audit

Run **WAVE**, **Axe DevTools**, or **Lighthouse**:
- ✓ No contrast failures
- ✓ All interactive elements keyboard-accessible
- ✓ Proper heading hierarchy
- ✓ Image alt text (where needed)
- ✓ ARIA labels on custom components

### Responsive Testing

Test at:
- 320px (mobile edge case)
- 640px (mobile/tablet breakpoint)
- 1024px (tablet)
- 1440px (desktop)
- 2560px (ultra-wide)

Verify:
- ✓ No horizontal scroll
- ✓ Text remains readable
- ✓ Images scale properly
- ✓ Touch targets are ≥44px

### Color Contrast

Use a contrast checker (WebAIM, Contrast Ratio):
- ✓ All text combinations ≥ WCAG AA (4.5:1)
- ✓ Both light and dark mode tested
- ✓ Buttons and links clearly identifiable

### Browser Support

Support:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Android)

Do NOT support:
- IE 11 (CSS custom properties not supported)

### Performance

- ✓ Lighthouse Performance > 90
- ✓ Font files optimized (woff2, ~30KB total)
- ✓ No unused CSS (critical CSS inline, rest deferred)
- ✓ Images lazy-loaded

---

## 15. Future Considerations

### Typography Expansion

- **Headers:** Consider a display serif (e.g., Playfair Display) for special sections
- **Code blocks:** Monospace for code snippets (if needed)
- **Numbers:** Tabular figures for price/duration data

### Color Introduction

Planned phases:
1. **Phase 1 (v1.1):** Map pins only (one accent color)
2. **Phase 2 (v1.2):** Audience segment tints (very light, 10–15% opacity)
3. **Phase 3 (v2.0):** Interactive data visualizations (limited palette, 4 colors max)

### Layout Expansion

- **Sidebar (future):** Two-column layout on desktop with related links
- **Map views (planned):** Toggle between list and map at section level
- **Photo gallery (pending):** Minimal image grid for place galleries

### Interaction Enhancements

- **Search (planned):** Command palette (`Cmd+K`) for place/guide search
- **Filters (exploring):** "Show me guides for X region" or "Show me free things"
- **Comments (maybe):** Readers leave tips/updates on places

---

## 16. Maintenance & Updates

### Version Control

Tag major design updates:
- v1.0: Initial launch
- v1.1: Map views
- v2.0: Color introduction + interactive features

### CSS Audit Schedule

Every 6 months:
- [ ] Run Lighthouse audit (performance, accessibility)
- [ ] Check for unused CSS
- [ ] Verify color contrast again (especially if colors are added)
- [ ] Test on new device sizes/browsers

### Content Style Guide

Maintain a living style guide:
- Voice examples (what to write, what not to write)
- Metadata format (cost levels, durations, categories)
- Photo guidelines (if adding images)
- Update frequency (how often places are revisited)

---

## 17. Page Templates

Six layouts you can point a markdown file at. Live index: **/templates/** — each
page there documents its own front matter.

| Layout | For | Structured front matter |
|---|---|---|
| `layouts/article.njk` | Long-form editorial | `byline`, `updated`, `further_reading[]` |
| `layouts/itinerary.njk` | Numbered days or steps | `steps[]` — `{overline, title, body, place}` |
| `layouts/faq.njk` | Questions and answers | `faqs[]` — `{q, a}` (emits `FAQPage` JSON-LD) |
| `layouts/reference.njk` | Lookup tables of facts | `rows[]` — `{label, value, note}` |
| `layouts/gallery.njk` | Image-led pages | `figures[]` — `{src, alt, caption}` |
| `layouts/simple.njk` | About, colophon, legal | none |
| `layouts/manual.njk` | Documentation, handbook, textbook | `toc` (default on), `prev`/`next` — `{label, url}` |

Only `layout` and `title` are ever required. Every other field is optional and
its markup disappears when omitted — so a half-filled page never renders an empty
heading or a stray rule.

### How each type differs

The skeleton and tokens are shared; the treatment below the masthead is not.
Each `<article>` carries a `tpl tpl--<name>` class that scopes its variant CSS.

| Type | Shape |
|---|---|
| Article | Lead-in first paragraph at a larger size; wider paragraph rhythm |
| Itinerary | A summary strip, then numbered stops on one continuous rail |
| FAQ | Native `<details>` accordion with `+`/`−` affordance — no JavaScript |
| Reference | Two-column grid, label against value, collapsing to one column under 560px |
| Gallery | First figure runs full width at 21:9; the rest tile and reflow |
| Simple | Centred column capped at 62ch, centred masthead |
| Manual | Sticky contents rail built from the headings, linkable headings, prev/next |

**Manual vs Article vs Reference** — the distinction is use, not length. An
article is read once and has a byline. A reference is a lookup table of short
facts. A manual is *navigated*: the reader arrives looking for one section inside
a long document, links to it, and returns weeks later.

The contents rail is generated by a `toc` filter that parses the already-rendered
HTML for `h2`/`h3` ids — no plugin, no front matter. It appears only when a page
has more than two headings. `h4` still gets an anchor but stays out of the rail.

Three implementation notes worth keeping:

- **`markdown-it-anchor` had been a dependency for months without being wired
  up** — no `setLibrary` call, so no heading anywhere on the site had an `id`.
  It is now configured with a diacritic-stripping slugify, so *Pucón* yields
  `#pucon` rather than percent-encoding.
- The `toc` filter must strip the permalink anchor element before stripping
  tags, or every contents entry ends with a stray `#`.
- **There were no `pre`/`code` styles at all.** Code blocks overflowed their
  column into the contents rail. `.prose pre` now scrolls internally.

- The itinerary rail is drawn **once on the list**, not per step, or it breaks at
  every row border. Its counter needs `align-self: start` — as a grid item the
  counter otherwise stretches to the full row height and its background masks
  the rail behind it.
- `.reference-item__annotation` was written for a single-line flex row
  (`white-space: nowrap`). The table variant must reset that, or long notes run
  off the page edge.

### The shared skeleton

Every layout is the same five moves:

```
breadcrumbs (if crumbs)  →  partials/page-header.njk
   →  .prose content-column (the markdown)  →  optional structured block
```

The masthead already carries a bottom border — do not add an `<hr class="rule">`
after it or the page shows a double rule.

`partials/page-header.njk` is the single masthead — overline, title, standfirst,
and a `.meta-line` for byline/date. **Do not hand-roll a header in a new layout**;
extend the partial instead, or the six pages drift apart.

### Structural CSS

Added in the "Page templates" section of `main.css`, deliberately thin — structure
and rhythm only, so the writing carries the page:

`.subhead` · `.section-block` · `.steps` / `.step` · `.figure` / `.figure-grid` ·
`.callout` · `.note-line` · `.tag-row` / `.btn-row`

The masthead's meta row uses the block's own `.page-header__meta` — there is no
separate `.meta-line`.

Reused rather than reinvented: `.prose`, `.glossary` (FAQ), `.reference-list`
(reference), `.placeholder-img` (gallery), `.guide-entry` (the index).

### Adding a seventh

1. Add `_includes/layouts/<name>.njk` following the skeleton above.
2. Add `content/templates/<name>.md` documenting its front matter — the index at
   `/templates/` picks it up automatically from `collections.templates`, ordered
   by the `order` field.
3. Add CSS only if an existing component genuinely does not fit.


### Map layouts

Six more layouts put a map on the page. They share one engine
(`assets/js/andean-map.js`, modes `pins` | `route` | `story`) and one set of
cartographic tokens, so a reader moving between them reads the same map language.

| Layout | Answers | Cartographic move |
|---|---|---|
| `map-split` | What's here — let me compare | Full-bleed map + independently scrolling list, both viewport-height |
| `map-stack` | Where is this — now let me read | Map as establishing shot, cards and prose below |
| `map-story` | Tell me a story about this land | Sticky map; IntersectionObserver flies the camera per step |
| `map-route` | How does this trip go | Ordered line, numbered markers paired to a numbered itinerary |
| `map-neighborhood` | What should I do next | Close zoom, hue = category, legend + colour-matched grouped list |
| `map-area` | Which part of the country | Regional overview, colour as a through-line pin → legend → band → card |

Map pages set `fullBleed: true`, which drops `.wrap` from `<main>`; they wrap
their own text sections.

### Cartographic tokens

`assets/css/map-tokens.css` is **additive** — it introduces no name that already
exists, so the rest of the site is unaffected. It holds the Andean brand hues, a
`--viz-1..8` categorical ramp, `--seq-1..5` sequential (for choropleth), the
`--route-*` set, `--map-*` chrome and `--panel-*` furniture.

**The colour rule for maps:** greyscale carries the page, hue carries the data.
Colour on a map is only legitimate when something decodes it — a legend, or a
list that repeats the same colours. `map-split` and `map-stack` deliberately use
one neutral pin hue because they have no legend; colouring by region there would
assert a variable the reader has no key for.

### Cartography gotchas, learned the hard way

- **mapbox-gl overwrites the marker element.** It writes an inline `transform`
  for positioning — which beats any `transform` in the stylesheet, so marker
  hover/active states must animate something else (width/height, or an inner
  element). It also stamps `role="img"` over your `<button>`; restore the role
  after `.addTo(map)` or every marker announces as an image.
- **Straight lines between stops are not a route.** Drawing point-to-point
  segments at road weight asserts a road that isn't there. Until real Directions
  geometry is fetched, the line is dashed and reads as stop order.
- **Popup class names collided — resolved 2026-07-21.** `.map-popup` once
  belonged to the legacy `.dirmap` component while the engine used `.mappopup`.
  The legacy component is deleted; the one popup is `.map-popup`, styled in
  `map-layouts.css` only.
- **Colour on a light basemap needs checking at the glyph, not the swatch.**
  Inca gold `#EFB42A` is a beautiful brand colour and 1.9:1 on white — unusable
  as a marker glyph. `--viz-3` is a darkened gold for that reason.
- `--header-h` must match the real header or the viewport-height layouts overrun.

---

## 18. Audit Log

**2026-07-21 — structural cleanup**

- `.place-header*` → `.page-header*`. It was never place-specific: guides and
  practical pages used it too (18 occurrences renamed).
- All layouts moved into `_includes/layouts/`; every `layout:` reference updated.
  `_includes/` now holds only `layouts/` and `partials/`.
- Six copy-pasted inline-styled `<h3>` elements replaced with `.subhead`, and the
  remaining inline styles in `place.njk` promoted to `.note-line`, `.tag-row` and
  `.btn-row`. One inline style survives, on the gallery `<img>` sizing.
- `guide`, `place` and `practical` were hand-rolling their own
  `<header class="page-header">`. All three now use `partials/page-header.njk`,
  which grew an optional `meta` array to carry the place page's richer meta row.
- **Dark-mode bug fixed:** `.hero-overline` and `.hero-lede` were set to
  `var(--gray-900)` — a raw primitive that does not flip — which is the exact
  colour of the dark background. Both were invisible in dark mode on every page.
  Now `--text-3` / `--text-2`.

**Rule this produced:** never use a `--gray-*`, `--white` or `--black` primitive
for `color` or `background` in a component. Primitives do not flip; only the
semantic tokens (`--text`, `--text-2`, `--text-3`, `--bg`, `--surface`,
`--border`) have dark-mode values. The exception is map chrome, which is pinned
to primitives on purpose (§10).

**2026-07-21 — audit pass (52-agent review, 18 confirmed findings)**

Build-breaking and correctness:

- **`updated: "2026-07-21"` crashed the whole build.** YAML hands an unquoted
  date to Nunjucks as a `Date` but a quoted one as a `String`, and `dateFormat`
  called `.toLocaleDateString` on it directly. Both date filters now coerce and
  guard against `NaN`.
- **The visible date was a day earlier than its own `datetime` attribute.** YAML
  parses a bare date as UTC midnight; formatting that in a negative-offset locale
  rolls back a day. `dateFormat` now passes `timeZone: 'UTC'`.
- **JSON-LD could be terminated early.** `| dump` escapes quotes but not `</`, so
  a `</` inside any question, answer, title or subtitle would close the
  `<script>` tag. Both `faq.njk` and `place.njk` now also escape it. `place.njk`
  was additionally interpolating raw strings straight into JSON — now `| dump`.
- **New pages published to `/content/<slug>/`.** Added
  `content/content.11tydata.js` defaulting `permalink` to `/{{ page.fileSlug }}/`.

Semantics:

- `.steps` gained `role="list"` (Safari drops list semantics under
  `list-style: none`) and `.step__title` is an `<h2>`, not a `<div>`.
- Every `.subhead` promoted from `h3` to `h2` — these blocks are siblings of the
  prose column, not children of its last section, so there was no `h2` above them.
- The templates index had no heading between its `h1` and the footer.

Dead code removed: `.view-toggle` (never used), `.lede` (superseded by
`.page-header__subtitle`), `.meta-line` (duplicated `.page-header__meta`).

**2026-07-21 — map layouts (67-agent critique, high-severity fixes)**

- `.map-popup` was defined in both `main.css` (for `.dirmap`) and
  `map-layouts.css`; the older rules won and new popups rendered with no
  background. The engine now uses `.mappopup`.
- Marker hover/active scaling never applied — mapbox-gl's inline positioning
  `transform` overrides the stylesheet. Markers now resize instead.
- mapbox-gl replaced each marker's `role="button"` with `role="img"`; restored
  after `.addTo()`.
- `--cat` was set on the card's icon but read by `.is-active` rules on the card,
  so the selected-state colour silently fell back. `data-cat` moved up.
- `--viz-3` (Inca gold) measured **1.87:1** as a glyph on white and the route
  stop numbers **4.0:1**; both darkened to clear AA.
- Story cards were dimmed to `opacity: .55` in CSS and un-dimmed by JS, so a
  no-JS reader got permanently faded prose. Dimming is now opt-in via `.js-story`.
- `--header-h` was referenced by the viewport-height layouts but never declared.

**Not fixed — needs Mapbox Studio:** the style carries no settlement, place or
road labels. Every map layout is downstream of that.

**Known, accepted:** *(superseded — see the entry below)*

**2026-07-21 — colour layer generated, dead tokens removed**

The three "known, accepted" items above are all resolved or void:

- **The unreferenced tokens are gone.** 34 declared-but-never-consumed tokens were
  deleted: the entire `--gray-*`/`--white`/`--black` primitive set, `--accent`,
  `--rule`, `--radius`, `--shadow-hover`, `--transition-slow`, `--space-8`, five
  unused type-metric tokens, and from `map-tokens.css` the seven unreferenced
  `--brand-*` hues and the whole `--seq-1..5` sequential ramp. "Kept as system API"
  had become cover for dead weight; the ramp that matters is still solved inside
  the generator and recorded in `scripts/tokens.audit.json`. Nothing is undefined
  afterwards — verified by scanning every `var()` in the CSS, templates and JS.
- **`--gray-200`/`--gray-300` colliding is void** — neither token exists now.
- **The thin contrast margin is fixed, and was worse than recorded.** The 4.63:1
  and 4.54:1 figures were measured against `--bg` only. The same text also renders
  on `--accent-soft`, where it measured **4.32:1 and 4.24:1** — failing AA on every
  hover row. Worst case across all surfaces is now 4.58:1 light / 4.55:1 dark, and
  the floor is enforced by `npm run tokens:check` rather than by a note in a doc.

**Rule this produced:** a token that nothing references is not an API, it is a
trap — someone eventually uses it, and in this codebase the one primitive anybody
did use (`--gray-100`) was broken in dark mode the whole time.

**2026-07-21 — one map engine, discoverable by machines, searchable by humans**

- **The second map engine is gone.** `/map/` is now `content/map.md` on the
  `map-split` layout; `partials/map.njk` (250 lines: own markers, popups,
  list-sync, hardcoded token) deleted, along with ~400 lines of `.dirmap`/
  `--dm-*`/`.map-marker`/legacy-popup CSS in `main.css`. One engine, one popup
  class (`.map-popup`), one marker component (`.mk`).
- **The engine lazy-loads mapbox-gl** (IntersectionObserver, ~600px early),
  switches to a dark basemap with the page theme (`data-map-theme` drives
  `--map-*` chrome), falls back to a stock style on a 404, and detaches route
  draw listeners once drawn.
- **Nine thin prose layouts collapsed** into one `page.njk` implementation
  behind alias layouts, so section drift can't recur; `place.njk` gained Key
  facts, Nearby (build-time haversine) and full TouristAttraction schema.
- **Machine surface added:** templated `/llms.txt`, `/api/places.json`,
  `/api/guides.json`, `/api/search.json`, `/feed.xml`, BreadcrumbList +
  Article/WebSite/Person JSON-LD, fixed og:image (existence-checked), sitemap
  on `updated`. Internal docs and starters no longer publish.
- **Site search shipped** — dependency-free palette dialog (`/` or ⌘K) over the
  build-time index, facet synonyms, context boost from the page being read.
- **`color-engine.js` trimmed 900 → 431 lines** to the ramp+contrast core the
  token build actually calls; the full generative system lives at dca0227.

---

**2026-07-22 — the pivot spine: the Atelier leads, Learn and Tools get front doors**

- **The nav now says "map editor."** Header is Create · Learn · Tools · Places
  plus one filled CTA to the editor, reusing `.btn--filled` rather than a new
  component; Templates demoted to the footer. The nav-collapse breakpoint moved
  560px → 860px, where the wordmark actually starts wrapping.
- **`landing.njk` added** — the conversion shape (hero → demo → capabilities →
  examples → forgiveness → repeated CTA), every block optional and front-matter
  driven, page body as the demo slot. `/atelier/` is its first consumer;
  segment landings reuse it unchanged.
- **The editor moved to `/atelier/editor/`** and lost the wedding voice: three
  retitled pages, a neutral first-run example, and a neutral attribution badge
  on every published map. Untouched by design — the `hv:` localStorage keys,
  the guest/preview filenames every published share link resolves against, the
  share payload schema, and the persisted `rings`/`church` icon ids.
- **Two build bugs fixed that predate the pivot.** Passthrough copy does *not*
  stop Eleventy template-processing an app's HTML: every build was emitting
  asset-less duplicate pages at `/tools-apps/…` and advertising all four in the
  sitemap (`ignores.add('tools-apps/**')`). And the Atelier's gitignored
  `config.js` — imported by ten modules — was simply absent on Netlify, so the
  editor rendered an empty shell on every deploy; it is now generated at build
  time from the token `_data/mapbox.js` already resolves.
- **Learn and Tools got structure:** `content/learn/{editor,cartography,notes}/`
  with directory data owning permalink, layout, breadcrumbs and the
  `section`/`track` pair; four new starters and `new.js` kinds; per-track
  collections; hubs at `/learn/` and `/tools/` whose sections render only when
  they have content. `section`/`track` are wayfinding structure, deliberately
  *not* added to `taxonomy.yml`.
- **Four tool pages went indexable** with SoftwareApplication JSON-LD and a
  next step below the fold; Color Scales needed a visible lede first, since its
  entire explanation lived inside a modal. Spatial Autocorrelation and
  Destination Weddings stay `noindex` pending placement decisions.

---

**2026-07-22 — Places becomes a map section; two template maps become real content**

- **Two engine additions, both small.** `pins` mode now honours an explicit
  `center`/`zoom` — it was in `andean-map.js`'s documented contract from the
  start and never read, and without it a one-marker map fits bounds to a
  degenerate box that mapbox-gl resolves to maxZoom. And `[data-map-filter]`
  chips hide markers and cards together, then re-fit the camera to what
  survives.
- **Every place page carries a contextual map** — the place as a dark `anchor`
  pin with its computed neighbours around it, sharing one feature set with the
  Nearby cards, which gained the `data-feature`/`data-goto` contract the engine
  already bound to. No new sync code.
- **`/map/` is the directory, not a utility page.** Region filter chips, an
  editorial body, and `/map/#<slug>` deep links so a place page can point at its
  own pin. Selecting writes the hash back via `replaceState`.
- **Region pages became area maps** on the `lat`/`lng`/`zoom` that
  `_data/regions.json` had carried unread since it was written.
- **`/templates/map-route/`**: opener moved above the map (new optional
  `standfirst`); the badge overlay deleted, since it repeated the title and trip
  totals within one screen. `.route__head` and `.route__badge*` removed.
- **`/templates/map-story/`** is now the Andean Road System in seven chapters,
  ending at the Maipo river — the road's real southern limit, in the valley this
  guide covers. Chapters can carry one sourced figure (`stat`). Every number
  checked against UNESCO rather than inherited from the draft, which contained a
  reversed comparison to the Earth's circumference.
- **Two verification traps worth remembering.** `npm start` does not reload
  `.eleventy.js`, so a new filter leaves the dev server broken while it serves
  the last good build — the browser looks fine and is lying. And scrollytelling
  cannot be checked on a fixed delay: IO is async and `flyTo` runs 1600 ms, so a
  probe lands in the gap and reports the previous chapter's camera.

---

**2026-07-23 — one token language: adopt andean.css, retire the generated palette**

- **`assets/css/andean.css` is the source of truth now** — a hand-authored
  design export carrying the full vocabulary: colour roles, five type tiers,
  seven spacing families, radius, elevation, motion, opacity. The generated
  `assets/css/tokens.css` and its config-driven greyscale are deleted; every
  sheet, template and JS template-string consumes andean roles directly.
- **The export shipped with its responsive type dead.** It emitted the desktop
  font-size block *after* its max-width media queries — same selector, same
  specificity, later in source, so every breakpoint override lost — and 480px
  before 992px, so the tablet block won at phone widths. The adopted file
  reorders the cascade base → 992 → 480; the values themselves are verbatim
  from the export.
- **The theme attribute split in two.** `data-theme="andean"` is the static
  theme name; the scheme moved to `data-colorscheme="dark"` on the same
  element. The localStorage key (`'theme'`) and value (`'dark'`) are unchanged
  on purpose — every visitor's saved preference survives — and the
  `themechange` event contract with the map engine is untouched.
- **The Atelier gained live dark mode.** Its old tokens file carried dormant
  `[data-theme="dark"]` blocks that nothing could ever activate; they died with
  the file. All three shells now stamp `data-theme="andean"` and bootstrap
  `data-colorscheme` from the same `'theme'` key as the site, so the editor
  flips for real, for the first time.
- **`scripts/build-tokens.js` changed jobs: generator → gate.** It no longer
  writes CSS. It verifies the light and dark blocks declare the same
  `--color-*` set, that every value parses as a colour, and that contrast over
  the real foreground/surface pairings has not regressed — floors sit at the
  WCAG line in `tokens.config.json`, and pairings that measured below it on
  adoption day live in a `knownBelowFloor` allowlist with their measured
  values, so the gate fails on regression, never on day one. The Netlify
  command is unchanged.
- **Ink inversion became an action idiom.** `background: var(--text);
  color: var(--bg)` was never about text — filled buttons, the skip link,
  selected tabs and toasts were actions or inverse surfaces in disguise.
  Actions now take an `--color-action-*` family with
  `--color-text-complementary`; non-action inverse chips take
  `--color-container-background-inverse` + `--color-text-inverse`. Mapping
  that idiom mechanically would have painted buttons as paragraphs.
- **Sanctioned redesign deltas, not drift:** links and actions go teal; radius
  and elevation enter the language (§1); the 600/700/800 weight ladder
  converges on 400/500; type sizes map by semantic level, with `clamp()`
  retired for the token file's 992/480 breakpoints; and error/warning states
  gain hue (`--color-input-*-error`, `--color-action-negative*`) where the old
  system could only darken. Each was chosen, none inherited by accident.
- **Exemptions retained:** map chrome stays literal on the basemap-keyed
  `data-map-theme` axis (values harmonized to the andean neutrals, §10);
  content/data palettes — the Pantone blob, ColorBrewer ramps, loom threads,
  svg-editor artwork — are the data being displayed, not styling; the print
  block keeps literal white/black; and alpha hairlines over user-picked
  colours stay colour-agnostic by design.

**Rule this produced:** UI chrome consumes andean tokens only — `--color-*`,
`--font-*`, `--space-*`, `--radius-*`, `--elevation-*`,
`--duration-*`/`--ease-*` — and a raw hex in chrome is a bug, not a shortcut.
Pick the token whose *name describes the role* and both schemes come along for
free. The exceptions are the basemap-keyed map chrome and palettes that are
themselves the content.

---

## Summary

The Andean Road design system is **type-first, editorial, and restrained**. It reflects the voice of a bilingual friend sharing personal recommendations, not a travel database. Every design choice — from the restrained palette to the tokenized geometry to one family doing five jobs — serves clarity and the reading experience.

This system is built for growth: maps, color, and interactive features are planned and structured to layer on top without breaking what works today.

**The grid is the skeleton. Type is the voice. Everything else serves the prose.**

---

**Document Version:** 2.0 — andean token adoption
**Last Updated:** July 23, 2026
**Maintained By:** Design System Owner
**Status:** Complete & ready for implementation
