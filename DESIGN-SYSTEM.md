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

Complete type hierarchy with fluid scaling (clamp) for responsive scaling without breakpoints.

### Type Scale

| Level | Font | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|------|--------|-------------|----------------|-------|
| **Display** | Rethink Sans | clamp(42px, 5vw + 16px, 72px) | 800 | 1.0 | -0.04em | Homepage title, hero statements |
| **H1** | Rethink Sans | clamp(32px, 3.5vw + 12px, 52px) | 800 | 1.05 | -0.035em | Page titles, major sections |
| **H2** | Rethink Sans | clamp(22px, 2vw + 8px, 30px) | 700 | 1.15 | -0.02em | Section headers, guide entry titles |
| **H3** | Rethink Sans | clamp(18px, 1.2vw + 8px, 22px) | 600 | 1.25 | -0.01em | Place names, subsection titles |
| **Body** | Source Serif 4 | clamp(16px, 0.5vw + 14px, 18px) | 400 | 1.65 | normal | Editorial prose, place descriptions |
| **Body SM** | Rethink Sans | clamp(14px, 0.3vw + 12px, 15px) | 400 | 1.55 | normal | Descriptions, metadata, helper text |
| **Caption** | Rethink Sans | 13px | 400 | 1.4 | normal | Small labels, footnotes, timestamps |
| **Overline** | Rethink Sans | 11px | 600 | 1.4 | 0.1em | Category labels, section markers |

### Font Pairing Rationale

**Rethink Sans** (geometric grotesque, bold at display sizes) — Says "magazine." Handles all headlines and interface text. The visual authority of the page. Geometric clarity, no serifs, professional restraint.

**Source Serif 4** (optical-size variable serif) — Says "trust this voice." Handles reading-heavy content (place descriptions, guides). Optical sizing means the serif detail is fine at large sizes and robust at small sizes. Feels literary, editorial, credible.

This pairing echoes the sans/serif split used throughout Condé Nast publications — bold sans for structure, elegant serif for narrative.

### Implementation

```css
/* CSS Custom Properties */
--font-sans: "Rethink Sans", system-ui, sans-serif;
--font-serif: "Source Serif 4", system-ui, serif;

/* Display text */
.text-display {
  font-family: var(--font-sans);
  font-size: clamp(42px, 5vw + 16px, 72px);
  font-weight: 800;
  line-height: 1.0;
  letter-spacing: -0.04em;
}

/* Use clamp() throughout for fluid scaling */
h1 {
  font-family: var(--font-sans);
  font-size: clamp(32px, 3.5vw + 12px, 52px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.035em;
}
```

---

## 3. Spacing Scale

4px base unit. Geometric progression for predictable rhythm.

```css
--space-0: 4px;   /* Tight component internals, micro-spacing */
--space-1: 8px;   /* Element gaps, small padding */
--space-2: 16px;  /* Component padding, paragraph spacing */
--space-3: 24px;  /* Section internals, card padding */
--space-4: 32px;  /* Section padding, major spacing */
--space-5: 48px;  /* Section dividers, breathing room */
--space-6: 64px;  /* Major section breaks */
--space-7: 96px;  /* Page-level spacing, dramatic */
--space-8: 128px; /* Full-screen whitespace, visual climax */
```

**Usage examples:**
- `.place-entry` padding: var(--space-2) var(--space-3)
- Section top margin: var(--space-6)
- Page top padding: var(--space-7)
- Between place listings: var(--space-4) margin-top

---

## 4. Color System

### Light Mode (Warm Paper)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | #FAFAF8 | Page background (warm, off-white, slightly beige) |
| `--surface` | #FFFFFF | Card/elevated surfaces, forms |
| `--text` | #171717 | Primary text, headlines |
| `--text-2` | #525252 | Secondary text, descriptive copy |
| `--text-3` | #A3A3A1 | Tertiary/disabled text, hints |
| `--border` | #EBEBEA | Default borders, subtle dividers |
| `--border-subtle` | #F5F5F3 | Subtle separators, barely visible |
| `--accent` | #171717 | Links, CTAs, interactive elements |
| `--rule` | #D5D5D3 | Horizontal rules, structural lines |

