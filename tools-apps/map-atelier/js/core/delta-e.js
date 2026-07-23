// ═══════════════════════════════════════════════════════════════
// CIEDE2000 — perceptual color difference. Pure functions.
//
// data/pantone.js ships a weighted-HSL distance and cartography.js
// calls the palettes "Lab-matched" — but no Lab code shipped. This
// is the real thing, and it's what "colors within a group are
// perceptually closer to each other than to other groups" has to be
// measured against.
//
// Rule of thumb for ΔE00:
//   < 1.0   imperceptible to a trained eye
//   1–2.3   perceptible on close inspection ("just noticeable")
//   2.3–10  clearly different at a glance
//   > 10    unrelated colors
// ═══════════════════════════════════════════════════════════════
import { hexToRgb } from './oklch.js';

// D65 white point, 2° observer — the sRGB reference.
const Xn = 95.047, Yn = 100.000, Zn = 108.883;

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function hexToLab(hex) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);

  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) * 100;
  const Y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b) * 100;
  const Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) * 100;

  const f = t => t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29;
  const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;

// Sharma, Wu & Dalal (2005) formulation — the one with the hue-rotation
// term correct. kL/kC/kH left at 1 (graphic-arts reference conditions).
export function ciede2000(hex1, hex2) {
  const [L1, a1, b1] = hexToLab(hex1);
  const [L2, a2, b2] = hexToLab(hex2);

  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;

  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));

  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);

  const hp = (bb, ap) => {
    if (bb === 0 && ap === 0) return 0;
    const h = deg(Math.atan2(bb, ap));
    return h >= 0 ? h : h + 360;
  };
  const h1p = hp(b1, a1p), h2p = hp(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp;
  if (C1p * C2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp) / 2);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;

  let hbarp;
  if (C1p * C2p === 0) hbarp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hbarp = (h1p + h2p + 360) / 2;
  else hbarp = (h1p + h2p - 360) / 2;

  const T = 1
    - 0.17 * Math.cos(rad(hbarp - 30))
    + 0.24 * Math.cos(rad(2 * hbarp))
    + 0.32 * Math.cos(rad(3 * hbarp + 6))
    - 0.20 * Math.cos(rad(4 * hbarp - 63));

  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const Cbarp7 = Math.pow(Cbarp, 7);
  const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
  const RT = -RC * Math.sin(2 * rad(dTheta));

  const Lbarp50 = Math.pow(Lbarp - 50, 2);
  const SL = 1 + (0.015 * Lbarp50) / Math.sqrt(20 + Lbarp50);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;

  return Math.sqrt(
    Math.pow(dLp / SL, 2) +
    Math.pow(dCp / SC, 2) +
    Math.pow(dHp / SH, 2) +
    RT * (dCp / SC) * (dHp / SH)
  );
}

// Smallest ΔE00 between any two members of a set — the number that
// decides whether a legend is readable. Returns the offending pair too,
// because "your scale fails" is useless without "these two are why".
export function minPairwiseDeltaE(hexes) {
  let min = Infinity, pair = [null, null];
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) {
      const d = ciede2000(hexes[i], hexes[j]);
      if (d < min) { min = d; pair = [i, j]; }
    }
  }
  return { min: hexes.length < 2 ? Infinity : min, pair };
}
