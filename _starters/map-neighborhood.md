---
# NEIGHBORHOOD — one walkable area at close zoom. Pins carry category, a legend
# decodes them, and the list on the right repeats the same colours.
layout: layouts/map-neighborhood.njk
title: "__TITLE__"
subtitle: ""
overline: Neighborhood guide
zoom: 15
categories:                    # five or six max, or the map becomes confetti
  - key: restaurant
    label: Eat
  - key: bar
    label: Drink
places: []                     # slugs — they must actually be in one area,
                               # or the map zooms out and the page loses its point
---

Optional intro — it renders below the list so the places stay above the fold.
