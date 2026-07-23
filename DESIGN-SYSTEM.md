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
Greyscale by default. Color is reserved for future moments: audience segment tints, map pins, interactive data visualizations. When color appears, it should feel like a single accent on a black-and-white photograph.

### Sharp Geometry
No border-radius. Horizontal rules and clean rectangles as structural elements. The aesthetic is editorial/architectural, not playful. Vignelli would not round corners here.

### Content-First
The writing IS the design. Everything else serves the prose. Strip away decoration. A well-written description of a place needs no badge or badge color.

### Dual-Mode Reading
Design for both map and list views. Both should feel native, not like one is a retrofit. Offline-capable — static maps and downloadable guides.

---

## 2. Typography System

> Source of truth is the Andean token set in `assets/css/tokens.css`, carried
> **verbatim** from the canonical Andean export (see §4). All type is Rethink
> Sans (self-hosted, variable weight). Sizes come from the `--font-size-*`
> tokens — no clamp() scale.

### Type roles

| Role | Tokens | Usage |
|-------|--------|-------|
| **Display** | `--font-size-display-1..4`, `--font-weight-display`, `--line-height-display` | Homepage title, hero statements (site uses display-2) |
| **Headings** | `--font-size-heading-1..6`, `--font-weight-heading`, `--line-height-heading` | Page titles → subsection titles |
| **Body** | `--font-size-body-1..4`, `--font-weight-body`, `--line-height-body` | Ledes (body-1), prose (body-2), secondary text (body-3), captions (body-4) |
| **Component** | `--font-size-component-*`, `--font-weight-component[-bold]`, `--line-height-component` | UI chrome: nav, overlines, tags, meta rows |
| **Action** | `--font-size-action-*` | Buttons |

Font families: `--font-family-display`, `--font-family-heading`,
`--font-family-body`, `--font-family-component` (all Rethink Sans).
Bold emphasis uses the `*-bold` weight tokens. Overlines are
`--font-size-component-x-small` + `--font-weight-component-bold`, uppercase,
0.1em tracked (tracking has no token; it stays literal).

---

## 3. Spacing Scale

The Andean spacing tokens replace the old numeric `--space-0..8` scale:

```css
--space-x-small: 8px;    /* element gaps, small padding   (was --space-1) */
--space-small: 12px;
--space-medium: 16px;    /* component padding             (was --space-2) */
--space-large: 24px;     /* section internals             (was --space-3) */
--space-x-large: 40px;   /* section dividers              (was --space-5) */
```

Plus the purpose-specific sets: `--space-component-gap-*` (2–12px, micro
spacing), `--space-component-inline-padding-*`, `--space-component-stack-padding-*`,
`--space-container-padding-*` (4–60px, e.g. `-x-large: 32px`,
`-xxx-large: 60px` for major section breaks), `--space-column-gap-*`,
`--space-row-gap-*`, and `--space-page-inline`.

---

## 4. Color System

> Source of truth is `assets/css/tokens.css`, which carries the **canonical
> Andean token export verbatim**: `[data-theme="andean"]` holds the light
> values and `[data-theme="andean"][data-colorscheme="dark"]` the dark ones.
> The export is never hand-edited or regenerated in this repo — when a new
> export is issued, replace the token blocks wholesale. If this section
> disagrees with the CSS, the CSS wins.

**Using tokens:** components reference Andean tokens only — never invent a
custom property, never hardcode a color. The full set is present, so tokens
the site doesn't use yet (inputs, code, messages, status UI…) are available
API for future components. The only non-token variables allowed are ones that
*carry* token values or structural constants: `--cat` (category → data-color
indirection) and `--header-h` (real header height for viewport layouts).

### Token families

Every color token flips automatically in dark mode:

