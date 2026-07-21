# Writing for Andean Road

Everything on this site is a markdown file. You never touch a template.

## The loop

```bash
npm start                                   # dev server, live reload
npm run new -- place "Termas de Chillán"    # scaffold a file
```

Then edit the file, watch it in the browser, and delete the `published: false`
line when it's ready.

## Scaffolding

`npm run new -- <kind> "<Title>"` creates the file in the right folder, with a
slug, today's date, and the front matter that layout actually reads. Every field
is commented. It never overwrites.

| Kind | Makes | Use it for |
|---|---|---|
| `place` | `content/places/<slug>/index.md` | Somewhere you'd send a friend |
| `guide` | `content/guides/<slug>.md` | A multi-day itinerary |
| `practical` | `content/practical/<slug>.md` | Money, driving, language |
| `article` | `content/<slug>.md` | An essay, read once |
| `manual` | `content/<slug>.md` | Long reference people return to |
| `itinerary` | `content/<slug>.md` | A numbered sequence |
| `faq` | `content/<slug>.md` | Questions and answers |
| `reference` | `content/<slug>.md` | A table of facts |
| `gallery` | `content/<slug>.md` | Photographs |
| `simple` | `content/<slug>.md` | About, colophon, thanks |
| `story` | `content/<slug>.md` | Scrollytelling over a map |
| `route` | `content/<slug>.md` | A road trip with a drawn line |
| `neighborhood` | `content/<slug>.md` | One walkable area |
| `area` | `content/<slug>.md` | Several regions compared |
| `browse` | `content/<slug>.md` | Map + list finder |

Starters live in `_starters/` — edit those to change what every new file gets.

## Places are the spine

A place is the only content type other things point at. Add one and it appears
in the directory, on every map, and in its region, tag and audience pages —
no other file needs editing.

Guides, routes, neighbourhood and area pages all reference places **by slug**.
They never copy coordinates. Change a place's location once and every map
follows.

```yaml
stops:
  - place: casa-del-bosque    # the slug, not the name
```

If a slug doesn't match anything, the reference is quietly skipped — no broken
link, no failed build. So check your spelling.

## Publishing

New places, guides and practical pages start at `published: false`. That keeps
them out of the directory and off every map while you write, but the page still
builds so you can preview it at its own URL.

Delete the line when you're ready. **This matters more than it looks:** an
unedited place still has `0,0` coordinates, and a published one would stretch
every map on the site from Chile to the Gulf of Guinea.

## Rules that will bite you

**Dates go unquoted.** `updated: 2026-07-21`, never `"2026-07-21"`. YAML hands
a quoted date to the template as a string and the build fails.

**Coordinates:** right-click the spot in Google Maps, copy the two numbers. Chile
is negative on both axes — `lat: -33.4489`, `lng: -70.6693`.

**Subtitles do the selling.** They appear on cards, in map popups, and in search
results. Not "a restaurant in Bellavista" but the reason to go.

**A neighbourhood page must actually be a neighbourhood.** The map frames
whatever you give it, so one out-of-town slug pulls the camera back to regional
scale and the page stops meaning anything.

**New place type?** Add it to `_data/placeIcons.json` or it falls back to a
generic pin. New region? `_data/regions.json`. New tag? `_data/tagInfo.json`.

**Every heading gets a linkable anchor.** Write them as things a reader would
scan for — they become navigation, and on `manual` pages they become the
contents rail.

## Front matter that's optional everywhere

Only `layout` and `title` are ever required (places also need `slug`, `type`,
`region` and `coordinates`). Everything else disappears cleanly when omitted —
a half-filled page never renders an empty heading or a stray rule. Delete the
fields you don't need rather than leaving them blank.

## Seeing your options

`/templates/` lists every layout with a live example. Each one documents its own
front matter on the page.

## Writing for discovery (humans, Google, and AIs read the same page)

None of this is SEO homework. The same page serves a friend skimming on a
phone, a search crawler, and a language model quoting you — write once, well.

**The first paragraph is the answer.** Everything before the first `##` is
what the feed, the search index and `llms.txt` extract. Make it standalone:
someone who reads only that paragraph should know what this is and whether
to go.

**Subtitle and description are one sentence, and they work hard.** Each is
the meta description, the search-index summary, and the card copy all at
once. Write it as the answer to "why go?" — not "a winery in Casablanca"
but the reason to drive there.

**Front-matter facts are writing, not admin.** `cost_level`, `time_from`,
`reservations`, `best_for` render as the Key facts block and as structured
data machines can quote. An empty field is an answer you didn't give.

**One draft flag.** `published: false` is the whole system. Absence means
published — don't add `published: true`, it's noise.

**Move `updated:` when the content moves.** It drives sitemap lastmod, the
feed, and link previews. A stale date tells everyone — readers and crawlers
alike — that the page can be ignored. Unquoted, always.

**A `cover.jpg` next to the file lights up the social card.** No wiring, no
build step — the image existing is the switch.

**Headings are anchor targets.** Every `##` becomes a link someone can send.
Name them like the question a reader would ask — "Getting there", "Skip if" —
not clever labels they'd have to decode.
