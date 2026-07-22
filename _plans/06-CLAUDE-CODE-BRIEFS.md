# Claude Code Briefs — Sprints 1–3 (repo work)

One brief = one Claude Code session = one commit. Paste the prompt, review the diff, run the check, commit. Don't batch briefs — small diffs keep you in control.

**Every session starts with:** `Read CLAUDE.md and _plans/06-CLAUDE-CODE-BRIEFS.md, then do brief <N>.`

---

## Sprint 1 — Spine

### 1.2 Global nav + editor button
**Prompt:** Rework `_includes/partials/header.njk`: links Create (`/atelier/`) · Learn (`/learn/`) · Tools (`/tools/`) · Places (`/places/`), plus a visually distinct button "Open the editor →" → `/atelier/editor/`. Move the Templates link into `_includes/partials/footer.njk`. Style the button in `assets/css/main.css` with semantic tokens; on mobile the button stays visible, links collapse.
**Check:** `npm start` → button on every page incl. phone width; dark mode; no primitive tokens.

### 1.3 Landing layout + /atelier/ page
**Prompt:** Create `_includes/layouts/landing.njk` (extends base: hero → demo slot → 3 capability blocks → forgiveness link → final CTA + email placeholder; every block optional). Create `pages/atelier.njk` at `/atelier/` using it — copy skeleton per `_plans/02`, section "Product landing". Add `SoftwareApplication` JSON-LD.
**Check:** `/atelier/` builds, one primary CTA repeated, Rich Results test passes.

### 1.4 Move the app to /atelier/editor/
**Prompt:** Today `tools-apps/map-atelier/` is copied as-is (see `.eleventy.js` passthrough and `/tools/map-atelier/` listing on `pages/templates.njk`). Serve the app at `/atelier/editor/` instead. Add 301s in `netlify.toml`: `/tools/map-atelier/*` → `/atelier/editor/:splat`. Update every internal link (grep `map-atelier`).
**Check:** `npm run build` → `_site/atelier/editor/editor.html` exists (or index.html — keep the app's relative paths working); old URL redirects on the deploy preview.

### 1.5 Neutralize editor copy
**Prompt:** In `tools-apps/map-atelier/`: retitle `editor.html` (and `guest.html`, `preview.html`) to "Map Atelier — Andean Road". Replace wedding placeholders ("Camila & Tomás", "sí, acepto"…) in HTML and `js/features/*.js` with neutral map-story copy. Keep wedding strings only where they define a selectable preset/template.
**Check:** `grep -ri "vow\|acepto\|guests" tools-apps/map-atelier` → only preset definitions remain.

### 1.6 Content-type plumbing
**Prompt:** Add starters `_starters/how-to.md`, `topic.md`, `build-story.md`, `landing.md` with front matter per `_plans/02` (`section`, `track`, `tool`, `task`, `time`, `cta`). Wire kinds into `scripts/new.js`. Create `content/learn/` with directory data files setting `section`/`track` per subfolder (`editor/`, `cartography/`, `notes/`).
**Check:** `npm run new -- how-to "Test"` scaffolds into `content/learn/editor/` and builds.

### 1.7 Analytics events
**Prompt:** Analytics is off-until-configured (`_data/analytics.js`). Add a tiny event helper (works with GoatCounter or Plausible, no-ops when analytics off) and fire: `editor_open` (editor page load), `map_share` (share success in `js/features/share.js`), `tool_open` (tool page load), `email_signup` (form submit). No cookies.
**Check:** with provider env vars set locally, events appear in the dashboard; without them, zero console errors.

---

## Sprint 2 — Learn

### 2.1 Learn hub
**Prompt:** Create `pages/learn.njk` at `/learn/`: two-door fork ("Make a map" → editor how-tos · "Understand maps" → cartography topics), then lists filtered by `track` from collections. Breadcrumbs root: Learn.
**Check:** hub renders both tracks; empty track shows nothing, not an empty heading.

### 2.2 How-to layout
**Prompt:** Create a how-to presentation based on `manual.njk`: outcome paragraph → "Before you start" line → numbered steps → "Try it" CTA from front matter → max-2 related links. Add `HowTo` JSON-LD from the step headings.
**Check:** scaffold one how-to, validate JSON-LD, cold-load it — makes sense with zero context.

### 2.3 Move cartographic-design under /learn/
**Prompt:** Move `content/guides/cartographic-design.md` → `content/learn/cartography/`, keep `published: false` (essay is being rewritten), add 301 from `/guides/cartographic-design/`.
**Check:** build clean; redirect present; page absent from hubs and sitemap.

*(How-to content 2.2–2.7 is writing work — do in Cowork, then a Claude Code session lands the files.)*

---

## Sprint 3 — Tools

### 3.1 Tools hub
**Prompt:** Create `pages/tools.njk` at `/tools/` listing public tools only: Color Scales, SVG Editor, Chromatlas, Internet Loom, Spatial Autocorrelation (data table like the one in `pages/templates.njk` — move it out, one "why" line each; Map Atelier lives at `/atelier/`, not here). Strip the tools section from `pages/templates.njk`.
**Check:** `/tools/` renders; `/templates/` shows layouts only.

### 3.2 Re-root tool breadcrumbs
**Prompt:** Every `pages/tools/*.njk` sets `crumbs` to Templates — change root to Tools (`/tools/`).
**Check:** grep confirms no tool page crumbs point at `/templates/`.

### 3.3 De-noindex + schema + llms.txt
**Prompt:** For each tool page passing the quality bar (`_plans/03`), remove `noindex: true`, add `SoftwareApplication` JSON-LD (name, description, url, free). Extend `llms.njk` with Atelier, Tools, and Learn sections.
**Check:** Rich Results test per page; built `llms.txt` lists the new URLs; sitemap includes tools.

### 3.4 SVG editor entry point
**Prompt:** Serve `tools-apps/svg-editor/` at `/tools/svg-editor/`. Give it a minimal entry header (title, one-line what-it-does, link to its build story at `/learn/notes/` — placeholder until written).
**Check:** loads at `/tools/svg-editor/`, listed on the hub.

---

## Session hygiene
- One brief per session; commit message = brief number + outcome.
- If a brief forces a DESIGN-SYSTEM or taxonomy change, stop and surface it — don't improvise.
- After each sprint: run the sprint DoD in `_plans/04`, then and only then start the next.
