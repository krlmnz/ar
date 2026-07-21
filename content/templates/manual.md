---
layout: layouts/manual.njk
order: 7
title: Manual
overline: Page template
subtitle: Long reference content — documentation, a handbook, a textbook chapter.
summary: Sticky contents rail, linkable headings, prev/next. For pages people return to.
prev:
  label: Simple
  url: /templates/simple/
next:
  label: All templates
  url: /templates/
---

For content too long to scroll blindly: driving rules, a language primer, an
equipment manual, a chapter. The difference from **Article** is not length but
*use* — an article is read once, a manual is navigated, linked to, and returned
to weeks later.

## What it adds

Three things the other templates don't have.

### A contents rail

Every `h2` and `h3` in your markdown is collected into a sticky list beside the
text. You write nothing extra — add a heading and it appears. On screens below
900px the rail collapses into a disclosure above the text so it never pushes the
content down.

The rail only appears when a page has more than two headings. Short pages don't
get a contents list for three items.

### Linkable headings

Every heading gets a stable `id` and a `#` anchor that fades in on hover. Hover
any heading here and you'll see it. That means someone can send a colleague a
link to one specific rule rather than "it's on the driving page somewhere".

Accents are handled: a heading like *Pucón* becomes `#pucon`, not a mess of
percent-encoding.

### Sequence

`prev` and `next` in the front matter render as pagination at the foot of the
page, so a set of pages reads as an ordered work rather than a pile.

## Front matter

```yaml
layout: layouts/manual.njk   # required
title: Driving in Chile      # required
overline: Handbook           # optional
subtitle: One line           # optional
toc: false                   # optional — set false to suppress the rail
prev:                        # optional
  label: Previous section
  url: /somewhere/
next:                        # optional
  label: Next section
  url: /elsewhere/
```

## When to use something else

Use **Reference** for a page that is mostly a lookup table of short facts — it
gives you aligned label/value rows rather than prose. Use **Article** when the
piece is read start to finish and has a byline. Use this when the reader arrives
looking for one specific thing inside a long document.

## A note on writing long pages

Because the rail is generated from your headings, the headings *are* the
navigation. Write them as things a reader would scan for, not as clever titles —
"Right of way at roundabouts" beats "The circular question". Keep to `h2` for
sections and `h3` for subsections; `h4` still gets an anchor but stays out of the
rail to keep it short.
