# Writing a page

This file is for you. It is not published.

```bash
npm run new -- <kind> "Title"
```

Kinds: `guide`, `reference`, `center`, `dispatch`, `place`, `practical`, `faq`, `gallery`, `itinerary`, `route`, `story`, `browse`.

The command writes a markdown file with the layout set and `published: false`. Open it, replace the sample sentences, and preview with `npm start`. Nothing lists the page, and the sitemap skips it, until you change that line to `published: true`.

## What each template expects

The body is markdown. Layouts read headings, lists, quotes, and images. You should not need a `<div>` in a post.

- **guide** — each `##` is a section in the left rail. `## Title (#id)` sets the link. `cover: true` adds the poster header.
- **reference** — `##`, `###`, a `>` quote, a list. No sidebar.
- **center** — a title and a few paragraphs.
- **dispatch** — `overline`, `subtitle` (the standfirst), `byline`. The first paragraph is the lead.
- **place** — `type`, `region`, `coordinates`, and the optional facts in the starter. A pin appears when the coordinates are real.
- **practical** — a "You'll need" list, then a numbered list. A blockquote becomes the tip.
- **faq** — each `##` is a question.
- **gallery** — an image on its own line, then an italic caption.
- **itinerary** — `## Day 1 — Title`. A line that says `place: slug` links a published place.
- **route** — `stops` in the front matter (a place slug, or a title with `lng` and `lat`). The markdown is the intro under the map.
- **story** — advanced. `steps` carry the text and the camera (`lng`, `lat`, `zoom`, `pitch`, `bearing`).
- **browse** — `source: places` or `source: demos`, or a `cards` list. `showMap: true` puts places beside a map.

## Page theme

Add `theme:` to the front matter when a page should open in a particular atmosphere. Ids: `light` (Light / Minimal), `night`, `note`, `signal`, `news`, `draft`. Leave it out to use the site default, which is Light / Minimal.

On the first visit — when `roadtrip-theme` is not in `localStorage` — the page theme is applied before paint. If the visitor has already chosen a theme in Customize view, that choice stays. The view menu then offers **Reset to page theme**, which clears the saved preference and returns to this page's theme.

## Places

```bash
npm run new -- place "Termas de Chillán"
```

That writes `content/places/<slug>/index.md`. Fill in `type`, `region`, and real coordinates before you publish. `0,0` is treated as unfinished and kept off every map.

Regions live in `_data/regions.json`. Tags live in `_data/tagInfo.json`. Icons for place types live in `_data/placeIcons.json`.

## Demos

`/editor/templates/<kind>/` is the private gallery's example of each template, not a folder you add posts to. Your pages go in `content/` and publish at `/<slug>/`, or under `/places/<slug>/`. Open any repo file in the studio — including drafts — by pasting its path.
