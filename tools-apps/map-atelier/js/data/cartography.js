// ═══════════════════════════════════════════════════════════════
// CARTOGRAPHY — the design knowledge that makes the color tools
// opinionated instead of infinite. Three things live here:
//
//   1. CARTO_PALETTES — curated whole-map palettes. Every color is
//      a real Pantone TCX swatch, Lab-matched to the cartographic
//      palette templates (light / night / high-contrast / vintage)
//      and then extended with harmony-built variants. Shuffle only
//      ever draws from this list, so a random map is still a
//      designed map.
//   2. LAYER_ROLES — what each map layer is *for*, expressed as a
//      band of the Pantone library. Water reads as water because
//      it sits in the blue-teal band at low-to-mid chroma; roads
//      stay neutral so app data can own the color.
//   3. Contrast math — WCAG ratios, used to warn when two adjacent
//      surfaces are separable by hue alone (the case for a pattern).
// ═══════════════════════════════════════════════════════════════
import { PCOLORS, P } from './pantone.js';

// ── curated palettes ───────────────────────────────────────────
// `theme` drives the swatch preview chrome; `harmony` is the
// cartographic story we tell the user in the palette card.
export const CARTO_PALETTES = [
  {
    name: 'Light / Day', theme: 'light', harmony: 'Neutral ground',
    mood: 'The professional daytime basemap — near-white land, roads lighter still',
    codes: { land: '12-4306', water: '14-4121', park: '12-0109', building: '13-4104', 'road-simple': '11-0601' },
    accent: '18-4140', ink: '19-4305',
  },
  {
    name: 'Night', theme: 'dark', harmony: 'Neutral ground',
    mood: 'Night mode — neutral dark roads so data layers keep the color',
    codes: { land: '19-3911', water: '18-3949', park: '17-0145', building: '19-4004', 'road-simple': '18-0503' },
    accent: '14-4522', ink: '11-0601',
  },
  {
    name: 'High Contrast', theme: 'contrast', harmony: 'Maximum separation',
    mood: 'Built for bright sun, projection and low vision — every surface separates on luminance alone',
    codes: { land: '19-4008', water: '19-4150', park: '15-5534', building: '17-4402', 'road-simple': '11-0601' },
    accent: '12-0643', ink: '11-0601',
  },
  {
    name: 'Vintage', theme: 'vintage', harmony: 'Warm analogous',
    mood: 'Paper and ink — muted warm neutrals, the color of an old survey sheet',
    codes: { land: '11-0507', water: '12-4607', park: '13-0215', building: '12-0000', 'road-simple': '14-1108' },
    accent: '18-1340', ink: '19-0814',
  },
  {
    name: 'Analogous Coast', theme: 'light', harmony: 'Analogous (blue → teal → green)',
    mood: 'Neighbors on the wheel — cohesive, calm, and quiet under a data overlay',
    codes: { land: '12-5303', water: '15-4415', park: '14-6017', building: '12-5406', 'road-simple': '11-4802' },
    accent: '17-4919', ink: '19-4914',
  },
  {
    name: 'Complementary', theme: 'light', harmony: 'Complementary (blue / orange)',
    mood: 'Opposites for emphasis — and the colorblind-safe alternative to red / green',
    codes: { land: '12-0704', water: '15-4020', park: '13-0111', building: '13-1106', 'road-simple': '11-0601' },
    accent: '16-1253', ink: '19-4028',
  },
  {
    name: 'Monochrome Slate', theme: 'light', harmony: 'Monochromatic',
    mood: 'One hue, varied lightness — the basemap to use when the data is the story',
    codes: { land: '14-4201', water: '15-4101', park: '15-4704', building: '15-4502', 'road-simple': '11-4202' },
    accent: '19-4028', ink: '19-4010',
  },
  {
    name: 'Terrain', theme: 'vintage', harmony: 'Warm sequential',
    mood: 'Field-guide warmth — sand, sage and stone for landscape and trail maps',
    codes: { land: '12-0605', water: '14-4508', park: '15-6423', building: '13-1106', 'road-simple': '11-0507' },
    accent: '18-0825', ink: '19-0617',
  },
];

export function paletteColorsFor(p) {
  const out = {};
  for (const [k, code] of Object.entries(p.codes)) out[k] = P(code);
  return out;
}

// ── per-layer cartographic role ────────────────────────────────
// Each role is a band of the library: which hues read as this
// surface, and how much chroma/lightness a basemap can carry
// before it competes with the data drawn on top of it.
export const LAYER_ROLES = {
  water: {
    label: 'Water', intent: 'Blue reads as water almost universally — trust, calm, depth.',
    rule: 'Stay cooler and slightly darker than land so coastlines read without an outline.',
    hues: [[170, 260]], sat: [0.12, 0.95], light: [0.18, 0.90], allowNeutral: false,
  },
  park: {
    label: 'Parks & greenery', intent: 'Green carries nature, growth and open space.',
    rule: 'Keep chroma below the data layers — a park should recede, not compete.',
    hues: [[70, 170]], sat: [0.12, 0.80], light: [0.20, 0.92], allowNeutral: false,
  },
  building: {
    label: 'Buildings', intent: 'Footprints are context, not content.',
    rule: 'Near-neutral, a step off the land value. Hue is optional; separation is not.',
    hues: [[0, 360]], sat: [0.00, 0.26], light: [0.14, 0.92], allowNeutral: true,
  },
  land: {
    label: 'Land', intent: 'The ground everything else is measured against.',
    rule: 'Lowest chroma on the map. Every other surface earns its contrast from this one.',
    hues: [[0, 360]], sat: [0.00, 0.30], light: [0.10, 0.97], allowNeutral: true,
  },
  'road-simple': {
    label: 'Roads', intent: 'Infrastructure is neutral by convention — gray, white, near-black.',
    rule: 'Never tint roads. Colored roads compete with routes and markers drawn above them.',
    hues: [[0, 360]], sat: [0.00, 0.14], light: [0.12, 0.97], allowNeutral: true,
  },
};