| Family | Examples | Usage |
|---|---|---|
| `--color-text-*` | `-primary`, `-secondary`, `-tertiary`, `-accent`, `-inverse`, `-complementary`, `-disabled` | Text |
| `--color-page-background-*` | `-primary`, `-secondary`, `-tertiary`, `-accent` | Page backgrounds |
| `--color-container-background-*` | `-primary`, `-secondary`, `-tertiary`, plus status tints | Cards, surfaces, callouts |
| `--color-container-border-*` | `-primary`, `-secondary`, `-tertiary`, plus status borders | Borders |
| `--color-divider-*` | `-primary`, `-secondary`, `-tertiary` | Rules and separators |
| `--color-action-*` | `standard`, `complementary`, `passive`, `negative` + `-hover/-focus/-active/-subtle` | Buttons and controls |
| `--color-link-*` | `text`, `text-hover`, `text-visited`, `background` | Links |
| `--color-data-*` | `primary/secondary/tertiary` ramps, `category-1..10`, `positive/negative/attention/neutral` | Maps and data viz |
| `--color-icon-*`, `--color-input-*`, `--color-ui-*` | — | Icons, form controls, status |
| `--color-focus-indicator`, `--color-selection-indicator`, `--color-shadow`, `--color-overlay` | — | Focus rings, selection, elevation |

Elevation pairs `--elevation-level-0..4` with `--color-shadow`
(`box-shadow: var(--elevation-level-1) var(--color-shadow)`); motion pairs
`--duration-*` with `--ease-*` (default UI transition:
`var(--duration-fade-fast) var(--ease-fade)`). Radii come from `--radius-*`
(`-none` to `-full`, `-action` for buttons).

### Color philosophy

Greyscale still carries the editorial voice; the Andean accent (teal
`--color-action-standard` / `--color-link-text`) is reserved for interactive
elements — links, buttons, focus — and the `--color-data-*` ramps for maps and
data. No decorative color in prose.

### Implementation

The theme is **attributes on `<html>`**: `data-theme="andean"` is set in the
markup; light/dark is `data-colorscheme`, user-switchable and remembered.

```css
[data-theme="andean"]                           { --color-text-primary: #21262A; /* … */ }
[data-theme="andean"][data-colorscheme="dark"]  { --color-text-primary: #FFFFFF; /* … */ }
```

The toggle writes `localStorage.theme` and sets
`document.documentElement.dataset.colorscheme`. The read-back runs as a
**blocking inline script in `<head>`** (see `layouts/base.njk`) so the saved
scheme is applied before first paint — moving it to the end of `<body>`
reintroduces a white flash for dark-mode users.

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
- Page horizontal padding: 32px
- Section padding: var(--space-4) horizontal

**Tablet (641–1200px):**
- Page horizontal padding: 32px
- Content reflows naturally via fluid type (no explicit breakpoint)

**Mobile (≤640px):**
- Page horizontal padding: 16px
- Stacked layouts
- Full-width sections

### Page Types

#### Homepage
- Full-width sections with natural reflow
- Editorial entries (not cards) for "Places" and "Guides"
- Hero with overline → title → lede
- No cards, no database-style layouts
- Breathing room between sections (var(--space-7) margin)

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
1. Fluid typography (clamp) scaling naturally with viewport
2. Max-width containers for text (var(--content-width), --column-narrow)
3. Padding adjustments at mobile breakpoint
4. Flexbox for simple one-dimensional layouts

This keeps the code simple and the design focused.

---

## 6. Components

All components are documented with structure, states, and usage guidelines.

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
| **Hover** | Documented per component (underline, background shift, border darken) |
| **Focus-visible** | 2px solid var(--text), 2px offset |
| **Active** | Slight color/opacity change (opacity 0.85) |
| **Disabled** | opacity 0.5, pointer-events: none |
| **Loading** | Spinner or shimmer (context-dependent) |

### Transitions

```css
--transition: 150ms ease;        /* Default: buttons, hovers, borders */
--transition-slow: 300ms ease;   /* Slower: layout shifts, visibility */

/* Use throughout */
transition: background var(--transition), color var(--transition);
```

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
- Page padding: 16px
- Typography: Scales down via clamp() (no explicit media query needed)
- Sections stack vertically
- Full-width images and maps
- Single-column layout

**Tablet (641–1200px):**
- Page padding: 32px
- Content reflows naturally (fluid typography handles scaling)
- Two-column layouts where applicable
- No explicit tablet-only styles — let clamp() do the work

**Desktop (>1200px):**
- Page padding: 32px
- Max-width containers (var(--page-width): 1200px)
- Two-column layouts with sidebars (future)

