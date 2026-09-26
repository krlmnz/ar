# Andean Road

A starter for designed pages. Pick a template, write ordinary markdown, and the page already looks like it belongs here.

Twelve layouts share one design system: tokens, six themes, the header, Customize, focus, and reduced motion. What changes from template to template is the structure — a contents rail, a centered column, a timeline, a map — not a new brand.

```bash
npm install
cp _data/mapbox.example.json _data/mapbox.local.json   # then paste your token
npm start        # dev server with live reload
npm run build    # writes _site/
npm run new -- place "Termas de Chillán"
```

The Mapbox token is **not committed**. Supply it as `MAPBOX_TOKEN` (Netlify: Site settings → Environment) or in the gitignored `_data/mapbox.local.json`. Without one the site still builds. Map pages keep their text and lists, and the map surface collapses.

## Where things are

```
/                 hub — the template gallery, and a card for every demo
/templates/       the twelve layouts: when to use one, and the command that creates it
/demo/<kind>/     one short demo of each template
/places/          published places, on a map
content/          your pages. Places live in content/places/<slug>/index.md
_starters/        scaffolds for `npm run new`. Never published.
_includes/layouts one Nunjucks layout per template
assets/           CSS, the shared map engine, fonts
```

## The twelve templates

| Kind | Use it for |
| --- | --- |
| `guide` | A long explainer. Contents rail from headings, optional cover. |
| `reference` | An essay. No sidebar — type, space, quotes, lists. |
| `center` | The short page. Title and a calm column. |
| `dispatch` | A magazine article. Overline, standfirst, byline, a larger lead. |
| `place` | A destination. Facts, a map pin, short sections. |
| `practical` | A checklist. Numbered steps, a tip, what you need. |
| `faq` | Questions as headings. |
| `gallery` | Images and captions. |
| `itinerary` | Day by day. `## Day 1 — Title` becomes a timeline. |
| `route` | A map and ordered stops. |
| `story` | Advanced. A scrolly map; each step has text and a camera. |
| `browse` | A hub of cards. With places, a split index beside a map. |

```bash
npm run new -- guide "A map is a sentence"
```

New pages start as `published: false`. The page still builds, so you can preview it, and it stays out of listings, maps, and the sitemap until you set `published: true`.

Two sample places ship with the starter so the route, story, and places map have something to point at. They are marked sample. Delete them when you add your own.

## Drafts, starters, and the sitemap

- `published: false` sets `noindex` and removes the page from collections. The URL still exists for preview.
- Coordinates left at `0,0` are kept off every map.
- `_starters/` and `WRITING.md` are ignored by the build. They do not appear in `_site` or the sitemap.

## Conventions

- **Never use a `--gray-*`, `--white`, or `--black` primitive for `color` or `background`.** Primitives don't flip between themes. Use the semantic tokens (`--text`, `--bg`, `--surface`, `--border`). Map chrome is the exception — it is keyed to the basemap, not the page.
- **Icons** come from `@phosphor-icons/core` via `{% icon "map-pin", weight="fill", size=24 %}`. A bad name fails the build.
- **Dates in front matter must be unquoted.** `updated: 2026-07-21`, not `"2026-07-21"`.
- **Explicit heading ids:** `## The land (#land)`
- **Maps read place coordinates from the place files.** A route or story lists slugs, or a title plus `lng` / `lat` when there is no page yet.

## Map atelier

A separate tool at `/atelier/` for sketching a map: add places, pick a palette, copy a guest link or an iframe. It does not use the writing studio at `/editor/`, and it does not need a Mapbox token.

```bash
npm start
# http://localhost:8080/atelier/
```

The basemap is OpenFreeMap Liberty (OpenMapTiles / OpenStreetMap), so it runs without a key. Search and click-to-add names use the public Photon geocoder. Limits and the MapTiler swap path are in `assets/atelier/js/config.mjs`. A shared map is `/atelier/guest/#v=…` — the hash is the document, and there is no backend.

## Maps

`assets/js/andean-map.js` is the engine behind place pins, routes, stories, and the places index. Layouts emit a JSON config and call nothing. Modes are `pins`, `route`, and `story`.

The token is a public `pk.` token. It ships to the browser by design, stays out of git, and should carry URL restrictions in the Mapbox account:

```
andean-road.com
andean-road.netlify.app
localhost
```

Mapbox supports no wildcards. Netlify deploy previews are siblings of `netlify.app`, not subdomains of the site, so they are not covered. The engine catches a rejected token and collapses the map, leaving the text and the links.

## Analytics

Off unless configured. Set these in the build environment:

```
ANALYTICS_PROVIDER=goatcounter    ANALYTICS_ID=andean-road
ANALYTICS_PROVIDER=plausible      ANALYTICS_ID=andean-road.com
ANALYTICS_PROVIDER=cloudflare     ANALYTICS_ID=<beacon token>
ANALYTICS_PROVIDER=umami          ANALYTICS_ID=<id>  ANALYTICS_HOST=<host>
```

All four are cookieless. See `_data/analytics.js`.

## Writing

See [WRITING.md](WRITING.md). It is a local note for authors. It is not part of the site.

A page can set `theme:` (`light`, `night`, `note`, `signal`, `news`, `draft`) so first-time visitors land in that atmosphere. A saved Customize view preference still wins; **Reset to page theme** clears it. See WRITING.md.

The writing studio lives at `/editor/` on this same site. It asks for the studio code once and remembers the browser with a cookie. Two templates are in use: field guide (left contents rail) and essay (one column). Their previews live under `/editor/templates/` — private, noindexed, and out of the sitemap. Create draft saves on the site. Publish shows the post at `/notes/<slug>/` and on the home page. Set `GITHUB_TOKEN` (contents: write) on the Netlify site when a save should also commit into the repo.
