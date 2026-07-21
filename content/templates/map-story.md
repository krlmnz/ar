---
layout: layouts/map-story.njk
order: 11
title: The Potters of Pomaire
overline: Scrollytelling
subtitle: A clay town an hour from Santiago, and the women who kept its craft alive.
summary: Immersive scrollytelling — the map flies as the reader scrolls the story.
steps:
  - id: valley
    title: An hour west of the capital
    body: Pomaire sits in a fold of the coastal range, close enough to Santiago for a day trip and far enough that the clay stayed local. The earth here is the reason the town exists.
    lng: -71.1667
    lat: -33.6417
    zoom: 10
  - id: town
    title: One street, forty workshops
    body: Almost every house on the main street opens onto a workshop. The greixa clay is dug nearby, wedged by hand, and thrown on kick wheels that predate electricity in the town.
    place: pomaire
    zoom: 14.5
    pitch: 45
  - id: kiln
    title: Wood-fired, still
    body: Gas kilns arrived and mostly lost. Wood firing gives the surface its particular warmth — and the three-legged pig its colour.
    lng: -71.1690
    lat: -33.6402
    zoom: 16
    pitch: 60
    bearing: -30
  - id: market
    title: Where it goes
    body: Most of what is thrown here ends up in Santiago kitchens. The pastelera bowls in half the restaurants in the city were made within a few blocks of each other.
    place: plaza-los-dominicos
    zoom: 13
---

Scrollytelling suits a story with **places in sequence** — a journey, a craft
tradition, a history that moved across a landscape. The map holds still while the
text moves past it, then relocates when the story does.

Each step can set its own `zoom`, `pitch` and `bearing`, so the camera can tilt
into a valley for one beat and pull back to a regional view for the next.

Watch the top of the zoom range. This basemap is drawn for orientation, not for
street detail — past about **zoom 16** it runs out of things to render and the
step lands on an empty field. Pitch buys drama more cheaply than zoom does.
