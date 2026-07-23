---
# ROUTE — a planned trip. Draws a dashed line through the stops in order with
# numbered markers matching the itinerary below.
layout: layouts/map-route.njk
title: "__TITLE__"
subtitle: ""                   # one sentence — it is the meta description and the search-index summary; write it as the answer to "why go?"
overline: Road trip
distance: ""                   # "920 km" — shown in the badge on the map
days: ""                       # "5 days"
stops:
  - place: ambrosia-bistro     # a slug from content/places/
    day: "Day 01 · Santiago"
    note: ""
updated: __DATE__              # UNQUOTED — a quoted date breaks the build
---

The line is straight segments between stops — stop order, not driving geometry.
That's why it's dashed. Swap in real Directions output before claiming otherwise.
