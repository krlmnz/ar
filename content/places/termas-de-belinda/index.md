---
# PLACE — somewhere you'd send a friend. Appears in the directory, on every
# map, and in its region/tag/audience pages automatically.
#
# Required: title, slug, type, subtitle, region, coordinates
# DRAFT. While this is false the place is kept out of the directory, every
# map, and all region/tag pages — but the page itself still builds so you can
# preview it. Flip to true (or delete the line) to publish.
#
# This matters: an unedited place with 0,0 coordinates would otherwise stretch
# every map on the site from Chile to the Gulf of Guinea.
published: false

title: "Termas de Belinda"
slug: termas-de-belinda

# One of: restaurant, bar, winery, museum, cultural-center, hotel, hot-springs,
# volcano, national-park, town, market. Drives the icon on every map.
# Adding a new type? Add it to _data/placeIcons.json too.
type: restaurant

# One sentence. This is what shows on cards and in map popups — make it earn
# the click. Not "a restaurant in Santiago" but what makes it worth going.
subtitle: ""

# One of: santiago, casablanca-valley, central-coast, central-mountains,
# lake-district, pomaire. New region? Add it to _data/regions.json.
region: santiago

# Right-click the spot in Google Maps and copy the numbers.
coordinates:
  lat: 0.0000
  lng: 0.0000

google_maps: ""

# ── Everything below is optional. Delete what you don't use. ──────────────

audience: [savor]              # savor · family · thrill
best_for: ""                   # "Anyone who…"
tags: []                       # see _data/tagInfo.json — drives /tags/<tag>/
cost_level: moderate           # budget · moderate · expensive
reservations: none             # none · recommended · required
duration: half-day             # quick-stop · half-day · full-day
time_from:
  santiago: ""                 # "1.5 hours"
bring: []                      # swimsuit, cash, ID…
tip: ""                        # the thing only a local would tell you

spanish:
  useful_phrases:
    - phrase: ""
      meaning: ""

related: []                    # slugs of other places
seo:
  title: ""
  description: ""
updated: 2026-07-21              # leave UNQUOTED — a quoted date breaks the build
---

Open with why this place is worth the trip. Write it like a text to a friend,
not a listing.

## What to expect

What actually happens when you arrive.

## Pro tips

The specific, useful thing. Best time, what to order, where to park.

## Skip if

Be honest about who shouldn't bother.