### Media Query Strategy

```css
/* Avoid media queries for type scaling — use clamp() */
h1 {
  font-size: clamp(32px, 3.5vw + 12px, 52px);
}

/* Only use @media for layout changes */
@media (max-width: 640px) {
  .two-column {
    display: flex;
    flex-direction: column;
  }
}

/* Dark mode is the exception */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #111111;
    /* ... */
  }
}
```

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
  outline: 2px solid var(--text);
  outline-offset: 2px;
}

/* Visible focus styles on all interactive elements */
a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 2px;
}
```

**Never** use `outline: none` without a visible focus alternative.

### Color Contrast

All text/background combinations must meet **WCAG AA** (4.5:1 for normal text, 3:1 for large text).

Tested combinations:
- --text (#171717) on --bg (#FAFAF8): 19.1:1 ✓
- --text-2 (#525252) on --bg (#FAFAF8): 7.5:1 ✓
- --text-3 (#A3A3A1) on --bg (#FAFAF8): 4.6:1 ✓
- --text (#F0F0EE) on --bg (#111111): 19.1:1 ✓ (dark mode)

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

## 10. Maps & Directory (shipped)

The `/map/` page pairs a **directory** with an **interactive map**. Selecting a
place in either surface drives the other.

### Files

| File | Role |
|---|---|
| `_includes/partials/map.njk` | The component — markup + inline JS. Self-contained; include it anywhere. |
| `_data/mapbox.json` | Access token, style URL, GL JS version. Never hardcode these in templates. |
| `_data/placeIcons.json` | Place `type` → Phosphor icon name. Add a row when you add a type. |
| `assets/css/main.css` | `.dirmap` block (layout, markers, popups) and the `.place-entry--card` modifier. |

Places come from `collections.places`, so the map and directory stay in sync
automatically as content is added. Nothing is maintained by hand.

### Layout

- **Desktop (> 900px):** directory left (`minmax(320px, 380px)`), map right (`1fr`).
  The map is `position: sticky` so it stays put while the list scrolls.
- **Mobile (≤ 900px):** map first — it's the orienting element — with the
  directory beneath as a **horizontal snap rail** (`scroll-snap-type: x mandatory`,
  cards at `min(82vw, 320px)`).

> The mobile `.dirmap__map` must stay `position: relative`, not `static`.
> It is the containing block for the absolutely-positioned zoom controls; making
> it static sends them to the top-left of the page.

### Icons

Place types render as a **black 24px Phosphor glyph in a circle** — a 40px circle
in cards, a 44px pin on the map. Both use the `{% icon %}` shortcode at `fill`
weight. Selection inverts the circle (black fill, white glyph).

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
- announces through a visually hidden `#dirmap-status` (`role="status"`,
  `aria-live="polite"`) — "Showing X on the map." / "Map reset…",
- gives each jump button a short `aria-label` (`Show <title> on the map`).
  Without it the accessible name is the *entire card* — overline, title, full
  subtitle, cost and duration read as one run-on string.
- Markers are 44×44px, meeting the minimum touch target.

`prefers-reduced-motion` is honoured: `jumpTo()` replaces `flyTo()` and
`scrollIntoView` drops to `behavior: "auto"`. Never pass `essential: true` on
the camera animation — that flag exists to *override* the user's preference.

### Failure mode

If `mapbox-gl.js` never loads, the script adds `.dirmap--nomap`, which hides the
map and the reset control and collapses to one column. The directory stays fully
usable — every card's "Read more" is a plain link that needs no JavaScript.

### Tokens

The map/directory uses the shared Andean token set like every other component —
the old `.dirmap`-scoped Loom scale and the `--dm-*` chrome tokens are gone.
Rounded chrome comes from `--radius-small`/`--radius-large`/`--radius-full`;
shadows from `--elevation-level-*` + `--color-shadow`.

Map chrome (markers, popups, controls) follows the color scheme with the rest of
the page. Each piece of chrome carries its own token-driven surface, so contrast
is internal to the chrome and it stays legible over the light basemap in dark
mode; when a dark Mapbox style exists, swap it with `map.setStyle()` on theme
toggle.

