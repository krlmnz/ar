---
layout: layouts/guide.njk
title: A map is a sentence
summary: A long page with a contents rail, built from headings.
order: 1
series: Field guide
subtitle: How to read a road before you drive it. Four sections, and you can start at any of them.
cover: true
cover_meta: Land · Line · Labels · Leaving
published: true
---

A map is not a picture of everything. It is a sentence about a journey, with the words you don't need crossed out.

<div class="plain"><strong>In plain words</strong>Keep the label that helps the next turn. Take the rest off.</div>

> **Rule:** color follows the theme. The sentence stays put.

## Start with the land (#land)

Before pins, before the route, look at what the country is doing. Chile is a shelf between a wall and an ocean. Most good days are a decision about which of those two you are facing.

The basemap should say that and then get out of the way. If a label doesn't help the day, it is noise.

## One line, then the stops

Draw the trip as one line. Stops hang off it in order. The line can be honest about being schematic — a dashed segment between two places is a plan, not a promise about the pavement.

- One source of stops
- One line through them
- The sidebar and the map read the same list

## What a label owes you

A label owes the reader a decision. "Day 2" is a decision. The name of a suburb they will never enter is not.

> If the label doesn't help the next turn, take it off.

## When to leave the map

The point of the page is the day, not the tiles. When the reader knows where they are going and why, the map has finished its sentence. Let them scroll on.

## Reading themes (#themes)

Six themes, one page. Customize view in the header changes every surface — type, callouts, code, and cards — or pick one here.

<div class="theme-gallery" aria-label="Theme shortcuts">
<button class="theme-chip" type="button" data-theme-choice="light"><strong>Light / Minimal</strong><small>White, black, and cool gray.</small></button>
<button class="theme-chip" type="button" data-theme-choice="night"><strong>Night Sky</strong><small>Cool dark field, pale type.</small></button>
<button class="theme-chip" type="button" data-theme-choice="note"><strong>Warm Note</strong><small>Yellow-beige paper, brown rules.</small></button>
<button class="theme-chip" type="button" data-theme-choice="signal"><strong>Signal Hacker</strong><small>Black field, bright blue.</small></button>
<button class="theme-chip" type="button" data-theme-choice="news"><strong>Grey Newspaper</strong><small>Monochrome and text-forward.</small></button>
<button class="theme-chip" type="button" data-theme-choice="draft"><strong>Drafting Grid</strong><small>White cards on a dot grid.</small></button>
</div>

```
const theme = document.documentElement.dataset.theme;
```

<div class="grid-2">
<article class="card"><span class="tag">guide</span><h3>Field guide</h3><p>A contents rail on the left, built from headings.</p></article>
<article class="card"><span class="tag">essay</span><h3>Essay</h3><p>One column. Title, then the writing. No rail.</p></article>
</div>

> **Accessibility:** the theme does not change heading order, the contents rail, or the words in a callout.
