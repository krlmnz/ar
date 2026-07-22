# Project Plan — Go-Live Scope

**Goal:** andean-road.com leads with a self-service map editor, supported by a learn hub, a tools hub, and editorial that feeds the funnel. Sequenced; each phase gates the next.

## Phases

| Phase | Outcome | Done when |
|---|---|---|
| **1 · Spine** | Site skeleton says "map editor" everywhere | Nav + global CTA live · /atelier/ landing up · redirects in place · editor copy neutralized · repo pushed |
| **2 · Learn** | A new user can succeed unaided | Hub + 6 how-tos live · every how-to passes the cold-landing test |
| **3 · Tools** | Tools are discoverable, indexed, credible | /tools/ hub live · Color Scales guide + SVG build story published · noindex removed |
| **4 · Convert** | Strangers arrive and act | Index rewrite · /for/weddings/ · email capture · analytics events firing · checklist passed → **launch** |

**Out of scope for go-live:** photography program, more segments, editor feature work, places-index reframe, paid ads (start after signal baseline).

## Quality bar — go-live criteria

Ship when all pass. Each is testable, not aspirational.

**Wayfinding**
- [ ] Editor ≤ 2 clicks from every page; every learn/tool page has a next step below the fold
- [ ] Cold-landing test passes on 5 random pages (tester knows what/where/next in 10 seconds)
- [ ] Zero orphan pages; breadcrumbs match the new IA; 301s cover every moved URL

**Conversion**
- [ ] One primary CTA per landing page; index and /atelier/ each demo a real map
- [ ] Email capture works end-to-end (test submission received)

**Product**
- [ ] Editor loads clean on mobile Safari + Chrome; share links round-trip; no "Hue & Vow" strings in UI

**Content**
- [ ] Every P1 item published; every how-to first paragraph stands alone
- [ ] No `noindex` on pages meant to be found; no draft flags on published pages

**Technical / discoverability**
- [ ] JSON-LD validates (Rich Results test): SoftwareApplication, HowTo, WebSite/Person
- [ ] llms.txt lists Atelier, tools, learn hub with correct URLs
- [ ] Sitemap correct; Lighthouse ≥ 90 perf/a11y/SEO on index, /atelier/, one how-to
- [ ] Analytics on; events: editor_open, map_share, tool_open, email_signup

**Brand**
- [ ] One voice pass across new pages (Andean Road warm-expert voice; no wedding leakage outside /for/weddings/)

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Scope creep in editor features | Go-live is a *communication* project; editor changes limited to copy + share polish |
| Learn hub balloons | 6 how-tos + 1 topic is enough to launch; taxonomy `track:` makes the future split free |
| Solo bandwidth | Every sprint task sized ≤ half a day; AI agents own first drafts (see 05) |
| Renaming breaks links | Redirect table in 01; test before deploy |

## Decision log (locked)

1. General map editor leads; weddings = segment. 2. One brand: Andean Road / "the Atelier". 3. Learn hub combined now, `track:` field enables split. 4. Templates page demoted to footer. 5. Solo + AI execution. 6. Sequenced phases, no calendar dates.

**Open decision (resolve Sprint 1):** keep or cut `traveler_mode` facet — recommendation: keep, it powers context-driven editorial nav later.
