# CLAUDE.md — Andean Road

Eleventy static site. No framework, no bundler. Pivot in progress: the site now leads with the Map Atelier (self-service map editor).

## Read first
- `_plans/` — the pivot plan. `04-SPRINT-PLAN.md` is the backlog; `06-CLAUDE-CODE-BRIEFS.md` has per-task briefs.
- `DESIGN-SYSTEM.md` — before touching anything visual.
- `WRITING.md` — before touching content or front matter.

## Commands
```bash
npm start          # dev server, live reload
npm run build      # writes _site/
npm run new -- <kind> "<Title>"   # scaffold content
```

## Hard rules
- Andean tokens only (`--color-*`, `--font-*`, `--space-*`, `--radius-*`, `--elevation-*`, `--duration-*`/`--ease-*`) — never raw hex in UI chrome. Map chrome (the `[data-map-theme]` axis) and data/content palettes are the exceptions.
- Dates in front matter unquoted: `updated: 2026-07-22`.
- Maps read coordinates from place files — never copy coordinates into a map page.
- `taxonomy.yml` is the single source of truth for facets. A new tag goes there first.
- Icons via `{% icon %}` shortcode (@phosphor-icons/core). Bad names fail the build — good.
- Draft flag is `published: false`; absence means published. Never write `published: true`.
- Never break a shipped URL — add a 301 in `netlify.toml` when moving anything.
- One brand: Andean Road. The editor is "the Atelier". "Hue & Vow" may only appear in wedding-segment content.

## Branch & deploy
Work on `feat/engine-tokens` (current). Netlify builds `main` with `npm run tokens:check && npm run build` — `tokens:check` now guards `assets/css/andean.css` (light/dark parity + contrast regression); a failing check fails the deploy.
