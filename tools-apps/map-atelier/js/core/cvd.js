// ═══════════════════════════════════════════════════════════════
// COLOR VISION DEFICIENCY SIMULATION — Brettel, Viénot & Mollon (1997)
// Pure functions.
//
// The North Star metric ("% of legends passing a colorblind check
// without manual rework") needs something to check against. This is it.
//
// Method: convert to LMS cone response, project onto the plane of
// colors the missing cone type can still distinguish, convert back.
// Protan and deutan share one projection plane each; tritan needs two
// half-planes, which is why it gets separate anchor handling below.
//
// Deliberately NOT the Machado (2009) matrices — those are tuned for
// *anomalous* trichromacy (mild cases). Dichromacy is the worst case,
// and a legend should be designed against the worst case.
// ═══════════════════════════════════════════════════════════════
import { hexToRgb, rgbToHex } from './oklch.js';

export const CVD_TYPES = [
  { id: 'deuteranopia', label: 'Deuteranopia', hint: 'no green cone — ~6% of men, the most common' },
  { id: 'protanopia',   label: 'Protanopia',   hint: 'no red cone — reds darken toward black' },
  { id: 'tritanopia',   label: 'Tritanopia',   hint: 'no blue cone — rare, but blue/green collapse' },
];

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c) {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Hunt-Pointer-Estévez, normalized to D65.
function linRgbToLms(r, g, b) {
  return [
    0.31399022 * r + 0.63951294 * g + 0.04649755 * b,
    0.15537241 * r + 0.75789446 * g + 0.08670142 * b,
    0.01775239 * r + 0.10944209 * g + 0.87256922 * b,
  ];
}
function lmsToLinRgb(l, m, s) {
  return [
    +5.47221206 * l - 4.64196010 * m + 0.16963708 * s,
    -1.12524190 * l + 2.29317094 * m - 0.16789520 * s,
    +0.02980165 * l - 0.19318073 * m + 1.16364789 * s,
  ];
}

// Anchor stimuli: the two wavelengths each dichromat still perceives
// correctly (475nm / 575nm for protan+deutan, 485nm / 660nm for tritan).
// The projection plane is spanned by white and one anchor; which anchor
// applies depends on which side of the white-anchor plane the color sits.
const ANCHORS = {
  protanopia:   { a: [0.08008, 0.15790, 0.55364], b: [0.16790, 0.07790, 0.02650] },
  deuteranopia: { a: [0.08008, 0.15790, 0.55364], b: [0.16790, 0.07790, 0.02650] },
  tritanopia:   { a: [0.09754, 0.19519, 0.72182], b: [0.16849, 0.07958, 0.01480] },
};

const WHITE_LMS = linRgbToLms(1, 1, 1);

function project(lms, type) {
  const [L, M, S] = lms;
  const { a, b } = ANCHORS[type];
  const w = WHITE_LMS;

  // Normal of the plane through origin, white, and each anchor.
  const planeNormal = anchor => [
    w[1] * anchor[2] - w[2] * anchor[1],
    w[2] * anchor[0] - w[0] * anchor[2],
    w[0] * anchor[1] - w[1] * anchor[0],
  ];

  // Pick the half-plane this color falls in, using the *missing* cone's
  // axis as the discriminant.
  const nA = planeNormal(a);
  const sideAxis = type === 'tritanopia' ? 2 : (type === 'protanopia' ? 0 : 1);
  const dot = nA[0] * L + nA[1] * M + nA[2] * S;
  const n = dot < 0 ? planeNormal(a) : planeNormal(b);

  // Solve the missing cone's value so the point lies on the plane.
  if (sideAxis === 0) return [-(n[1] * M + n[2] * S) / n[0], M, S];
  if (sideAxis === 1) return [L, -(n[0] * L + n[2] * S) / n[1], S];
  return [L, M, -(n[0] * L + n[1] * M) / n[2]];
}

export function simulateCVD(hex, type) {
  if (!CVD_TYPES.some(t => t.id === type)) return hex;
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  const lms = linRgbToLms(r, g, b);
  const [L2, M2, S2] = project(lms, type);
  return rgbToHex(...lmsToLinRgb(L2, M2, S2).map(linearToSrgb));
}

// Simulate a whole legend at once — one array per deficiency type.
export function simulateAll(hexes) {
  return CVD_TYPES.reduce((acc, t) => {
    acc[t.id] = hexes.map(h => simulateCVD(h, t.id));
    return acc;
  }, {});
}
