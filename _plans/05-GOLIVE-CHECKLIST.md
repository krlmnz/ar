# Go-Live Checklist — Tactical

Solo + AI model: **you are the approver of record for every role.** Each role below is a hat — a prompt persona you run an AI agent under, with a defined job, required skills, and what only a human may sign off. Nothing ships without the human sign-off column checked.

## Roles

| Role | Jobs to be done | Skills needed | AI does | Karol signs off on |
|---|---|---|---|---|
| **Product/Brand owner** | Decisions, voice, launch call | Brand strategy, taste | Options + tradeoffs | Everything final |
| **Content strategist** | Content to-do list, priorities, briefs per page | Editorial planning, SEO/AI-SEO | Briefs, drafts, metadata | Priorities, accuracy |
| **UX writer** | Landing copy, how-tos, UI strings, CTAs | Plain language, progressive disclosure | All first drafts | Voice, claims |
| **Information architect** | Nav, URLs, redirects, breadcrumbs, taxonomy | IA, wayfinding testing | Implementation + link audit | IA changes |
| **Front-end dev** | Layouts, header, schema, analytics events | 11ty/Nunjucks, CSS tokens, JSON-LD | All code | Deploy to prod |
| **QA / Reviewer** | Quality-bar run, cold-landing tests, device pass | Testing discipline, a11y | Full test execution + report | Waivers only |

## Pre-flight — run top to bottom, in order

**A. Repo & infrastructure** *(owner: Front-end dev)*
- [ ] Local work committed, pushed; deploy previews green
- [ ] 301 redirects live and tested (old → new URL table from 01)
- [ ] Mapbox token URL-restricted; builds succeed without local token
- [ ] Analytics provider on; `editor_open`, `map_share`, `tool_open`, `email_signup` events verified in dashboard

**B. Wayfinding** *(owner: IA)*
- [ ] Header + editor button on every page, mobile included
- [ ] Breadcrumbs match new IA on all tools/learn pages
- [ ] Zero orphans, zero broken internal links (crawl)
- [ ] Editor ≤ 2 clicks from 10 random pages — tested
- [ ] Cold-landing test: 5 random pages, 10-second what/where/next — passed

**C. Content** *(owner: Content strategist)*
- [ ] All P1 items published (list in 02); P2 items published or consciously deferred by owner
- [ ] Every new page: first paragraph stands alone; description answers "why"
- [ ] No `noindex` on public pages; no drafts leaked; dates unquoted
- [ ] Voice pass done: no "Hue & Vow" outside /for/weddings/

**D. Conversion** *(owner: UX writer)*
- [ ] One primary CTA per landing; all CTAs land where they promise
- [ ] Index + /atelier/ show a real map in the first screen
- [ ] Email form: test signup received; welcome email sends

**E. Product surface** *(owner: QA)*
- [ ] Editor: new map → style → add place → share → open share link, on desktop + phone
- [ ] Each public tool loads and its export works
- [ ] Map failure mode graceful without token (already designed — verify)

**F. Discoverability** *(owner: Front-end dev)*
- [ ] JSON-LD validates: WebSite/Person, SoftwareApplication, HowTo
- [ ] llms.txt lists atelier + tools + learn; sitemap correct
- [ ] Lighthouse ≥ 90 (perf/a11y/SEO): index, /atelier/, one how-to
- [ ] OG title/description correct on the 6 pages people will share

**G. Launch** *(owner: Product owner — human only)*
- [ ] Quality bar in 03 fully green, or each exception waived in writing here: ______
- [ ] Deploy to production; smoke-test the 6 key pages live
- [ ] Submit sitemap (Google Search Console + Bing)
- [ ] Announce: personal channels first; note baseline metrics day 0
- [ ] Calendar a 4-week signal review (tool opens by source, share rate, referral queries)

## Rules of engagement

1. One sprint at a time; a failed DoD blocks the next sprint, not the current work.
2. AI drafts, human approves — never the reverse on brand voice or factual claims about Chile.
3. Anything cut at launch goes to the P3 list in 02, not into the void.
