# Andean Road — Pivot Plan · Start Here

**Decisions locked:** General-purpose map editor leads the narrative · Solo + AI agents · Sequenced phases, no dates.

## Read in this order

| File | What it answers |
|---|---|
| `00-START-HERE.md` | Where you are. What's next. |
| `01-IA-WAYFINDING.md` | Site map, navigation model, URL schema, AI-SEO |
| `02-CONTENT-DESIGN-SYSTEM.md` | Page templates, data schema, content to-do list |
| `03-PROJECT-PLAN.md` | Phases, scope, quality bar for go-live |
| `04-SPRINT-PLAN.md` | Sprint-by-sprint work, sequenced |
| `05-GOLIVE-CHECKLIST.md` | Tactical checklist: jobs, roles, skills, owners |

---

## Audit — what exists

**Strong foundation. The pivot is repositioning, not rebuilding.**

- 13 layouts + 6 map layouts, one map engine, documented in a 53KB DESIGN-SYSTEM.md
- `taxonomy.yml` — single source of truth for facets, markers, JSON-LD
- WRITING.md discovery rules (first-paragraph-is-answer, llms.txt, structured front matter) — already AI-SEO-ready
- 7 tools built: Map Atelier, Color Scales, SVG Editor, Chromatlas, Internet Loom, Spatial Autocorrelation, Destination Weddings briefing
- 20 places · 4 guides · 5 practical pages · privacy-first analytics wired (off)

## Audit — the gaps (mapped to your requirements)

| # | Requirement | Current state |
|---|---|---|
| 1 | Clear entry to map editor | Buried on `/templates/` as a "utility". No landing page. App still branded **"Hue & Vow"** with wedding copy |
| 2 | Reference/instructional hub | Doesn't exist. Zero editor how-tos. Cartography "essay" is a draft whose body is Qhapaq Ñan history, not design |
| 3 | Content pages driving editor discovery | None. Tools are `noindex: true` |
| 4 | Global entry point | Nav is travel-only: Guides · Places · Map · Practical · Templates |
| 5 | Tools hub | `/templates/` conflates author scaffolding with public tools. Color Scales has no guide; SVG Editor has no build story |
| 6 | Wayfinding on andean-road.com | Breadcrumbs on tools point to "Templates" — wrong mental model |
| 7 | Room for brand/campaign pages | Index is 100% travel narrative. No product presence, no segment pages, no email capture |
| 8 | Editorial as acquisition | Chile content exists but isn't framed as "Andean's Map of Noteworthy Places" or connected to the editor funnel |

## Hygiene flags (fix cheap, fix early)

- Local working copy is **ahead of GitHub** (taxonomy.yml, tools-apps/, api/, feed, llms.njk uncommitted). Commit + push before structural work.
- `content/guides/cartographic-design copy.md` — duplicate draft, delete or merge.
- `published: TRUE` on cartographic-design contradicts the "absence means published" convention.
- `traveler_mode` facet marked DECISION NEEDED in taxonomy.yml — resolve in Sprint 1 (recommendation: keep; it's your context-driven nav lever).

---

## How to advance — the one paragraph

Ship the pivot in four sequenced sprints: **(1) Spine** — rename/reframe Map Atelier, landing page, global nav + CTA, URL schema, redirects; **(2) Learn** — hub + 6 editor how-tos + cartography track; **(3) Tools** — hub + Color Scales guide + SVG Editor build story, de-noindex; **(4) Convert** — index rewrite, segment page, email capture, checklist run, launch. Each sprint has a definition of done in `04-SPRINT-PLAN.md`. Nothing blocks Sprint 1 except the git push.

**Next action:** commit local work → start Sprint 1, task 1.1.
