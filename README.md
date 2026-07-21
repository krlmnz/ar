# Andean Road

A personal travel guide to Chile — by someone born there and raised in New York.

Static site built with [Eleventy](https://www.11ty.dev/). No framework, no
bundler, no client-side JavaScript except a theme toggle and the map pages.

```bash
npm install
cp _data/mapbox.example.json _data/mapbox.local.json   # then paste your token
npm start        # dev server with live reload
npm run build    # writes _site/
```

The Mapbox token is **not committed**. Supply it as `MAPBOX_TOKEN` in the
environment (Netlify: Site settings → Environment) or in the gitignored
`_data/mapbox.local.json`. Without one the site still builds — map pages render
their text and place lists and the map surface collapses.

## How it's put together

```
content/          markdown — places, guides, practical, template demos
  places/<slug>/index.md    one folder per place, front matter carries coordinates
_data/            site config, taxonomies, map credentials, type→icon map
_includes/
  layouts/        one file per page type (see Templates below)
  partials/       masthead, breadcrumbs, map shell, sprites
pages/            index pages and paginated taxonomy routes
assets/           self-hosted fonts, CSS, the map engine
DESIGN-SYSTEM.md  the reference — read this before changing anything visual
```

Everything is data-driven from `content/`. Add a place and it appears in the
directory, on the maps, in its region and tag pages, and in the sitemap without
touching a template.

## Templates

Thirteen layouts. Pick one, set `layout:` in your front matter, write markdown.
Live index at `/templates/` — each demo page documents its own fields.

**For writing** — `article` · `itinerary` · `faq` · `reference` · `gallery` ·
`simple` · `manual`

**For maps** — `map-split` · `map-stack` · `map-story` · `map-route` ·
`map-neighborhood` · `map-area`

Only `layout` and `title` are ever required; every other field is optional and
its markup disappears when omitted.

## Conventions worth knowing

- **Never use a `--gray-*`, `--white` or `--black` primitive for `color` or
  `background`.** Primitives don't flip between themes; only the semantic tokens
  (`--text`, `--bg`, `--surface`, `--border`…) have dark-mode values. Map chrome
  is the deliberate exception — it's keyed to the basemap, not the page.
- **Icons** come from `@phosphor-icons/core` via the `{% icon %}` shortcode —
  `{% icon "map-pin", weight="fill", size=24 %}`. Nothing to download; a bad
  name fails the build rather than rendering a gap.
- **Dates in front matter must be unquoted.** `updated: 2026-07-21`, not
  `"2026-07-21"`.
- **Maps read place coordinates from the place files.** A map page lists slugs;
  it never holds its own copy of the data.

## Maps

`assets/js/andean-map.js` is one engine behind all six map layouts, with three
modes: `pins`, `route`, `story`. Layouts emit a JSON config block and call
nothing.

The token is a public `pk.` token — it ships to the browser by design — but it
is kept out of git (see `_data/mapbox.js`) and should carry **URL restrictions**
in the Mapbox account:

```
andean-road.com
andean-road.netlify.app
localhost
```

Mapbox supports **no wildcards**, but subdomains of an allowed URL are allowed
automatically — so `andean-road.com` already covers `www.`. Netlify deploy
previews (`deploy-preview-1--andean-road.netlify.app`) use `--`, which makes
them siblings of `netlify.app` rather than subdomains of the site, so no entry
covers them short of allowing every site on Netlify. Preview maps therefore
fail; the engine catches the 401 and collapses the map surface, leaving the
page's text and place links intact. Add the specific preview host, or set a
separate `MAPBOX_TOKEN` on the deploy-preview context, if you need them live.

## Analytics

Off unless configured. Set these in the build environment (Netlify: Site
configuration → Environment variables) and it switches on at the next build:

```
ANALYTICS_PROVIDER=goatcounter    ANALYTICS_ID=andean-road
ANALYTICS_PROVIDER=plausible      ANALYTICS_ID=andean-road.com
ANALYTICS_PROVIDER=cloudflare     ANALYTICS_ID=<beacon token>
ANALYTICS_PROVIDER=umami          ANALYTICS_ID=<id>  ANALYTICS_HOST=<host>
```

All four are **cookieless and store no personal data**, so the site needs no
consent banner. Google Analytics is deliberately unsupported: it sets cookies,
requires a banner in the EU/UK, and ships ~50KB to a site whose whole point is
that it ships almost nothing.

See `_data/analytics.js` and `_includes/partials/analytics.njk`.

## Writing

See **[WRITING.md](WRITING.md)**. Short version:

```bash
npm run new -- place "Termas de Chillán"
```

Scaffolds the file with commented front matter. New places start as
`published: false` so an unfinished draft can't leak onto the maps.

## Known gaps

- The Mapbox style has no settlement, place or road labels. Route and
  neighbourhood maps would read much better with them.
- No photography yet. Place front matter declares `cover:` but no images exist,
  so `og:image` is inert and the gallery template renders placeholders.
- `site.url` is `https://andean-road.com` — canonicals and the sitemap assume it.
