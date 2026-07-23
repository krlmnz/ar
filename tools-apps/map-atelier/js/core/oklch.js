// ═══════════════════════════════════════════════════════════════
// OKLCH — perceptual color space. Pure functions, no DOM, no state.
//
// This is the engine core/color.js only pretended to be. HSL
// lightness is not perceptual: hsl(60,100%,50%) (yellow) and
// hsl(240,100%,50%) (blue) claim the same L and differ by ~15x in
// actual luminance. Any scale built on it is uneven by construction.
//
// OKLab (Björn Ottosson, 2020) fixes that — equal L steps read as
// equal lightness steps across every hue, which is the whole premise
// of a generated categorical scale.
//
//   L ∈ [0,1]   perceptual lightness
//   C ∈ [0,~0.4] chroma (unbounded in theory, gamut-bound in sRGB)
//   H ∈ [0,360) hue angle in degrees
// ═══════════════════════════════════════════════════════════════

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

// sRGB transfer function (IEC 61966-2-1), not the 2.2 approximation.
function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ];
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map(v => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0'))
    .join('');
}

// ── sRGB ⇄ OKLab ────────────────────────────────────────────────
export function rgbToOklab(r, g, b) {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

export function oklabToRgb(L, a, bb) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * bb;

  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;

  return [
    linearToSrgb(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  ];
}

// ── OKLab ⇄ OKLCH ───────────────────────────────────────────────
export function hexToOklch(hex) {
  const [L, a, b] = rgbToOklab(...hexToRgb(hex));
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * 180 / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

function oklchToRgbRaw(L, C, H) {
  const rad = H * Math.PI / 180;
  return oklabToRgb(L, C * Math.cos(rad), C * Math.sin(rad));
}

export function inGamut(L, C, H) {
  const [r, g, b] = oklchToRgbRaw(L, C, H);
  const e = 1e-4;
  return r >= -e && r <= 1 + e && g >= -e && g <= 1 + e && b >= -e && b <= 1 + e;
}

// Out-of-gamut OKLCH is common — asking for C=0.25 at L=0.95 is simply
// not a color sRGB can show. Naively clipping RGB channels shifts hue,
// which would break the "same group shares a hue" guarantee. Binary
// search on chroma instead: hue and lightness are preserved exactly,
// and only saturation gives way.
export function gamutClamp(L, C, H) {
  if (inGamut(L, C, H)) return [L, C, H];
  let lo = 0, hi = C;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(L, mid, H)) lo = mid; else hi = mid;
  }
  return [L, lo, H];
}

export function oklchToHex(L, C, H) {
  const [cl, cc, ch] = gamutClamp(clamp01(L), Math.max(0, C), ((H % 360) + 360) % 360);
  return rgbToHex(...oklchToRgbRaw(cl, cc, ch));
}

// Peak chroma sRGB can hold at this lightness and hue. Used to keep
// generated ramps from flattening into grey at their light and dark ends.
export function maxChroma(L, H) {
  return gamutClamp(L, 0.4, H)[1];
}