### Performance

- Place data is **inlined at build time** — no fetch, so no init waterfall.
- 19 HTML markers is well under the ~100 threshold where symbol layers become
  necessary. Past ~100 places, move to a GeoJSON source + symbol layer.
- One reused `Popup` instance rather than one per interaction.
- `preconnect` to `api.mapbox.com` is emitted **only** on `/map/`.
- `cooperativeGestures: true` — the map never hijacks page scroll.

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

### CSS Setup

1. Define custom properties at root:
```css
:root {
  --font-sans: "Rethink Sans", system-ui, sans-serif;
  --font-serif: "Source Serif 4", system-ui, serif;

  --space-0: 4px;
  --space-1: 8px;
  --space-2: 16px;
  /* ... */

  --page-width: 1200px;
  --content-width: 720px;

  --transition: 150ms ease;
  --transition-slow: 300ms ease;
}
```

2. Import Google Fonts (or host locally):
```css
@import url('https://fonts.googleapis.com/css2?family=Rethink+Sans:wght@500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;600&display=swap');
```

3. Build components modularly:
```css
/* index.css */
@import './theme.css';         /* Color variables */
@import './type.css';          /* Typography defaults */
@import './layout.css';        /* Page layout */
@import './components.css';    /* Component styles */
@import './utilities.css';     /* Helper classes */
@import './print.css';         /* Print styles */
```

### Template Setup (Nunjucks)

1. Base layout:
```nunjucks
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{% block title %}Andean Road{% endblock %}</title>
  <link rel="stylesheet" href="/assets/css/index.css">
</head>
<body>
  {% include "partials/header.njk" %}
  <main id="main">
    {% block content %}{% endblock %}
  </main>
  {% include "partials/footer.njk" %}
  <script src="/assets/js/theme.js"></script>
</body>
</html>
```

2. Place entry partial:
```nunjucks
{# _includes/partials/place-entry.njk #}
<a href="{{ place.url }}" class="place-entry">
  <span class="place-entry__overline">{{ place.type | upper }}</span>
  <h3 class="place-entry__name">{{ place.name }}</h3>
  <p class="place-entry__description">{{ place.description }}</p>
  <p class="place-entry__meta">{{ place.cost_level }} | {{ place.duration }}</p>
</a>
```

### JavaScript

Minimal JS. Use custom elements and web standards:

```javascript
// Theme toggle
document.querySelector('.theme-toggle').addEventListener('click', () => {
  const html = document.documentElement;
  const newTheme = html.dataset.theme === 'light' ? 'dark' : 'light';
  html.dataset.theme = newTheme;
  localStorage.setItem('theme', newTheme);
});

// Restore saved theme
const saved = localStorage.getItem('theme') || 'light';
document.documentElement.dataset.theme = saved;
```

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

Cartography draws on the Andean data tokens in `tokens.css` (the former
`map-tokens.css` layer is gone): `--color-data-category-1..10` for the
categorical ramp, the `--color-data-primary/-secondary/-tertiary` ramps for
sequential/route color, and `--color-data-negative/-attention/-tertiary` for
the extra place types. Route lines use `--color-data-primary` with a
`--color-shadow` casing. Chrome and panel furniture use the shared container/
text tokens.

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
- **Popup class names collide.** `.map-popup` belongs to the older `.dirmap`
  component; the map engine uses `.mappopup`. Two components cannot share a
  Mapbox `className`.
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

**2026-07-23 — Andean token migration (full token-system replacement)**

The bespoke token layer was replaced wholesale by the **Andean design-token
set**, adopted verbatim into `tokens.css` under `[data-theme="andean"]` /
`[data-colorscheme="dark"]`. Every component now references only tokens from
that set; all other token declarations were removed.

- **Removed:** the old `:root` scale (`--bg/--surface/--text-*/--border*`,
  `--gray-*` primitives, `--space-0..8`, `--text-*` type tokens, `--transition`,
  `--shadow*`, `--radius`, `--content-width`/`--page-width`), the
  `.dirmap`-scoped Loom scale and `--dm-*` chrome, and the entire
  `map-tokens.css` file (`--brand-*`, `--viz-*`, `--seq-*`, `--route-*`,
  `--map-*`, `--panel-*`).
