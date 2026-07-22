---
# DRAFT — the prose still carries template heading samples ("…h2", "H3").
# Delete this line to publish; until then the page builds for preview but is
# kept out of /guides/, the sitemap, the feed and llms.txt.
published: TRUE

layout: layouts/manual.njk
slug: spatial-autocorrelation
type: guide
title: Spatial Autocorrelation
overline: Essay
subtitle: What maps have always done — and what that asks of the ones on this site.
description: An essay on cartographic design — how maps encode worldview, and the design lessons this site's maps borrow from that history.
updated: 2026-07-21
---

# Spatial Autocorrelation — Reference Pack for Agentic Workflows

A reusable instructional reference. Sections progress from concept → application → agent prompts → starter project. Each block is designed to be lifted into a system prompt, skill description, or research note.

---

## 1. The one-sentence definition

> Spatial autocorrelation measures whether values at nearby locations are more similar to each other than would be expected by chance.

Tobler's First Law of Geography sits underneath it: "Everything is related to everything else, but near things are more related than distant things."

For an audience-segmentation lens: it's the spatial cousin of cohort similarity. If high-engagement ZIP codes cluster next to other high-engagement ZIP codes, that's positive spatial autocorrelation — and it changes how you target.

---

## 2. The three regimes

| Regime | What it looks like | Moran's I | Real-world example |
|---|---|---|---|
| Positive | Hot spots and cold spots; clusters of similar values | I > 0 (toward +1) | Median household income by census tract |
| None | Random scatter of values | I ≈ 0 | A truly randomized A/B test geography |
| Negative | Checkerboard, woven, dispersed | I < 0 (toward -1) | Competing retail chains forced apart by territory rules |

Positive autocorrelation is by far the most common in real data. Negative is rare in the wild — it usually signals competition, regulation, or sampling design.

---

## 3. The measurement vocabulary

**Global measures** — one number for the whole map.
- **Moran's I** — the default. Range roughly -1 to +1. Behaves like a correlation coefficient between each value and the weighted average of its neighbors.
- **Geary's C** — alternative; more sensitive to local differences. Inverts the scale (0 = positive autocorrelation, 1 = random).

**Local measures** — one number per location.
- **LISA (Local Indicators of Spatial Association)** — local Moran's I per cell. Classifies each location into one of four categories:
  - **High-High (HH)** — high value, surrounded by high values
  - **Low-Low (LL)** — low value, surrounded by low values
  - **High-Low (HL)** — high value among low neighbors (spatial outlier)
  - **Low-High (LH)** — low value among high neighbors (spatial outlier)
- **Getis-Ord Gi*** — hot spot / cold spot statistic. Often used in crime mapping and epidemiology.

**Supporting concept**
- **Spatial weights matrix (W)** — defines what "neighbor" means. Common choices: rook contiguity (shared edge), queen contiguity (shared edge or corner), k-nearest neighbors, distance band.

---

## 4. Why the diagrams look like weaving

Three different visualizations all produce woven, quilt-like patterns. Each for a slightly different reason.

**LISA cluster maps.** Every cell gets one of four discrete labels (HH, LL, HL, LH) plus "not significant," each rendered as a distinct color. Adjacent cells that share a class form solid blocks; adjacent cells that disagree form the visual interlock. The map effectively becomes a 4- or 5-class categorical choropleth, and categorical choropleths over a grid always read as quilts.

**Bivariate choropleth maps.** These literally were called "spatial weaves" in some cartography literature. Two variables get encoded simultaneously through a 3×3 or 4×4 color grid (one ramp for variable A, another for variable B, blended at each cell). Pioneered by Joshua Stevens and the US Census Bureau, popularized by tools like Vivid Maps. The fabric look is the point — your eye should pick up both variables at once.

**Perfect-negative autocorrelation grids.** Mathematically, the configuration that minimizes Moran's I is the checkerboard. So when textbook authors illustrate "negative autocorrelation," they draw a literal weave. (See the third grid in the diagram above.)

The common thread: spatial autocorrelation visuals are dominated by **discrete categorical overlays on a regular tessellation**. That visual grammar is the same grammar quilts and weavings use — interlocking blocks of bounded color.

---

## 5. The ColorBrewer connection — direct

Yes, directly. ColorBrewer (Cynthia Brewer, Penn State) is the de facto color-scheme library for choropleth mapping. Spatial autocorrelation visualizations rely on it constantly:

- **Diverging schemes** (RdBu, BrBG, PRGn) for Moran's I scatterplots and z-score maps — the midpoint at zero matters
- **Sequential schemes** (Blues, YlOrRd, Viridis-adjacent) for the underlying variable shown on a choropleth before computing I
- **Qualitative schemes** (Set1, Dark2, Paired) for LISA categories — HH, LL, HL, LH need to look unrelated to one another, not ordered

ColorBrewer's schemes were designed with print legibility, photocopy survival, and colorblind safety as constraints. They are baked into `tmap`, `ggplot2`, `geopandas`, `seaborn`, ArcGIS, QGIS, and almost every spatial stats tutorial you'll encounter.

## 6. The CIEDE2000 connection — indirect

CIEDE2000 is the CIE's perceptual color-difference formula — ΔE2000 — used to measure how different two colors look to the human eye. Tangentially related, through a chain:

```
spatial autocorrelation viz
  → choropleth color choice
    → ColorBrewer schemes (perceptually uniform)
      → engineered using ΔE-type metrics (CIEDE2000 family)
```

