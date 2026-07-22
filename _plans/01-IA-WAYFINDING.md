# Information Architecture & Wayfinding

**Principle:** every page answers three questions in one screen — *What is this? Where am I? What's my next step?* If a page can't answer the third, it doesn't ship.

## Site map (target)

```
andean-road.com
├── /                        Brand home — story → editor CTA (conversion page)
├── /atelier/                Map Atelier product landing (conversion page)
│   └── /atelier/editor/     The app itself (tools-apps/map-atelier/)
├── /learn/                  Reference & instructional hub
│   ├── /learn/editor/…      How-tos: colors, patterns, borders, places, share, publish
│   └── /learn/cartography/… Topic overviews: color in maps, hierarchy, projections…
├── /tools/                  Map-design tools hub
│   ├── /tools/color-scales/         entry + companion guide in /learn/
│   ├── /tools/svg-editor/           entry + build story in /learn/
│   ├── /tools/chromatlas/           already self-documenting
│   ├── /tools/internet-loom/        keep, low priority
│   └── /tools/spatial-autocorrelation/
├── /places/  /guides/  /map/  /practical/    Editorial — "Andean's Map of Noteworthy Places"
├── /for/…                   Segment landings (ads/email): /for/weddings/, /for/travel-creators/…
├── /about/                  Brand story (Karol + why maps)
└── /templates/              Author-facing. Keep, demote from nav → footer
```

## Navigation model

**Global header (every page):**

```
Andean Road      Create · Learn · Tools · Places      [Open the editor →]
```

- **[Open the editor →]** is the global entry point — a persistent, visually distinct button, never a nav link. Same target everywhere: `/atelier/editor/`.
- "Create" → `/atelier/` (landing, sells it). The button skips the pitch for people who already know.
- "Places" holds all editorial (guides, map, practical live under its hub page).
- Templates moves to footer — it's for you, not visitors.

**Breadcrumbs:** re-root tools under Tools (not Templates), how-tos under Learn.

## Context-driven navigation (the forgiveness layer)

People land mid-site from search, AI answers, or an article about ColorBrewer. Design for entry at any page:

1. **Every learn/tool page ends with a "Try it" block** → deep-link into the editor or tool with a relevant preset when possible.
2. **Every editorial page carries a quiet product bridge** — "This map was made with the Atelier. Make yours →" under each embedded map.
3. **Related-content rail from taxonomy** — `related:` in tagInfo.json + shared facets drive "If you're reading this, next: …". No dead ends.
4. **Two-audience fork on ambiguous hubs** — /learn/ opens with "I want to *make a map*" vs "I want to *understand maps*". Progressive disclosure: one choice, then depth.
5. **Knowledge-gap forgiveness** — how-tos never assume the reader saw the editor; topic pages never assume how-to context. Each states its prerequisite in one line with a link.

## URL & redirect plan

| From | To | Why |
|---|---|---|
| /tools/map-atelier/ | /atelier/ | Product, not a tool listing |
| (new) | /atelier/editor/ | Canonical app URL — the one you put on stickers |
| /guides/cartographic-design/ | /learn/cartography/… | Lives in the hub |
| /templates/ breadcrumb on tools | /tools/ | Correct parent |

301s in `netlify.toml`. Never break a shipped URL.

## AI-driven SEO (extend what WRITING.md already does)

- **First paragraph = extractable answer** on every learn/tool/landing page (rule already exists — enforce on new types).
- **Schema:** `SoftwareApplication` on /atelier/ and each tool entry; `HowTo` on how-tos; `FAQPage` where used; keep `Person`/`WebSite` linkage.
- **llms.txt:** add Tools and Learn sections so models can cite "Andean Road's map editor" with the right URL.
- **Descriptions answer "why use this"** not "what this is" — they're what AI assistants quote.
- **De-noindex** tools only when each page passes the quality bar (03-PROJECT-PLAN).

## Wayfinding acceptance test (run before launch)

- From any page: editor reachable in ≤ 2 clicks (header button).
- From any learn/tool page: a contextual next step exists below the fold.
- Land on any how-to cold: you know what the Atelier is within one paragraph.
- Land on any place page: you can discover the editor without the header.
- Search "andean road map editor" in an AI assistant: llms.txt + schema give it a correct, linkable answer.
