# Content Design System

Extends the existing system (13 layouts, taxonomy.yml, WRITING.md). Adds five content types the pivot needs. Same contract as always: markdown + front matter, optional fields disappear cleanly.

## New content types

| Type | Layout base | Job | Lives at |
|---|---|---|---|
| **Product landing** | new: `landing.njk` | Convert. Story → proof → CTA | `/atelier/`, `/` |
| **How-to** | `manual.njk` variant | One task, done in minutes | `/learn/editor/<task>/` |
| **Topic** | `article.njk` variant | Understand one concept | `/learn/cartography/<topic>/` |
| **Build story** | `article.njk` variant | Credibility + tool discovery ("how I built X") | `/learn/notes/<slug>/` |
| **Segment landing** | `landing.njk` | Ad/email destination per audience | `/for/<segment>/` |

## Template anatomy (the two that matter)

**Product landing** — progressive disclosure, one primary CTA repeated:
1. Hero: what it makes, for whom, one sentence. `[Open the editor]`
2. Show, don't tell: live embed or looping demo of a finished map
3. Three capabilities max (color · pattern · share) — each links to its how-to
4. Social proof / example gallery (seed with your own maps)
5. Forgiveness block: "New to map design? Start in /learn/"
6. Final CTA + email capture ("Get new tools & guides")

**How-to** — same skeleton every time, so readers learn the pattern once:
1. First paragraph: the outcome, standalone (feeds llms.txt, search, AI)
2. "Before you start" — one line + link (prerequisite forgiveness)
3. Numbered steps, one action each, screenshot per decision point
4. "Try it" deep link into the editor
5. Related: 2 links max (one how-to, one topic)

## Front matter schema (additions)

```yaml
# every new type
section: atelier | learn | tools | places | for     # drives breadcrumbs + nav state
track: editor | cartography | notes                 # learn hub only — the future split line
# how-to only
tool: map-atelier | color-scales | svg-editor
task: color | pattern | border | places | share | publish
time: 5 min
# landing only
cta: { label: "Open the editor", url: "/atelier/editor/" }
segment: weddings | travel-creators | …             # /for/ pages
```

`section` + `track` are the wayfinding data: breadcrumbs, hub filtering, and the future two-hub split read from them — restructure later without rewriting content.

## Folder schema

```
content/
  learn/
    editor/        how-tos          (track: editor)
    cartography/   topics           (track: cartography)
    notes/         build stories    (track: notes)
  for/             segment landings
pages/
  atelier.njk      product landing
  learn.njk        hub
  tools.njk        hub (public tools only)
tools-apps/        the apps themselves (unchanged)
```

Add starters: `_starters/how-to.md`, `topic.md`, `build-story.md`, `landing.md` → wire into `scripts/new.js`.

## Brand rule for the pivot

One brand: **Andean Road**. The editor is **"the Atelier."** Retire "Hue & Vow" as a public name — the wedding voice becomes a preset/template inside the editor and a `/for/weddings/` segment page. Editorial keeps the personal, first-person voice (it's the moat); product pages borrow its warmth but lead with the reader's outcome, not your biography.

## Near-term content to-do list

**P1 — blocks go-live**
- [ ] `/atelier/` product landing copy + demo map
- [ ] 6 editor how-tos: choose colors · apply patterns · style borders · add places · share a map · publish
- [ ] `/learn/` hub page (two-door fork: make vs understand)
- [ ] `/tools/` hub page (public tools only, one-line "why" each)
- [ ] Index rewrite: brand story → editor → editorial (see 01, template above)
- [ ] Neutralize editor UI copy (title, placeholders — currently wedding-specific)

**P2 — launch week**
- [ ] Color Scales companion guide: "From two brand colors to a data palette" (the ColorBrewer angle — your stated acquisition bet)
- [ ] SVG Editor build story: "Restyling Wikipedia's map of the Andean road system"
- [ ] Finish cartographic-design essay (current draft is Qhapaq Ñan history — good raw material for a *separate* brand-story topic page; the design essay still needs writing)
- [ ] `/for/weddings/` segment landing (reuse Hue & Vow copy + briefing data)
- [ ] About page: add the maps story, connect travel guide → atelier

**P3 — post-launch, signal-driven**
- [ ] Reframe places index as "Andean's Map of Noteworthy Places"
- [ ] 2 more cartography topics (start where search/AI referrals point)
- [ ] Email #1: welcome + one map made in 10 minutes