- **Key mappings:** `--text` → `--color-text-primary`, `--text-2/-3` →
  `--color-text-secondary/-tertiary`, `--bg` → `--color-page-background-primary`,
  `--surface` → `--color-container-background-primary`, `--border` →
  `--color-container-border-primary`, `--accent-soft` →
  `--color-container-background-tertiary`, `--viz-1..8` →
  `--color-data-category-1..8`, shadows → `--elevation-level-*` +
  `--color-shadow`, `--transition` → `--duration-fade-fast` + `--ease-fade`,
  spacing → `--space-x-small/medium/large/x-large` +
  `--space-container-padding-*`.
- **Typography:** Source Serif 4 removed (font-faces, preload, woff2 files) —
  the Andean set is Rethink Sans only. The clamp() type scale gave way to the
  breakpointed `--font-size-*` tokens; heading tracking tokens had no
  equivalent and the declarations were dropped. Weights now come from the
  `--font-weight-*` tokens (display 400, heading 500), which deliberately
  flattens the old 700/800 hierarchy.
- **Interactive color:** links use `--color-link-text(-hover)`, buttons the
  `--color-action-standard*` set with `--radius-action`, focus rings
  `--color-focus-indicator`, active map cards `--color-selection-indicator` —
  the site is no longer strictly monochrome; the Andean teal marks interaction.
- **Theme attribute split:** `<html data-theme="andean">` is fixed in markup;
  the toggle now writes `data-colorscheme="dark"` (localStorage key unchanged).
  All `[data-theme="dark"]` selectors became `[data-colorscheme="dark"]`, and
  per-component dark overrides were deleted — tokens flip themselves.
- **Still allowed, not design tokens:** `--header-h` (structural viewport
  constant) and `--cat` (per-category indirection that always resolves to a
  `--color-data-*` token). `andean-map.js` reads `--color-data-primary` and
  `--color-shadow` for the route layers.

**2026-07-23 — canonical export restored verbatim (supersedes the pruning
commit before it)**

A pruned "used subset" tokens.css was briefly committed, then reverted by
decision: the canonical Andean export now lives in `tokens.css` **verbatim**
(all 396 tokens, light + dark), with only the self-hosted `@font-face` rules
above it. The export is intended for the map product and everything else, so
the full set stays available; it is never hand-edited or regenerated in this
repo — replace the blocks wholesale when a new export ships. Verified after
restore: every `var()` in the codebase resolves to an Andean token; the only
other custom properties are the documented carriers `--cat` (holds
`--color-data-*` values) and `--header-h` (structural constant).

**Known upstream issue, left as exported:** the desktop `--font-size-*` block
sits *after* the two `max-width` media queries at equal specificity, so the
responsive sizes never win — all viewports get the desktop type scale (e.g.
72px `display-2` on phones). Fixing it means moving the base block above the
media queries; that is an edit to the export, so it belongs upstream. Flag for
the next export revision.

**Known, accepted:**

- 15 tokens are declared but unreferenced. Most are scale completeness
  (`--space-8`, `--gray-400/800`) and are kept as system API.
- `--gray-200` and `--gray-300` hold the same value (`#E5E5E5`). Harmless, but
  collapse them if the palette is ever revised.
- Contrast measured in-browser: secondary text is **4.63:1** and tertiary
  **4.54:1** in light mode, **7.28:1** and **5.35:1** in dark. All pass WCAG AA,
  but the light-mode margin is thin — do not lighten `--text-2` or `--text-3`.

---

## Summary

The Andean Road design system is **type-first, editorial, and restrained**. It reflects the voice of a bilingual friend sharing personal recommendations, not a travel database. Every design choice — from monochrome color to sharp geometry to the choice of fonts — serves clarity and the reading experience.

This system is built for growth: maps, color, and interactive features are planned and structured to layer on top without breaking what works today.

**The grid is the skeleton. Type is the voice. Everything else serves the prose.**

---

**Document Version:** 1.0
**Last Updated:** March 28, 2026
**Maintained By:** Design System Owner
**Status:** Complete & ready for implementation
