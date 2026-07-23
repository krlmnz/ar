---
# ITINERARY — a numbered sequence. Days, stops, steps.
layout: layouts/itinerary.njk
title: "__TITLE__"
subtitle: ""                   # one sentence — it is the meta description and the search-index summary; write it as the answer to "why go?"
overline: Itinerary
steps:
  - overline: Day 01 · Friday  # optional label
    title: ""                  # required
    body: ""                   # optional
    place: ""                  # optional — a slug from content/places/
updated: __DATE__              # UNQUOTED — a quoted date breaks the build
---

The markdown here is the introduction. The sequence comes from front matter.
