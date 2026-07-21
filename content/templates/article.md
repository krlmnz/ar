---
layout: layouts/article.njk
order: 1
title: Article
overline: Page template
subtitle: Long-form editorial — an essay, a dispatch, a piece of reporting.
summary: Reading page — lead-in paragraph, byline and date, generous measure.
byline: By Karol
updated: 2026-07-21
further_reading:
  - label: How to order a steak
    url: /practical/steak-order/
  - label: Chilean Spanish
    url: /practical/language/
---

Use this when the writing carries the page. Everything below the front matter is
plain markdown — headings, paragraphs, lists, quotes, links — rendered into the
editorial column at a comfortable measure.

## What it gives you

A masthead with an overline, title, standfirst and a byline/date line. Then your
prose. Optionally a "Further reading" list of links at the end.

## Front matter

```yaml
layout: layouts/article.njk
title: Your headline
overline: Section label        # optional
subtitle: One-sentence standfirst
byline: By Karol               # optional
updated: 2026-07-21            # optional, renders as a formatted date
reading_time: 6 min read       # optional
further_reading:               # optional
  - label: Link text
    url: /somewhere/
```

`subtitle` is the standfirst; if you omit it, `description` is used instead.
Leave the date **unquoted** — YAML then hands the layout a real date.

> Only `layout` and `title` are required. Everything else is optional and
> disappears cleanly when omitted.

Pages directly under `content/` publish at `/<filename>/`. Set `permalink:` in
the front matter if you want a different URL.

## When to reach for something else

If the page is mostly a sequence of days or steps, use the **Itinerary**
template. If it's mostly a lookup table, use **Reference**.