CIEDE2000 doesn't appear in spatial statistics literature directly. It appears in **cartographic design** literature — especially for bivariate choropleths, where you need to guarantee that adjacent grid cells in the 3×3 color legend are perceptually distinct enough to be discriminated. Designers building custom bivariate palettes (rather than using a pre-made one) will reach for CIEDE2000 to validate their choices.

If your work intersects with custom palette design for segmentation visuals — Mailchimp dashboards showing customer density × spend, for instance — CIEDE2000 is the math that tells you whether your color cells are far enough apart.

---

## 7. Prompt block — for use in an agentic workflow

Drop this into a system prompt or skill description when you want an agent to analyze spatial data.

```
You are a spatial statistics analyst. When given geographic data with values per
location, you do the following in order:

1. Confirm the spatial unit (ZIP, census tract, county, hex bin) and the variable.
2. Define the spatial weights matrix. Default to queen contiguity for polygons,
   k=8 for points. Ask if the default is wrong.
3. Compute global Moran's I. Report:
   - the I value
   - its expected value under the null (typically -1/(n-1))
   - the pseudo p-value from permutation (default 999 permutations)
   - one sentence interpreting the result in plain English
4. Compute LISA (local Moran's I). Produce a cluster map labeling each unit as
   one of: HH, LL, HL, LH, or not significant (p > 0.05).
5. Highlight the three most actionable clusters with a one-line "what to do
   about it" recommendation tied to the user's domain.

Use ColorBrewer's RdBu for the variable's choropleth, and the standard LISA
qualitative palette (red HH, blue LL, light red LH, light blue HL, grey ns)
for the cluster map. Do not invent custom palettes unless asked.

Never call a pattern "clustered" or "dispersed" without a p-value to back it up.
```

## 8. Prompt block — for explaining results to a non-technical stakeholder

```
You are translating a spatial autocorrelation analysis for a product or
marketing audience. Avoid the words "Moran," "Geary," and "LISA" in the body
of your answer — name them only in a footnote.

Structure your output as:

- Headline: one sentence stating whether nearby locations behave similarly,
  with a confidence qualifier (strong / moderate / weak / none).
- What it means: two sentences in domain language.
- Where the action is: 2-4 named clusters or outlier locations.
- One recommendation: a single move the team can make on the basis of this.

Show one supporting visual: a choropleth of the variable, or a LISA cluster
map. Caption it in 12 words or fewer.
```

---

## 9. Starter project — learn by doing in an afternoon

**Project: Median household income by US county, with hot/cold-spot map.**

Why this one: the data is public, clean, and has obvious spatial structure (clusters in the Northeast corridor, Bay Area, Front Range; cold spots in Appalachia and the Mississippi Delta). You will see Moran's I land around +0.6 and the LISA map will tell a story you can fact-check against the news.

**Tooling — pick one:**

| Path | Best for | Time to first map |
|---|---|---|
| GeoDa (free GUI, Luc Anselin's tool) | Designers, learn-by-clicking | 30 min |
| Python + GeoPandas + PySAL | Reusable, scriptable, integrates with notebooks | 2 hours |
| R + sf + spdep | Stats community standard, best docs | 2 hours |

**Recommended for you:** GeoDa for the first pass (Luc Anselin literally invented LISA, and his GUI walks you through the workflow), then redo the same analysis in Python so you have a notebook you can adapt.

**Steps:**

1. Download US county shapefile from the Census TIGER/Line files.
2. Join median household income from ACS 5-year estimates (table B19013).
3. Make a choropleth using a sequential ColorBrewer scheme (YlGnBu, 5 classes, quantile breaks).
4. Define spatial weights — queen contiguity.
5. Compute global Moran's I. Permutation test, 999 reps.
6. Compute LISA, produce a cluster map with standard 5-color palette.
7. Write three bullets in plain language about what you see.

**Stretch — apply it to your domain:**
Swap counties for ZIP codes (or DMAs) and median income for Mailchimp campaign open rate or revenue per recipient. Same workflow. The patterns you find should shape how a segmentation UI surfaces "look-alike geos" or "underperforming neighborhoods."

---

## 10. The fast glossary

| Term | One-line definition |
|---|---|
| Spatial autocorrelation | Similarity of values among neighboring locations. |
| Tobler's First Law | "Near things are more related than distant things." |
| Moran's I | Global scalar measure, ~-1 to +1. |
| Geary's C | Alternative global measure; 0 = clustered, 1 = random. |
| LISA | Local Moran's I per location. Yields HH/LL/HL/LH classes. |
| Getis-Ord Gi* | Local hot/cold spot z-score. |
| Spatial weights matrix (W) | Definition of which locations are neighbors. |
| Queen contiguity | Neighbors share an edge or a corner. |
| Rook contiguity | Neighbors share an edge only. |
| Choropleth | Map shaded by a value per region. |
| Bivariate choropleth | Two variables encoded in one map via a color grid. Also called a spatial weave. |
| ColorBrewer | Brewer's color-scheme library — sequential, diverging, qualitative. |
| CIEDE2000 | CIE perceptual color-difference formula (ΔE2000). |

---

## 11. Verification — does this reference work?

A reader who has worked through this doc should be able to answer:

1. Name the three spatial autocorrelation regimes and one example of each.
2. Explain in one sentence what LISA tells you that Moran's I does not.
3. State why a bivariate choropleth is sometimes called a spatial weave.
4. Pick a ColorBrewer scheme type (sequential, diverging, or qualitative) for: a Moran's scatterplot, a LISA cluster map, and a raw income choropleth.
5. Sketch the four-step starter project from memory.

If a learner can do all five, the reference earned its keep.
