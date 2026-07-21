---
layout: layouts/reference.njk
order: 4
title: Reference
overline: Page template
subtitle: A scannable table of facts — prices, durations, phrases, what to pack.
summary: Two-column table — label and value aligned for scanning.
rows:
  - label: Currency
    value: Chilean peso (CLP)
    note: Roughly 950 to the dollar. Prices are written $12.000, meaning 12,000.
  - label: Tipping
    value: 10% and it's on the bill
    note: Listed as "propina sugerida". You can decline it.
  - label: Plugs
    value: Type C and L, 220V
  - label: Emergency
    value: 131 ambulance · 132 fire · 133 police
---

For pages people scan rather than read. The markdown intro sets context, then
the rows carry the facts.

Each row takes a `label`, a `value`, and an optional `note` for the caveat that
always comes with it.

## Front matter

```yaml
layout: layouts/reference.njk   # required
title: Money and payments       # required
overline: Reference             # optional
subtitle: One line              # optional
rows:                           # optional
  - label: Currency             #   required per row
    value: Chilean peso (CLP)   #   required per row
    note: The caveat.           #   optional
```
