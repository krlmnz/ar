---
permalink: false
eleventyExcludeFromCollections: true
---

# Andean Road — executive architecture and design-system audit

**Site:** [andean-road.com](https://andean-road.com) · repository `krlmnz/ar`
**Audited commit:** `728306d` — “Port the MapLibre Roadtrip guide across the site” ([PR #4](https://github.com/krlmnz/ar/pull/4)), 26 September 2026
**Method:** source read of layouts, partials, pages, content, CSS, JS, `_data`, Eleventy config, Netlify, and scripts, plus a clean `npm run build` (Eleventy 2.0.1, 97 HTML files). Contrast figures below are WCAG relative-luminance ratios computed from the hex values declared in CSS.
**What is not in this repo:** `tools-apps/map-atelier`, `CLAUDE.md`, a `functions/` directory, and a `.github/` workflow. The Roadtrip guide was inlined into the site in PR #4. It was not kept as a separate app.

This file is excluded from the Eleventy build (`permalink: false`) so the audit does not become a public URL. `DESIGN-SYSTEM.md` and `README.md` are already ignored in `.eleventy.js`. `WRITING.md` and `_starters/` are not. See §2 and §6.

---

## 1. Executive summary

Andean Road is a personal Chile travel guide: 19 places, 4 guides, and 5 practical notes, compiled by Eleventy into a static site and deployed on Netlify. There is no application server. The content model is the strongest part of the system. A place is a folder of markdown; guides point at places by slug; region, tag, and audience pages are generated from that.

On 26 September 2026 the homepage stopped being that guide. PR #4 replaced `/` with a 14-lesson MapLibre textbook (“Roadtrip Map 101”) and moved the Chile index to `/chile/`. Tokens, the sticky header, six reading themes, type size, and a plain-language toggle were ported onto every page. The travel pages still render. The design system that describes them does not match the CSS that paints them. The production maps still run Mapbox GL JS, while the new homepage teaches `maplibregl`.

**Health: Fair — 6 / 10.**

| Area | Score | Why |
|---|---|---|
| Content platform | 8 | Collections, slug references, starters, and map failure modes are careful. |
| Reading chrome | 7 | Themes persist before first paint. Focus, skip link, and reduced motion exist. |
| Design-system enforceability | 3 | Three generations of tokens, type, and spacing are all still “the system.” |
| Product coherence | 3 | The domain’s front door, footer, and engine disagree about what the site is. |
| Platform | 5 | Token handling and cookieless analytics are sound. No CI. Scaffolds are in the sitemap. |

The score is the product after the merge, not a verdict on the Chile guide underneath it. That guide is in good shape. The merge is not finished.

### Top 5 risks and opportunities

1. **The homepage is a different product.** `/` is “MapLibre Roadtrip 101.” The logo returns there. The footer on every Chile page says “MapLibre Roadtrip 101.” Search and social previews will describe a mapping course. The travel guide lives one click away at `/chile/`.
2. **Internal files are public and indexed.** A production build emits `/WRITING/` and 15 `/_starters/…` pages with no site chrome, and lists them in `sitemap.xml` (68 URLs). `.eleventy.js` ignores only `DESIGN-SYSTEM.md` and `README.md`.
3. **The publishing safety net does not match the content.** Starters and `WRITING.md` tell authors to set `published: false`. Every live place, guide, and practical page sets `status: published`, which no collection reads. An unfinished place copied from a live file, left at coordinates `0, 0`, will stretch every map to the Gulf of Guinea. The starter documents this failure and then uses a field the corpus does not.
4. **The design system cannot be followed.** `DESIGN-SYSTEM.md` (about 1,500 lines) still specifies Rethink Sans, Source Serif 4, a 4px spacing scale, sharp corners, and a light/dark toggle. `assets/css/tokens.css` specifies Helvetica, Georgia, a 12px-based scale, 12px radii, and six themes. The README still forbids `--gray-*` primitives that the CSS no longer declares. Contributors who trust the document will ship the previous site.
5. **Two map engines, and the newer one is not the one on `/map/`.** Six layouts share `assets/js/andean-map.js`. The directory at `/map/` still inlines a second engine in `_includes/partials/map.njk`. The second engine does not restore `role="button"` after Mapbox overwrites it, and it does not collapse the map when a URL-restricted token returns 401/403. Route stop numbers are white on `#D7561D` at 13px: **4.01:1**, short of the 4.5:1 AA bar for text that size.

---

## 2. Code review

The pre-port code is unusually well commented for a personal site. Map popups are built with `textContent`, JSON-LD escapes `</script>`, date filters survive both quoted and unquoted YAML, and a missing icon fails the build. The port added a preference layer that is small and readable (`assets/js/view.js`, 118 lines). The debt is duplication, a stale contract, and files the build was never supposed to publish.

### Quality that is worth keeping

- **Places are the spine.** `content/places/<slug>/index.md` carries coordinates. `.eleventy.js` filters `toFeatures` and `bySlugs` resolve maps from those files. Guides do not copy lat/lng. This is the right model and it is small enough to hold in one head.
- **Authoring guardrails in the template layer.** Optional fields omit their markup. FAQ and place JSON-LD use `| dump` plus a `</` escape (`_includes/layouts/faq.njk`, `_includes/layouts/place.njk`). Map popups in both engines use DOM nodes, not HTML strings.
- **Map failure is designed.** No token: `andean-map.js` hides the shell and adds `no-map`, and `map-layouts.css` collapses the grid to a list. The directory map adds `dirmap--nomap` if `mapbox-gl` never arrives. Text and “Read more” links work without JavaScript.
- **Theme flash is handled.** A blocking script in `_includes/layouts/base.njk` reads `localStorage` before CSS. Allowed values are whitelisted: `light`, `night`, `note`, `signal`, `news`, `draft`. A legacy `theme=dark` value maps to Night Sky.

### Consistency problems

**Publishing flag.** Collections filter `item.data.published !== false` (`.eleventy.js`). Live content sets `status: published` and never sets `published`. The filter therefore accepts every current file. `_starters/place.md` sets `published: false` and coordinates `0, 0`. Both conventions are documented as if they were one.

**Homepage is a one-off.** `pages/index.njk` is 326 lines of hand-built lesson HTML (`fieldGuide: true`). It does not use the content collections. `README.md` says “everything is data-driven from `content/`.” The front door is the exception, and it is the largest template in the site.

**Chile index duplicates the directory.** `pages/chile.njk` hard-codes four region buckets (`santiago`, `casablanca-valley`, `lake-district`, and a day-trip union of `pomaire` / `central-coast` / `central-mountains`) and copies the place-entry markup. `pages/places.njk` already loops `regions` and includes `_includes/partials/place-entry.njk`. A new region in `_data/regions.json` appears on `/places/` and `/regions/` and is absent from `/chile/`.

**Card markup is copied across map layouts.** `map-split`, `map-stack`, `map-area`, `map-route`, `map-neighborhood`, and `map-story` each assemble a feature list in Nunjucks and repeat card structure. The engine is shared. The templates are not. `scripts/new.js` can scaffold `story`, `route`, `neighborhood`, `area`, and `browse` (split). It has no `stack` kind, and there is no `_starters/map-stack.md`, even though `content/templates/map-stack.md` exists.

**Cascade ownership is split.** `assets/css/main.css` imports `tokens.css`, `chrome.css`, `map-tokens.css`, and `map-layouts.css`, then continues for ~1,700 lines. Because the import is at the top, later rules in `main.css` beat `chrome.css` when specificity ties. Both files style `.hero-title`, `.hero-overline`, `.page-header__title`, and `.section-label`. Properties restated in `main.css` win. Properties only set in `chrome.css` survive — including the 6px overline rule. The rendered page is whichever file spoke last about that property.

`chrome.css` also styles `.reading h3` (the class on every normal page’s `<main>`). Lesson-scale type is therefore one selector away from travel prose. `.prose h3` in `main.css` happens to win inside the prose column because it comes later at the same specificity. That is an accident of source order.

### Dead code and leftover redesign weight

| Item | Evidence |
|---|---|
| Self-hosted fonts, unused | Eight `.woff2` files under `assets/fonts/` (~570KB of Rethink Sans and Source Serif 4). No `@font-face` anywhere. `tokens.css` sets `--font-ui: Helvetica, Arial, sans-serif` and `--font-reading: Georgia, "Times New Roman", serif`. |
| Google Fonts comment | The first lines of `main.css` still tell a future editor to paste a Google Fonts `<link>`. `base.njk` does not. |
| Gray primitive scale | Documented in `DESIGN-SYSTEM.md` §4 and forbidden by `README.md`. Not declared in `tokens.css`. |
| `.view-toggle` | Removed as dead in the July audit log, still hidden in the print stylesheet in `main.css`. |
| `.lede` | The same audit log says it was removed. `chrome.css` defines it again, globally, for the lesson. |
| `.map-container` | Commented “future” in `main.css`. No template uses it. |
| `llms.txt` | Claims bilingual content and `/api/places.json` plus `/api/guides.json`. It is not a passthrough, so the build does not even publish it. The claims are false either way. |
| Netlify `functions = "functions"` and CORS on `/api/*` | `netlify.toml`. No `functions/` directory. No API routes. |
| Audience colors | `_data/audiences.json` sets `color` and `icon` per audience. No template or CSS reads `color`. |
| Directory vs engine popup names | The July log split `.map-popup` and `.mappopup` so Mapbox class names would not collide. Inner elements in `andean-map.js` are still `map-popup__title` / `map-popup__overline`. The split is half-done. |
| Duplicate map chrome colors | `map-tokens.css` defines `--map-text-2: #615F5B`. `.dirmap` in `main.css` redefines `--dm-map-text-2: #6B7280` and repeats the surface hexes instead of pointing at `--map-*`. |

### Accessibility

What is in good shape:

- Skip link, `aria-current="page"` on the primary nav, `aria-pressed` on map selection, and a polite live region on both map UIs.
- `prefers-reduced-motion` is honored in `chrome.css`, `main.css`, and both map scripts (`jumpTo` instead of `flyTo`).
- FAQ accordions are native `<details>`. Manual contents are native `<details>`.
- Homepage diagrams carry `<title>` and `<desc>`.
- Focus rings use `--focus-ring` on links, buttons, summaries, and the view menu.
- Theme values are whitelisted, so a stored string cannot become an arbitrary `data-theme`.

Gaps:

- **Route numerals fail AA.** `.mk--seq` paints `#fff` on `--route-line` (`#D7561D`). `--route-ink` (`#A03D12`, 6.62:1 against white) exists for this reason and is not used on the disc. The number is `--text-caption` (13px, weight 700). Measured contrast **4.01:1**. AA for text this size is 4.5:1.
- **Drafting Grid secondary text is the thin theme.** `--text-2 #60706d` on `--bg #edf1ee` is **4.56:1**. It clears AA and should not be lightened. The other five themes’ secondary text is 5.3:1 or better on the page background. Link color (`--accent-text`) clears 7:1 on the page background in all six themes.
- **`/map/` markers lose their button role.** `andean-map.js` sets `role="button"` after `addTo()`, because Mapbox GL stamps `role="img"`. `_includes/partials/map.njk` never does. The directory map’s own design note documents this bug and fixes it only in the other engine.
- **Map markers and zoom controls are 30–34px.** The directory component’s notes aimed at 44px. WCAG 2.2’s 24px AA target is met. The two maps do not meet the same target the design notes claim.
- **Plain language is a global control with one consumer.** The header toggle is on every page. The only `.plain` blocks are in `pages/index.njk`. On a place page the switch changes `data-plain` and has nothing to show or hide.
- **Text size does not change the scale.** `view.js` sets `--base` between 15px and 22px. Body copy uses `--base`. Headings, UI chrome, overlines, and map panels use fixed `--text-h1`, `--text-sm`, and similar. The control does what its hint says (“main reading size”) and does not do what a reader may expect (“the page”).
- **No `prefers-color-scheme`.** A first visit on a dark OS gets Light / Minimal until the reader opens Customize view.
- **The mountain mark does not theme.** `header.njk` fills it with `#FCFCFC`, `#7C7C7C`, `#595959`, and black at various opacities. On Night Sky and Signal Hacker it stays a light badge. That can be a deliberate emblem. It is not a token.
- **`role="application"`** on both map canvases drops browse mode for assistive tech. Acceptable for a pan/zoom surface if the list beside it is the accessible alternative, which it is. Worth keeping the list complete whenever the canvas is an application.

### Performance

The site ships no bundler, which is the right call at this size. Costs that do show up:

- Every page loads the full CSS stack: `main.css` pulls in lesson chrome, directory map, and all six map layouts. Combined CSS is about 90KB uncompressed, on a practical page that needs none of the map or diagram rules.
- Eight font files (~570KB) are passthrough-copied in `assets/` and referenced by nothing. They still upload on deploy.
- Mapbox GL JS and CSS are loaded from `api.mapbox.com` only on map pages (good), but `preconnect` to `api.mapbox.com` and `events.mapbox.com` is emitted only when `page.url == "/map/"`. The six layouts that also load GL JS do not get the preconnect.
- `events.mapbox.com` is Mapbox GL telemetry. The README’s privacy story covers Plausible, GoatCounter, Cloudflare, and Umami, and does not mention this request.
- Place coordinates are inlined at build time. At 19 points that is correct. The design notes already say to move to a GeoJSON symbol layer past ~100 markers. Not urgent.

### Security

This is a static, author-trusted site. The realistic issues are token handling, template injection if content is ever less trusted, and response headers.

**Mapbox token — handled well.** `_data/mapbox.js` reads `MAPBOX_TOKEN` or gitignored `_data/mapbox.local.json`. The example file contains `pk.your-token-here`. No live token is in git. The README correctly treats a `pk.` token as public in the browser and requires URL restrictions. Deploy-preview hosts (`deploy-preview-*--*.netlify.app`) are not subdomains of the production host, so previews 403 unless a separate token is set. `andean-map.js` detects that and hides the map. The directory engine does not.

The style URL is hardcoded: `mapbox://styles/kmunoz/cmpndx2y700jc01sc8vm610ld`. That exposes the Mapbox account name. It is not a secret. It does mean the basemap is a personal Studio style with, per the README, no settlement or road labels.

**Template XSS — low, and uneven.** Markdown is configured with `html: true`, which is normal for an author-only Eleventy site and is script-capable if a markdown file contains a `<script>`. JSON-LD is escaped. `map-config` is `| dump | safe` without the `</` replacement the JSON-LD blocks use. A place title containing `</script>` would break out of the config script. Titles today do not. Taxonomy pages (`pages/region.njk`, `pages/tag.njk`, `pages/audience.njk`) mark labels `| safe` in the title, which disables HTML escaping for data that is plain text. The icon shortcode interpolates `label` into an attribute with no escape. None of this is an incident. It is inconsistent with the care already taken in `place.njk`.

**Analytics env is interpolated raw** in `_includes/partials/analytics.njk` (`analytics.id`, `analytics.host`). Those values come from the build environment. A hostile or mistyped `ANALYTICS_HOST` becomes a script URL. Treat those env vars as trusted, which they are on Netlify, and still escape them if this file is copied elsewhere.

**Headers.** `netlify.toml` sets long-cache immutable headers for images and `Access-Control-Allow-Origin: *` for `/api/*`. There is no Content-Security-Policy, frame denial, or referrer policy. For a static marketing site that is acceptable until the Mapbox token and any future API share the origin. The wildcard CORS rule is currently dead, and it will apply the moment someone adds `/api/`.

### Test gap

`package.json` has `start`, `build`, `debug`, and `new`. No test script, no linter, no visual regression, no CI. The July design-system log describes multi-agent audits that fixed real bugs (quoted dates crashing the build, off-by-one dates, JSON-LD breakout, invisible overlines). Nothing in the repo would catch those regressions again. The spacing scale change in PR #4 reflowed every page that uses `--space-*` with no check-in gate.

Eleventy 2.0.1’s dependency tree warns on deprecated `glob@7` and `inflight` during `npm install`. That is supply-chain hygiene for a later Eleventy 3 upgrade, not an exploitable bug in the published HTML.

### Debt that arrived with the merge

PR #4 touched 15 files (+1,746 / −630): `tokens.css`, new `chrome.css`, new `view.js`, `base.njk`, `header.njk`, `footer.njk`, a rewritten `pages/index.njk`, new `pages/chile.njk`, and small edits to the two map stylesheets. It did not touch map engines, content, `DESIGN-SYSTEM.md` beyond a four-line banner, or the ignore list.

The banner at the top of `DESIGN-SYSTEM.md` says the sections below describe the earlier system and that CSS wins when they disagree. The rest of the document, including the closing summary dated March 2026 and marked “Complete & ready for implementation,” still instructs the opposite. A banner nobody reaches past line 4 does not retire 1,500 lines.

---

## 3. Architecture and file structure

```
content/*.md  →  Eleventy collections + _data  →  Nunjucks layouts
        →  one CSS bundle (tokens → chrome → map tokens → map layouts → legacy main)
        →  _site/  →  Netlify static publish
```

There is no runtime server, no client router, and no shared package boundary between the textbook and the guide. `pages/index.njk` *is* the ported atelier.

### Content → templates

| Input | Layout | URL |
|---|---|---|
| `content/places/*/index.md` | `layouts/place.njk` via `places.json` | `/places/<slug>/` |
| `content/guides/*.md` | `layouts/guide.njk` | `/guides/<slug>/` |
| `content/practical/*.md` | `layouts/practical.njk` | `/practical/<slug>/` |
| `content/templates/*.md` | per-file `layout:` | `/templates/<slug>/` |
| `content/<file>.md` | per-file, permalink from `content.11tydata.js` | `/<slug>/` |
| `pages/*.njk` | `layouts/base.njk` | indexes, `/map/`, `/chile/`, taxonomies |

`base.njk` has three shells, chosen by front matter:

- `fieldGuide: true` — textbook grid. Only the homepage sets this.
- `fullBleed: true` — map layouts. Header and footer remain; the reading column does not wrap the map.
- default — `.shell` > `.reading`, an ~72ch column (`--measure`).

That split is the right idea. The stylesheet behind it is not split the same way.

### Collections and data

`.eleventy.js` builds `places`, `guides`, `practical`, `templates`, `byRegion`, `byAudience`, and `byTag`. Pagination in `pages/region.njk`, `pages/tag.njk`, and `pages/audience.njk` turns `_data/regions.json`, tag keys, and `_data/audiences.json` into routes. Adding a place with a known region and tag updates the directory, the maps, the taxonomies, and the sitemap without a template edit. That claim in the README is true for `/places/`, `/map/`, and `/regions/`. It is false for `/chile/`, which is a hand-maintained homepage-in-exile.

Taxonomy files:

- `_data/regions.json` — 6 regions, each with label, description, and a camera hint (`lat`, `lng`, `zoom`) that no template reads.
- `_data/audiences.json` — `savor`, `family`, `thrill`.
- `_data/placeIcons.json` — type → Phosphor name, plus `_default`.
- `_data/tagInfo.json` — labels and descriptions for tag pages. Tags missing from this file still get a page; the label falls back to the slug.
- `_data/site.json` — title “Andean Road”, description already rewritten to lead with MapLibre Roadtrip 101, `url` `https://andean-road.com`.

### Coupling

1. **Category color is a CSS enum.** `map-layouts.css` maps specific slugs (`santiago`, `restaurant`, `volcano`, …) to `--viz-*` or raw `--brand-*`. A new region renders, in the author’s words, “never invisible — just uncoloured,” falling back to `--viz-1`. Color meaning will drift from `_data/regions.json` the first time a region is added.
2. **Global tokens moved under the map.** `DESIGN-SYSTEM.md` §10 says the 12px “Loom” spacing scale must stay scoped to `.dirmap` because the rest of the site depends on an 8px scale and `--radius: 0`. PR #4 promoted that scale to `:root` and left `.dirmap` redeclaring the same variables. The scoping rule is now inverted, and the document still states the old rule.
3. **Chrome knows about lessons.** `chrome.css` contains the header (shared, correct) and the cover, penguin badge, lesson column, diagrams, theme gallery, and code-copy button (homepage only). Every place page downloads the textbook.
4. **`view.js` is global and homepage-aware.** TOC spy scrolling queries `.field-guide .toc`. Copy buttons attach to every `pre`. Harmless on other pages, and a sign the script is the lesson’s behavior running in the site shell.
5. **Two engines share one token and one style URL** via `_data/mapbox.js`, and then diverge in interaction, failure handling, marker DOM, and CSS class names.

### Does this scale?

For a few dozen places and a single author, the file layout is a good static-site shape: one folder per place, directory data for taxonomies, one layout per page type. It will get awkward in three places before it gets slow.

- **`/chile/` and `map-layouts.css` category tables** are hand-maintained projections of data that already exists.
- **`main.css` at ~1,760 lines plus `chrome.css` at ~740** is still one cascade. A second designer cannot tell which rule is the system.
- **The homepage lesson** cannot grow inside `pages/index.njk` without making the travel repo a textbook repo. If the lesson stays, it wants its own route and its own CSS entry. `tools-apps/map-atelier` was the right boundary. It is not what landed.

### Restructuring, only if the product decision is explicit

Do this if the travel guide is the product and the lesson is a specimen:

- `/` returns to the Chile index (today’s `pages/chile.njk`, driven by `regions` and `place-entry.njk`).
- The lesson moves to `/learn/` with `fieldGuide: true`.
- Split CSS entry points: `site.css` (tokens, header, prose, listings) and `guide.css` (cover, lessons, diagrams), the latter linked only from the lesson layout.
- Point `/map/` at `andean-map.js` and delete the inline engine when behavior matches.

Do this if the textbook is the product:

- Say so in the footer, the logo target, `site.json`, and the sitemap.
- Keep Chile as a section, linked as a work sample, and stop describing the domain as a friend’s guide in the same sentence as the course.

Doing neither — current state — means every future visual change has to be checked against two products that share a header.

---

## 4. Design system audit — designer

### What the system is trying to be

The ported system is a low-noise reading environment: a sticky header, a mountain mark, five nav items, a Customize view panel, a wide measure, poster titles, and six themes that change atmosphere without reordering content. On the homepage that idea is coherent. Lessons have a kicker, a short lede, an optional “In plain words” note, a diagram, and a code sample. Diagrams are inline SVG using semantic fills (`--ink`, `--line`, `--accent`), so they survive theme changes. That part is a real design system.

The travel pages inherited the header, the themes, and a poster scale (`--text-display` is `clamp(48px, 6vw, 84px)`, weight 900, max-width 14ch) while keeping editorial patterns from the previous system: heavy rules, place rows that are links rather than cards, serif body, and section labels. The result is a magazine that changed paper and typeface and kept its old furniture.

### Tokens, type, spacing

**Type.** UI and display are Helvetica/Arial. Reading text is Georgia. The previous system’s rationale — Rethink Sans for structure, Source Serif 4 for the friend’s voice — is still the written brand, and those files are still in the repo. Helvetica at 900 with −0.06em tracking can carry the textbook cover (“ROADTRIP MAP 101”). It is a weaker voice for “I was born in Chile and raised in New York.” Georgia is fine for long reading; it is a fallback stack, so macOS, Windows, and Linux will not match.

**Spacing.** The live scale is 2, 4, 8, 12, 24, 30, 39, 63, 96, then compatibility aliases `--space-7: 128px` and `--space-8: 160px`. Steps are uneven (30, 39, 63), which suits a poster more than a listing. Components that used to mean “8px” when they wrote `var(--space-1)` now get 12px. The visual rhythm of every existing page moved in one commit.

**Radius.** `--radius: 12px`, `--radius-sm: 6px`, pills at 9999px. The written principles still say sharp geometry and “Vignelli would not round corners here.” Map popups in `map-layouts.css` set `border-radius: 0` while the directory popup does not share that rule. Corners are no longer a principle. They are per component.

**Color philosophy.** The written system is monochrome, with hue reserved for maps. The live page system is a blue accent (`#1d5fd0` in Light) plus five alternate atmospheres, including Signal Hacker (near-black, cyan, lime highlight) and Warm Note (paper yellow, brown rules). Hue is now a reading preference, not a map-only privilege. That can be a good product decision. It contradicts the principles section someone will still implement from.

### Themes

| Theme | Field | Secondary text on field | Notes |
|---|---|---|---|
| Light / Minimal | `#f5f5f2` | 5.71:1 | Default. Calm, cool gray. |
| Night Sky | `#071018` | 9.53:1 | Star-dot background. Strong. |
| Warm Note | `#f8f1cf` | 5.71:1 | The closest thing to the old paper editorial. |
| Signal Hacker | `#030608` | 8.99:1 | A developer theme on a travel guide. |
| Grey Newspaper | `#d9d9d4` | 5.29:1 | Monochrome, text-forward. Fits the old principles best. |
| Drafting Grid | `#edf1ee` | 4.56:1 | Dot grid. Secondary text is the tightest pair on the site. |

Themes change semantic colors only. Map marker chrome stays pinned to the light basemap, which is correct while the Studio style is light-only. Directory panels follow the page. A Night Sky reader looking at `/map/` sees a dark list beside a daylight map. That split is documented and defensible. It will feel unfinished until a dark style exists.

The homepage theme gallery (lesson 14) and the header menu set the same `data-theme`. One mechanism, two controls. Good.

### Components and page types

Shared and in decent shape: header, footer, breadcrumbs, page header, prose, place entry, guide entry, practical list, tags, buttons, tip, phrases, steps, FAQ, reference list, gallery frame, manual TOC.

Map layouts are a second visual language (full-bleed, categorical color, numbered route). They are internally consistent with each other and intentionally different from articles. A reader who moves from a guide to a route page is changing products. With six map templates and almost no live content using them (the demos live under `/templates/`), the library is ahead of the editorial need.

### Reading UX

The default column (`--measure: 72ch`, body 17px, line-height 1.64) is a good reading default, and the size stepper gives 15–22px. Poster H1s on index pages compete with that. “Andean Road” at up to 84px in a 14-character measure is a cover, then the page becomes a list. On a phone the cover headline clamps to 52–76px (`chrome.css`). It still dominates a travel index.

Place pages are the best reading surface: overline, title, subtitle, meta, prose, optional tip, phrases, tags, related places. They do not yet have photography. `cover:` is set (for example `content/places/la-chascona/index.md` points at `cover.jpg`) and the repo contains one image, `assets/img/placeholder.svg`. Open Graph images are therefore broken URLs. The README already says this.

### Information architecture after the homepage swap

Primary nav: Chile, Guides, Places, Map, Practical. Footer adds Templates.

What a first-time traveler gets at `/`:

- Title: “ROADTRIP MAP 101”
- Subtitle about Santiago → Torres del Paine and MapLibre
- 14 lessons on sources, layers, camera, and debugging
- A theme picker
- No places, no “start here,” no practical notes

What they came for, if they believed `site.json`’s tagline “Your friend's guide to Chile,” is at `/chile/`.

The nav label “Chile” is now doing the work the wordmark used to do. The wordmark goes home, and home is the course. Templates (`/templates/`) are linked from the footer of every page, including the public travel pages. Those demos are useful for the author and are also 14 extra marketing URLs.

`llms.txt` still describes a three-part travel site in English and Spanish. The content is English, with Spanish phrases inside some place pages. There is no Spanish locale.

### Gaps versus a coherent product system

- One voice. The textbook voice (“Think in systems, not markers”) and the friend voice (“These are the places I've been”) share a footer sentence.
- One type stack, actually loaded.
- One spacing scale, documented where it is declared.
- Components that state which surface they belong to (reading page, map page, lesson). Today a class in `chrome.css` can restyle both.
- Photography, or an honest empty state. Declaring `cover:` without a file produces a dead `og:image`.
- A homepage that answers “where should I go?” or a domain that stops promising that.

---

## 5. Design system audit — architect

### Token ownership

`assets/css/tokens.css` is the only place semantic color, type, space, radius, and layout sizes should live. It almost is. It also carries a compatibility layer that re-points old names at the new scale:

- `--font-display` → `--font-ui` (so “display” is Helvetica, not a display cut)
- `--font-body` → `--font-reading`
- `--page`, `--panel`, `--ink`, `--muted`, `--line` → the new semantics, for the inlined diagrams
- `--space-0`, `--text-3`, `--content-width`, `--rule`, `--transition` → aliases

Aliases kept the port from breaking `main.css` in one day. They also mean a deprecated name still resolves, so nothing forces a migration. The system is adoptable and not enforceable.

`map-tokens.css` is additive and says so at the top: brand hues, `--viz-1`…`--viz-8`, `--seq-1`…`--seq-5`, route colors, `--map-*` chrome, `--panel-*` furniture. That file is the best token boundary in the repo. Keep it.

`.dirmap` then creates a third copy of spacing, radius, and map chrome (`--dm-map-*`) with slightly different grays. Two sources of truth for “the color of a marker label.”

### CSS layering

Intended stack, top of `main.css`:

1. `tokens.css` — decisions
2. `chrome.css` — header, shell, lesson
3. `map-tokens.css` — cartography
4. `map-layouts.css` — six map page types
5. The rest of `main.css` — reset, directory, prose, listings, templates

There is no `@layer`. Specificity plus source order decide. The reset (`* { margin: 0; padding: 0 }`) comes *after* `chrome.css`, so it wipes margins the chrome file set on `body` only where the universal rule ties — it does not beat `body`’s own margin rule, but it does zero `h1`/`p` margins that lesson CSS then has to put back. This works. It is fragile.

There is no lint that fails a raw hex in a component file. Hex still lives in `.dirmap`, the logo SVG, `.mk--seq` (`color: #fff`), and the brand ramp (appropriate). A stylelint rule that allows hex only in `tokens.css` and `map-tokens.css` would make the written rule true.

### Theme mechanism and persistence

| Piece | Behavior |
|---|---|
| Attribute | `html[data-theme]` |
| Blocking read | inline script in `base.njk` `<head>` |
| Write | `view.js` `setTheme`, keys `roadtrip-theme`, `roadtrip-size`, `roadtrip-plain` |
| Legacy | `localStorage.theme === "dark"` → `night` |
| OS preference | not consulted |
| Invalid value | falls back to `light` |
| `color-scheme` | `light` by default; `dark` for Night and Signal only. The meta tag says `light dark`, which is broader than the attribute. |

Persistence is correct and small. The missing piece for enforceability is a single list of theme ids. Today the list is copied in the head script, the `<select>` in `header.njk`, and the lesson’s `data-theme-choice` buttons. Add a theme by editing three places, plus a block in `tokens.css`.

`html[data-theme="news"]` and `draft` do not restate `--shadow` / `--shadow-pop`, so they inherit Light’s shadows. Visually minor. Architecturally, theme blocks are not a closed set of keys.

### What “enforceable” would mean here

A contributor can today:

- Use `--text` and get a theme-aware color (good).
- Use `--gray-900` because the README forbids it and the file does not define it, so the declaration is invalid and the previous color wins (silent).
- Follow `DESIGN-SYSTEM.md` §2 and set Rethink Sans, which will not load.
- Add a 7th theme in CSS only, and the select will never offer it.
- Style `.reading h3` from the lesson file and change every article.

Enforceability is documentation that matches `tokens.css`, one public entry file per surface, and a check that fails raw colors outside token files. None of the three exist yet. The token file itself is ready to be that source.

### Migration path off the legacy Andean styles

The legacy system is not deleted. It is `main.css` below the imports, plus the long design document.

A sane order:

1. **Freeze the document.** Replace `DESIGN-SYSTEM.md` with a short spec generated from `tokens.css`: semantic names, the six theme blocks, type roles, and the map-token file. Move the March 2026 editorial spec to `docs/archive/` or clearly title it “superseded.” Until that happens, the banner is not a migration plan.
2. **Pick a type stack and load it.** Either wire the existing woff2 files with `@font-face` and point `--font-ui` / `--font-reading` at them, or delete the files and accept Helvetica and Georgia in the spec. Do not leave both stories true.
3. **Collapse aliases in one pass.** `main.css` still speaks `--font-display`, `--text-3`, `--content-width`, `--space-0`. After those selectors point at the canonical names, delete the aliases so old snippets fail obviously.
4. **Point `.dirmap` at `--map-*` and the global space scale.** Delete the local redefinition of `--space-1` and the second set of map grays.
5. **Split the lesson out of `chrome.css`.** Header, skip link, view menu, and footer stay global. Cover, `.lesson`, `.diagram`, `.theme-gallery`, and global `pre` styling move to a stylesheet linked only with `fieldGuide`.
6. **Re-measure Drafting Grid and the route disc** after any palette edit. Do not trust the July contrast table in the design document; those ratios describe tokens that are gone (`--text-2` at 4.63:1 on `#FAFAF8`).

The map exception remains valid: marker, popup, and control colors that sit on the basemap should keep using `--map-*`, which do not flip per theme, until a dark Studio style exists and the theme script calls `setStyle`.

---

## 6. Backend and platform

**There is no application backend.** No database, no serverless functions, no authenticated API, no CMS. Content is git. HTML is the build artifact. That is a good fit for this site and it has consequences: anything “dynamic” (themes, map interaction, plain language) is client-side and must work when JavaScript fails; anything “secret” is a build-time env var; anything “personalized” does not exist.

### What does exist

| Piece | Role |
|---|---|
| Eleventy 2.0.1 | Templates, collections, pagination, sitemap. Node 20 on Netlify (`netlify.toml`). |
| `scripts/new.js` | Scaffolds from `_starters/` into `content/`. Refuses to overwrite. |
| `_data/mapbox.js` | Token from env or local JSON. Style and GL version `v3.9.0`. |
| `_data/analytics.js` | Off unless `ANALYTICS_PROVIDER` and `ANALYTICS_ID` are set. GoatCounter, Plausible, Cloudflare Web Analytics, Umami. Google Analytics is intentionally unsupported. |
| `sitemap.njk` | `/sitemap.xml` from `collections.all`. |
| `robots.txt` | Allow all. Points at `https://andean-road.com/sitemap.xml`. |
| `netlify.toml` | `npm run build`, publish `_site`, image cache headers, a trailing-slash redirect for `/places/:slug`, a functions directory that is not there, CORS for an API that is not there. |
| CI | None. No `.github/` workflows. Quality depends on the author running `npm run build`. |

### Build output that should not be public

Confirmed by a local production build of this commit:

- `WRITING.md` renders at `/WRITING/` with no layout (the authoring guide, including the `published` instructions and the 0,0 warning).
- Every `_starters/*.md` renders at `/_starters/<name>/` as an unstyled fragment. Eleventy does not treat a leading underscore as private. `_includes` and `_data` are special; `_starters` is just a directory of markdown.
- Both are in the sitemap. **15 starter URLs + `/WRITING/` are in the 68-URL sitemap**, alongside 13 `/templates/…` demos. A large minority of the indexable site is scaffolding.

`llms.txt` is not emitted (not a template, not a passthrough). Its API and bilingual claims would be wrong if it were.

`/templates/` is intentional (a live catalog). It should stay reachable to the author and should not have to dominate `sitemap.xml`. `eleventyExcludeFromCollections` or a `noindex` on starters, the writing guide, and possibly the template demos is the lever. The sitemap template currently includes every URL in `collections.all`.

### Sitemap dates

`lastmod` uses `page.date | isoDate`, not the `updated:` field authors maintain. Eleventy’s `page.date` is not that front-matter key. The editorial date and the sitemap date are different clocks.

### Content workflow

The intended loop in `WRITING.md` is real: `npm start`, `npm run new -- place "…"`, edit, flip a flag, preview. Starters are commented well. The flag name and the Chile index are the two places the loop lies. There is no preview auth. Drafts that set `published: false` still build at their own URL, which is what the docs want, and those URLs are still listed if the page is in `collections.all`. The places collection excludes `published: false` from maps and directories. The sitemap does not use that collection. A draft place page can be absent from the directory and present in the sitemap.

### Secrets

| Secret | Where it should live | In git? |
|---|---|---|
| Mapbox public token | Netlify env `MAPBOX_TOKEN`, or `_data/mapbox.local.json` | No. Example placeholder only. |
| Analytics id | `ANALYTICS_ID` / `ANALYTICS_HOST` | No. Empty unless the build env sets them. |
| Mapbox style | Hardcoded in `_data/mapbox.js` | Yes, by design. |

No `.env` is committed. `.gitignore` covers `.env`, `.env.local`, and `mapbox.local.json`.

### Analytics and privacy

The analytics design matches the “ships almost nothing” goal: cookieless vendors, `defer` / `async`, nothing rendered when unset. Mapbox GL’s call to `events.mapbox.com` is the exception, and it is hinted at by the preconnect on `/map/` only. If the privacy claim is going to stay absolute, telemetry needs to be turned off in both engines or named in the README.

### What “no backend” implies

- Search, accounts, comments, bookings, and personalization are out of scope unless a service is added on purpose.
- The Mapbox token will always be visible to readers. URL restrictions are the control, not secrecy.
- A content editor needs git, or a CMS in front of this repo. There is no admin UI. For a single author that is a feature.
- Availability is Netlify’s. There is no health check beyond “did the build exit 0,” and nothing runs that check on pull requests.
- The phantom `/api/*` CORS and `functions` key will confuse the next person who reads `llms.txt` and `netlify.toml` together and goes looking for a JSON API.

---

## 7. Point of view and priorities

I would treat this as a finished content platform wearing an unfinished design-system transplant.

The Chile model — one place, many projections, maps that degrade to links — is what I would want on a small editorial site. The Roadtrip chrome — themes that persist, a real header, diagrams that follow tokens — is a good reading system. They were merged at the stylesheet and the homepage, and the product decision was left implicit. Implicit is how you get a footer that calls a steak-order page “MapLibre Roadtrip 101.”

I would not keep both front doors. I would put the travel guide back at `/` and keep the lesson at `/learn/` as the specimen that justifies the themes. The tokens and the header should stay. The 1,500-line design document should not.

### Must-fix

These change what the public site is, or they are bugs with a concrete failure mode.

1. **Choose the homepage.** Recommended: move `pages/chile.njk` back to `/`, move the lesson to `/learn/`, point the logo at `/`, and rewrite the footer so it describes Andean Road. Update `site.json` description and the homepage `<title>` so Open Graph stops advertising the course as the whole site. If the course is the real product, do the inverse — and then stop calling `/chile/` the index in the README while the footer says otherwise.
2. **Stop publishing scaffolds.** Ignore `WRITING.md` and `_starters/` the way `README.md` is ignored (or set `permalink: false`). Confirm they disappear from `_site` and from `sitemap.xml`. This is a one-config-line fix with an outsized SEO effect. 16 of 68 sitemap URLs are this leak.
3. **Make the draft flag real.** Pick `published`. Teach `status` to the filter or remove `status` from the corpus. Add a build warning when a published place has coordinates `0, 0`. The Gulf of Guinea failure is already written down; the code does not check it.
4. **Fix route-number contrast.** Paint `.mk--seq` with `--route-ink` (or darken `--route-line`) so 13px white numerals clear 4.5:1. They are at 4.01:1 today.
5. **Give `/map/` the same engine guarantees as the layouts.** Restore `role="button"` after `addTo`, and collapse on 401/403. Better: feed the directory through `andean-map.js` so the second inline script can die. Until then, every map bug has to be fixed twice.
6. **Retire the current `DESIGN-SYSTEM.md` as an implementation guide.** A four-line banner over a spec that contradicts the CSS is how the next visual PR regresses. Replace it with the live tokens, or move it to archive in the same change that updates the README’s `--gray-*` rule.

### This quarter

- Split `chrome.css`: global header vs lesson-only CSS. Link the lesson sheet only when `fieldGuide` is set.
- Decide the fonts. Load the woff2 files or delete ~570KB of unused passthrough.
- Delete token aliases after `main.css` uses canonical names. Point `.dirmap` map colors at `--map-*`.
- Generate `/chile/` (or the restored homepage) from `regions` and `place-entry.njk`. Delete the hard-coded region buckets.
- Drive map category color from data (`regions.json` / `placeIcons.json`) instead of a slug list in CSS.
- Exclude `/templates/` from the sitemap or mark those pages `noindex`. Keep them on the site for the author.
- Use `updated` for sitemap `lastmod`.
- Add a GitHub Action that runs `npm run build`. That single check would have caught the starter leak.
- Add the security headers you actually want (a basic CSP that allows `api.mapbox.com` and the chosen analytics host, `X-Frame-Options` or `frame-ancestors`, `Referrer-Policy`). Remove the unused `functions` key and the `/api/*` CORS block until an API exists.
- Document or disable Mapbox telemetry so the privacy section stays true.
- Honor `prefers-color-scheme: dark` as Night Sky when no theme is stored.
- One list of themes, rendered into the header select, so a new theme cannot be CSS-only.

### Later

- Eleventy 3, to leave the deprecated `glob@7` / `inflight` tree.
- Photography and real `og:image`. Until then, stop emitting `og:image` when the file is missing.
- A Mapbox style with place and road labels. The README is right that route and neighborhood maps are weaker without them.
- Real route geometry. Dashed point-to-point lines are an honest placeholder; they should stay dashed until Directions geometry exists.
- A dark basemap, then let `--map-*` follow theme.
- A tiny test around `published`, `bySlugs`, and the date filters. Those are the bugs the project has already had.
- Spanish, only if it is actually a goal. Delete the claim from `llms.txt` until then.
- If the lesson grows past one page, extract it. Inlining a second product worked once. It will not work as a series.

### Nice-to-have

- `map-stack` in `scripts/new.js`.
- Region camera hints in `_data/regions.json` actually used as map `center` / `zoom`.
- Audience `color` either applied or removed.
- Logo recolored with `currentColor`, or an explicit decision that the badge stays light in every theme.
- Touch targets on `.mapctl` brought up to the 44px the directory notes already argue for.

### What I would not do

- I would not rewrite the 17 layouts before the homepage and the design document are decided. The layouts are fine.
- I would not introduce a bundler, a component framework, or a CMS for 19 places.
- I would not theme the Mapbox canvas by inverting it with CSS. Wait for a real dark style.
- I would not merge the categorical map palette into the reading themes. Hue-on-the-map and atmosphere-on-the-page is the one boundary the port got right. Keep `--map-*` independent.

---

## Appendix — inventory

| | Count |
|---|---|
| Places | 19 |
| Guides | 4 |
| Practical pages | 5 |
| Layouts | 17 (base + 7 writing + 6 map + place, guide, practical) |
| Template demos | 13, public at `/templates/` |
| Starter files published by the build | 15 |
| Regions / audiences | 6 / 3 |
| Sitemap URLs | 68 |
| CSS | `tokens.css` 243 lines, `chrome.css` 738, `map-tokens.css` 77, `map-layouts.css` 485, `main.css` 1,762 |
| JS | `view.js` 118 lines, `andean-map.js` 384, plus ~170 lines inline in `map.njk` |
| Tests, CI workflows, serverless functions | 0 |

**Reading order for a stakeholder who will not open the repo:** §1 for the decision, §7 for the sequence, §4 if the question is “does this look like one product,” §6 if the question is “what runs in production.”
