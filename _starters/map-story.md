---
# STORY — scrollytelling. The map holds still while the text scrolls past it,
# then moves when the story does. For a journey, a craft, a history.
layout: layouts/map-story.njk
title: "__TITLE__"
subtitle: ""                   # one sentence — it is the meta description and the search-index summary; write it as the answer to "why go?"
overline: ""
steps:
  - id: opening
    title: ""
    body: ""
    lng: -70.6693              # either coordinates…
    lat: -33.4489
    zoom: 10
  - id: closer
    title: ""
    body: ""
    place: pomaire             # …or a place slug, which supplies them
    zoom: 15
    pitch: 45                  # 0-60. Pitch buys drama more cheaply than zoom.
    bearing: -30
updated: __DATE__              # UNQUOTED — a quoted date breaks the build
---

Optional closing prose renders under the story.

Keep zoom at 16 or below — this basemap is drawn for orientation, not street
detail, and past that a step lands on an empty field.