function inBand(c, role) {
  if (c.s < role.sat[0] || c.s > role.sat[1]) return false;
  if (c.l < role.light[0] || c.l > role.light[1]) return false;
  // A near-neutral has no meaningful hue, so it can't be judged against a hue
  // band. For the neutral roles that is the whole point; for water and parks
  // a gray is simply the wrong answer, so it never enters the pool.
  if (c.s < 0.12) return !!role.allowNeutral;
  return role.hues.some(([lo, hi]) => (lo <= hi ? c.h >= lo && c.h <= hi : c.h >= lo || c.h <= hi));
}

// Spread picks across the band instead of returning 40 near-identical
// swatches: bucket by hue×lightness and keep the best of each cell.
export function curatedForLayer(layerId, count = 30) {
  const role = LAYER_ROLES[layerId];
  if (!role) return [];
  const pool = PCOLORS.filter(c => inBand(c, role));
  const cells = new Map();
  for (const c of pool) {
    const key = `${Math.round(c.h / 18)}|${Math.round(c.l * 11)}|${Math.round(c.s * 4)}`;
    const prev = cells.get(key);
    // prefer the more chromatic swatch in a cell — it names the family better
    if (!prev || c.s > prev.s) cells.set(key, c);
  }
  return [...cells.values()]
    .sort((a, b) => (a.h - b.h) || (b.l - a.l))
    .slice(0, count);
}

// ── browse axes: hue family, tone, value ───────────────────────
// Three orthogonal ways to narrow 2,310 swatches, named the way people
// describe color out loud rather than in HSL. The hue bands are the
// same cuts the Pantone Library page uses, so a family means the same
// thing in both places.
export const HUE_FAMILIES = [
  { id: 'Red',     dot: '#c1392b' }, { id: 'Orange',  dot: '#e07b2f' },
  { id: 'Yellow',  dot: '#e8c53d' }, { id: 'Green',   dot: '#4a8b46' },
  { id: 'Teal',    dot: '#2f8f86' }, { id: 'Blue',    dot: '#3763a8' },
  { id: 'Purple',  dot: '#6b4c9a' }, { id: 'Pink',    dot: '#c8608f' },
  { id: 'Neutral', dot: '#a89c8e' }, { id: 'White',   dot: '#eeece6' },
  { id: 'Black',   dot: '#2a2a2c' },
];

export function familyOf(c) {
  const { h, s, l } = c;
  // Pantone near-whites are *tinted* by design — that is what makes them
  // Snow White rather than #fff — so White needs a loose chroma tolerance
  // and a low lightness floor. At l > .86 the band held only 18 swatches
  // and filed Light Gray under Yellow; l > .82 doubles it to 38 without
  // stealing anything that reads as a hue.
  if (l > 0.82 && s < 0.22) return 'White';
  // Black needs the same chroma guard White has. Without it the lightness
  // test fires first and swallows twelve fully-saturated deep teals and
  // blues — Storm, Alpine Green, Everglade, Deep Lagoon, Sailor Blue — the
  // exact swatches a night-mode map reaches for as water.
  if (l < 0.20 && s < 0.45) return 'Black';
  if (s < 0.14) return 'Neutral';
  if (h < 15 || h >= 345) return 'Red';
  if (h < 40)  return 'Orange';
  if (h < 70)  return 'Yellow';
  if (h < 160) return 'Green';
  if (h < 195) return 'Teal';
  if (h < 255) return 'Blue';
  if (h < 290) return 'Purple';
  return 'Pink';
}

// Saturation, in the words a designer actually uses. "Muted" is the
// basemap register; "Vivid" is where data layers live.
export const TONE_BANDS = [
  { id: 'muted',  label: 'Muted',  test: c => c.s < 0.25 },
  { id: 'soft',   label: 'Soft',   test: c => c.s >= 0.25 && c.s < 0.55 },
  { id: 'vivid',  label: 'Vivid',  test: c => c.s >= 0.55 },
];

export const VALUE_BANDS = [
  { id: 'light',  label: 'Light',  test: c => c.l >= 0.70 },
  { id: 'mid',    label: 'Mid',    test: c => c.l >= 0.35 && c.l < 0.70 },
  { id: 'dark',   label: 'Dark',   test: c => c.l < 0.35 },
];

// Spectrum order: chromatic families sweep the wheel, achromatics fall
// to the end light-to-dark. This is what makes 2,310 swatches browsable
// instead of a wall of noise.
export function spectrumSort(a, b) {
  const ach = c => { const f = familyOf(c); return f === 'White' || f === 'Black' || f === 'Neutral'; };
  const aa = ach(a), ba = ach(b);
  if (aa !== ba) return aa ? 1 : -1;
  if (aa) return b.l - a.l;
  if (Math.abs(a.h - b.h) > 0.5) return a.h - b.h;
  return b.l - a.l;
}

// ── contrast (WCAG 2.1) ────────────────────────────────────────
export function relLuminance(hex) {
  const v = hex.replace('#', '');
  const ch = [0, 2, 4].map(i => {
    let c = parseInt(v.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrastRatio(a, b) {
  const l1 = relLuminance(a), l2 = relLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Two adjacent fills separated by less than this are being told apart
// on hue alone — which fails for ~8% of men, in grayscale print, and
// under projection. That is precisely the case patterns exist to answer.
export const FILL_SEPARATION_MIN = 1.2;