### Dark Mode

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | #111111 | Page background, true black |
| `--surface` | #1A1A1A | Elevated surfaces, cards |
| `--text` | #F0F0EE | Primary text, high contrast |
| `--text-2` | #A0A09E | Secondary text, readable but softer |
| `--text-3` | #6B6B69 | Tertiary text, disabled states |
| `--border` | #2A2A2A | Borders, visible but restrained |
| `--border-subtle` | #1F1F1F | Subtle separators |
| `--accent` | #F0F0EE | Links, interactive elements |
| `--rule` | #333333 | Structural rules |

### Color Philosophy

**Monochrome first.** Grayscale supports the editorial voice — the writing is the color. All contrast and hierarchy come from typography and spacing.

**Future color is intentional.** When color is introduced (expected in v2):
- Map pins: Single accent color (e.g., warm terracotta for "experience" vs. cool blue for "practical")
- Audience segment tints: Subtle background tints on audience cards (very low saturation, 10-15% opacity)
- Interactive data: Visualizations use a limited palette (max 4 colors)

**When color appears, it should feel like a single accent on a black-and-white photograph.** No rainbow gradients. No decorative color. Earned color.

### Implementation

```css
@media (prefers-color-scheme: light) {
  :root {
    --bg: #FAFAF8;
    --surface: #FFFFFF;
    --text: #171717;
    --text-2: #525252;
    --text-3: #A3A3A1;
    --border: #EBEBEA;
    --border-subtle: #F5F5F3;
    --accent: #171717;
    --rule: #D5D5D3;
  }
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #111111;
    --surface: #1A1A1A;
    --text: #F0F0EE;
    --text-2: #A0A09E;
    --text-3: #6B6B69;
    --border: #2A2A2A;
    --border-subtle: #1F1F1F;
    --accent: #F0F0EE;
    --rule: #333333;
  }
}
```

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

## 10. Future: Maps Architecture

Maps are currently in design exploration. This section documents the planned system.

### Data Model

All place entries already include:
```json
{
  "name": "Atacama",
  "coordinates": {
    "lat": -22.9,
    "lng": -68.2
  },
  "region": "Northern Chile",
  "google_maps": "https://maps.google.com/?q=...",
  "type": "region"
}
```

This structure supports maps immediately.

### View Toggle

**Planned component** (`.view-toggle`):
- Two buttons: "List" | "Map"
- Placed at section level (or page level)
- Toggle between editorial entries (current) and Leaflet/Mapbox map

```html
<div class="view-toggle">
  <button class="view-toggle__btn view-toggle__btn--list active">List</button>
  <button class="view-toggle__btn view-toggle__btn--map">Map</button>
</div>
```

### Map Styling

- **Tiles**: Monochrome basemap (Stamen Toner or similar)
- **Pins**: Minimal circles, no markers
  - Radius: 8px
  - Stroke: 1px solid var(--text)
  - Fill: var(--surface)
  - Hover: Slight enlarge, background shift
- **Labels**: Overline-sized text, monochrome
- **Zoom**: Thoughtful defaults per region (not user-controlled at first)

### Offline Maps

**Planned downloadable static maps:**
- SVG or high-res PNG (600px × 800px)
- Styled in site's monochrome palette
- Trail/region outlines in --rule color
- Place labels overlaid
- Designed like a National Parks map

Example use: Print a 3-day itinerary with a static map at the top.

### Mobile Map Experience

**Planned interaction pattern** ("park brochure flip"):
- Full-viewport map on mobile
- Bottom sheet (draggable) for place details
- Tap a pin → sheet slides up with place entry
- Swipe down → map returns to fullscreen

No separate "mobile map" page — one cohesive experience.

### Implementation Notes

- **Mapbox GL JS** or **Leaflet** with custom tile layer
- Place tiles cached locally (service worker) for offline mode
- Map data sourced from existing `_data/places.json`
- No dynamic API calls; all data is static site generation

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

## Summary

The Andean Road design system is **type-first, editorial, and restrained**. It reflects the voice of a bilingual friend sharing personal recommendations, not a travel database. Every design choice — from monochrome color to sharp geometry to the choice of fonts — serves clarity and the reading experience.

This system is built for growth: maps, color, and interactive features are planned and structured to layer on top without breaking what works today.

**The grid is the skeleton. Type is the voice. Everything else serves the prose.**

---

**Document Version:** 1.0
**Last Updated:** March 28, 2026
**Maintained By:** Design System Owner
**Status:** Complete & ready for implementation
