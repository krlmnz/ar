# Writing for Andean Road

Everything on this site is a markdown file. You never touch a template.

## The loop

```bash
npm start                                   # dev server, live reload
npm run new -- place "Termas de Chillán"    # scaffold a file
```

Then edit the file, watch it in the browser, and flip `published: true` when
it's ready.

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

Flip to `true` when you're ready. **This matters more than it looks:** an
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
