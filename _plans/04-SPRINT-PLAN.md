# Sprint Plan

Four sprints, sequenced. A sprint is done when its Definition of Done passes — take the time it takes. Tasks are sized ≤ half a day each. `[AI]` = agent drafts, you approve. `[K]` = only you can do it.

## Sprint 1 — Spine

*The site's skeleton says "map editor."*

| # | Task | Who |
|---|---|---|
| 1.1 | Commit + push local work; delete `cartographic-design copy.md`; fix `published: TRUE` | K |
| 1.2 | Header: Create · Learn · Tools · Places + **[Open the editor →]** button; Templates → footer | AI |
| 1.3 | `/atelier/` landing page (template in 02) + `landing.njk` layout | AI draft, K voice pass |
| 1.4 | Move app to `/atelier/editor/`; 301 redirects; breadcrumb re-rooting | AI |
| 1.5 | Neutralize editor UI copy; keep wedding voice as preset | AI draft, K approve |
| 1.6 | Add `section`/`track` front-matter support + new starters in `scripts/new.js` | AI |
| 1.7 | Analytics on (pick provider) + 4 events wired | K config, AI code |
| 1.8 | Resolve `traveler_mode` decision | K |

**DoD:** deploy preview shows new nav on every page; /atelier/ live; old URLs redirect; editor opens with neutral copy; events visible in analytics.

## Sprint 2 — Learn

*A stranger can make their first map unaided.*

| # | Task | Who |
|---|---|---|
| 2.1 | `/learn/` hub with make-vs-understand fork | AI |
| 2.2–2.7 | 6 how-tos: colors · patterns · borders · places · share · publish (skeleton in 02) | AI draft, K screenshots + accuracy pass |
| 2.8 | Write the actual cartographic-design topic page; move Qhapaq Ñan draft to brand-story material | K writes, AI edits |
| 2.9 | "Try it" blocks + related-content rail on all learn pages | AI |

**DoD:** cold-landing test passes on every how-to; each ends in a working editor deep link; hub fork works on mobile.

## Sprint 3 — Tools

*Tools become public, indexed, and credible.*

| # | Task | Who |
|---|---|---|
| 3.1 | `/tools/` hub — public tools only, one-line "why" each | AI |
| 3.2 | Color Scales companion guide (ColorBrewer angle) | AI draft, K expertise pass |
| 3.3 | SVG Editor build story (Wikipedia Andean map restyle) | K outline, AI draft |
| 3.4 | Entry points: each tool page gets hero line, "what you can do", link to its guide | AI |
| 3.5 | Remove `noindex` per page as each passes quality bar; SoftwareApplication + HowTo schema; llms.txt update | AI |

**DoD:** every public tool reachable from /tools/ with a why-line; Color Scales + SVG Editor each have entry + companion content; schema validates; noindex gone.

## Sprint 4 — Convert → Launch

*Strangers arrive and act.*

| # | Task | Who |
|---|---|---|
| 4.1 | Index rewrite: brand story → atelier demo → editorial sections | AI draft, K voice pass |
| 4.2 | `/for/weddings/` segment landing from Hue & Vow copy + briefing | AI |
| 4.3 | Email capture (provider choice + form + welcome email) | K config, AI copy |
| 4.4 | Full quality-bar run (03) + wayfinding acceptance test (01) | AI executes, K signs |
| 4.5 | Fix round; Lighthouse pass | AI |
| 4.6 | **Launch:** deploy, submit sitemap, announce | K |

**DoD:** every go-live criterion in 03 checked; launch deployed; analytics baseline recording.

## After launch (signal-driven, don't pre-plan)

Watch 4 weeks of: tool_open by source page · editor_open → map_share rate · search/AI referral queries. Then pick: more cartography topics, more segments, or places-index reframe — whichever the signals fund.
