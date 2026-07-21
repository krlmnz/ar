---
layout: layouts/itinerary.njk
order: 2
title: Itinerary
overline: Page template
subtitle: A numbered sequence — days on a trip, stops on a route, steps in a process.
summary: Timeline — numbered stops on a connected rail, each linkable to a place.
steps:
  - overline: Day 01 · Friday
    title: Land and eat
    body: Drop bags, then straight to lunch. Don't nap — you'll lose the day.
    place: ambrosia-bistro
  - overline: Day 02 · Saturday
    title: Wine country
    body: Head west before the traffic. Two vineyards is plenty; three is a chore.
    place: casa-del-bosque
  - overline: Day 03 · Sunday
    title: Slow morning, then the coast
    body: Neruda's house, then fried fish somewhere with a view.
    place: isla-negra
---

The markdown here becomes the introduction. The numbered sequence below comes
from front matter, so it stays structured — you can reorder, count and link it
without touching prose.

Each step can name a `place` slug. If that place exists on the site, the template
links straight to its page.

## Front matter

```yaml
layout: layouts/itinerary.njk   # required
title: Three days in Santiago   # required
overline: Itinerary             # optional
subtitle: One line of context   # optional
steps:                          # optional — omit and only the prose renders
  - overline: Day 01 · Friday   #   optional label above the step
    title: Land and eat         #   required per step
    body: One or two sentences. #   optional
    place: ambrosia-bistro      #   optional — a slug from content/places/
```

If `place` names a real place, the step links to it. If the slug doesn't match,
the link is simply left out — no broken link, no build error.
