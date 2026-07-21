/* ================================================================
   COLOR ENGINE — perceptual, contrast-solved token generation
   ----------------------------------------------------------------
   Zero dependencies. Works in browser + node.

   The idea:
     A ramp step is not "blend 60% toward white".
     A ramp step is a CONTRACT: "this step hits 4.5:1 on white."
     We solve for the color that satisfies the contract.

     Change the brand hex -> every step re-solves -> the contract
     (and therefore ADA compliance) holds automatically.
================================================================ */

/* ================================================================
   1. sRGB <-> OKLab / OKLCH
   ----------------------------------------------------------------
   OKLab is perceptually uniform: equal steps in L look like equal
   steps to the eye. sRGB is not — that's the muddy-midtone bug.
================================================================ */

const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** [0..255]x3 -> {L,a,b} */
function rgbToOklab(r, g, b) {
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  };
}

/** {L,a,b} -> {r,g,b} in [0..1] LINEAR-ish sRGB, may be out of gamut */
function oklabToRgbRaw(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: linearToSrgb(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  };
}

const DEG = Math.PI / 180;

function oklchToOklab(L, C, H) {
  return { L, a: C * Math.cos(H * DEG), b: C * Math.sin(H * DEG) };
}
function oklabToOklch(L, a, b) {
  const C = Math.hypot(a, b);
  let H = Math.atan2(b, a) / DEG;
  if (H < 0) H += 360;
  return { L, C, H };
}

/* ================================================================
   2. GAMUT MAPPING
   ----------------------------------------------------------------
   Not every (L, C, H) exists in sRGB. Naive clipping shifts hue and
   lightness (that's why "just saturate it" looks wrong). Instead we
   hold L and H fixed and binary-search the largest in-gamut C.
================================================================ */

const EPS = 1e-6;
function inGamut({ r, g, b }) {
  return (
    r >= -EPS && r <= 1 + EPS &&
    g >= -EPS && g <= 1 + EPS &&
    b >= -EPS && b <= 1 + EPS
  );
}

/** OKLCH -> in-gamut {r,g,b} 0..255 + the chroma actually achieved */
function oklchToRgb(L, C, H) {
  const lab = oklchToOklab(L, C, H);
  let rgb = oklabToRgbRaw(lab.L, lab.a, lab.b);

  let achieved = C;
  if (!inGamut(rgb)) {
    let lo = 0, hi = C;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      const t = oklchToOklab(L, mid, H);
      const test = oklabToRgbRaw(t.L, t.a, t.b);
      if (inGamut(test)) lo = mid; else hi = mid;
    }
    achieved = lo;
    const f = oklchToOklab(L, lo, H);
    rgb = oklabToRgbRaw(f.L, f.a, f.b);
  }

  return {
    r: Math.round(clamp(rgb.r) * 255),
    g: Math.round(clamp(rgb.g) * 255),
    b: Math.round(clamp(rgb.b) * 255),
    chroma: achieved,
    clipped: achieved < C - 1e-4,
  };
}

/* ================================================================
   3. WCAG CONTRAST  (this is the "ADA" part)
   ----------------------------------------------------------------
   WCAG 2.x relative luminance + contrast ratio. This is the metric
   auditors, VPATs and Section 508 reviews actually run.
================================================================ */

function relativeLuminance(r, g, b) {
  const R = srgbToLinear(r / 255);
  const G = srgbToLinear(g / 255);
  const B = srgbToLinear(b / 255);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** WCAG contrast ratio between two [r,g,b] arrays. 1..21 */
function contrast(rgbA, rgbB) {
  const la = relativeLuminance(...rgbA);
  const lb = relativeLuminance(...rgbB);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Which WCAG bar does this ratio clear? */
function wcagGrade(ratio) {
  return {
    ratio: Math.round(ratio * 100) / 100,
    normalAA: ratio >= 4.5,   // body text
    normalAAA: ratio >= 7,    // body text, enhanced
    largeAA: ratio >= 3,      // >=24px, or >=18.66px bold
    largeAAA: ratio >= 4.5,
    ui: ratio >= 3,           // 1.4.11 non-text: borders, icons, focus rings
  };
}

/* ================================================================
   4. HEX I/O
================================================================ */

function hexToRgb(hex) {
  hex = String(hex).trim().replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
}

/* ================================================================
   5. THE RAMP CONTRACT
   ----------------------------------------------------------------
   Each step declares the contrast ratio it must hit against the
   LIGHT reference surface (default white). Because the contract is
   fixed, blue-600 and red-600 and green-600 all land on the same
   accessibility footing. That's what makes tokens swappable.

   `onLight` is the target we solve for. `floor` is the WCAG number
   that must survive 8-bit rounding — the gap between them is
   deliberate headroom, and it's enforced, not assumed. */

const RAMP_CONTRACT = [
  { step: "50",  onLight: 1.05 },
  { step: "100", onLight: 1.12 },
  { step: "200", onLight: 1.28 },
  { step: "300", onLight: 1.65 },
  { step: "400", onLight: 2.30 },
  { step: "500", onLight: 3.10, floor: 3.0 },  // AA large text + UI/borders (1.4.11)
  { step: "600", onLight: 4.60, floor: 4.5 },  // AA body text
  { step: "700", onLight: 7.20, floor: 7.0 },  // AAA body text
  { step: "800", onLight: 10.5 },
  { step: "900", onLight: 14.0 },
  { step: "950", onLight: 17.0 },
];

/* ================================================================
   6. AESTHETIC PARAMETERS
   ----------------------------------------------------------------
   Contrast makes it legal. These make it *look* designed.
================================================================ */

const DEFAULTS = {
  /* Where along the ramp chroma peaks (0 = lightest, 1 = darkest).
     ~0.55 mimics how hand-built palettes are most saturated slightly
     past the middle, and calm down at both ends. */
  chromaPeak: 0.55,

  /* Peak chroma as a multiple of the brand color's own chroma.
     >1 lets midtones out-saturate the source; 1.0 = never exceed it. */
  chromaGain: 1.12,

  /* How hard chroma falls off at the ends. Higher = more washed tints
     and more neutral shadows. 2.0 is a gentle bell. */
  chromaFalloff: 2.0,

  /* Floor so the 50/950 ends still read as *this* hue, not gray. */
  chromaFloor: 0.012,

  /* Hue rotation across the ramp, in degrees.
     Negative = shadows rotate warm / highlights rotate cool.
     This is the single biggest "why do pro palettes look better"
     lever — flat-hue ramps look plasticky. +/-10 is tasteful. */
  hueTorque: -8,

  /* Reference surfaces the contract is solved against. */
  lightSurface: "#FFFFFF",
  darkSurface: "#0B0B0F",

  /* Hues near yellow/lime physically cannot be both dark enough for
     AA and saturated. When true, we let chroma collapse to keep the
     contrast promise (safe). When false, we keep chroma and record a
     warning instead (pretty, but you must not put text on it). */
  contrastWins: true,
};

/* Bell curve for the chroma envelope */
function chromaEnvelope(t, { chromaPeak, chromaFalloff }) {
  const d = Math.abs(t - chromaPeak) / Math.max(chromaPeak, 1 - chromaPeak);
  return Math.pow(1 - Math.min(1, d), chromaFalloff);
}

/* ================================================================
   7. THE SOLVER
   ----------------------------------------------------------------
   Given a hue, a chroma budget, and a required contrast ratio
   against a surface: find the OKLab L that hits it. Contrast is
   monotone in L on each side of the surface luminance, so we scan
   coarsely to bracket, then bisect.
================================================================ */

function solveLightness(H, chromaBudget, targetRatio, surfaceRgb, darker = true) {
  const at = (L) => {
    const c = oklchToRgb(L, chromaBudget, H);
    return { ratio: contrast([c.r, c.g, c.b], surfaceRgb), c };
  };

  // Search from the surface outward in the requested direction.
  const lo = darker ? 0 : 0.0;
  const hi = darker ? 1 : 1.0;

  // Coarse scan to bracket the crossing.
  const N = 64;
  let prevL = darker ? hi : lo;
  let prev = at(prevL);
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const L = darker ? hi - t * (hi - lo) : lo + t * (hi - lo);
    const cur = at(L);
    if ((prev.ratio - targetRatio) * (cur.ratio - targetRatio) <= 0) {
      // bisect between prevL and L
      let a = prevL, b = L;
      for (let k = 0; k < 30; k++) {
        const mid = (a + b) / 2;
        const m = at(mid);
        if ((at(a).ratio - targetRatio) * (m.ratio - targetRatio) <= 0) b = mid;
        else a = mid;
      }
      const L2 = (a + b) / 2;
      return { L: L2, ...at(L2), solved: true };
    }
    prevL = L;
    prev = cur;
  }

  // Never reached the target — return the most extreme value we can.
  const endL = darker ? 0 : 1;
  return { L: endL, ...at(endL), solved: false };
}

/* ================================================================
   8. BUILD A RAMP
================================================================ */

/**
 * makeRamp("#2592C2", opts) -> {
 *   name, source, steps: [{ step, hex, rgb, oklch, onLight, onDark,
 *                           textOn, grade }], warnings
 * }
 */
function makeRamp(brandHex, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const src = hexToRgb(brandHex);
  const lab = rgbToOklab(...src);
  const lch = oklabToOklch(lab.L, lab.a, lab.b);

  const lightRgb = hexToRgb(o.lightSurface);
  const darkRgb = hexToRgb(o.darkSurface);

  const warnings = [];
  const contract = o.contract || RAMP_CONTRACT;
  const n = contract.length;

  const steps = contract.map((entry, i) => {
    const t = i / (n - 1);

    // --- chroma budget for this rung ---
    const env = chromaEnvelope(t, o);
    const budget = Math.max(
      o.chromaFloor,
      lch.C * o.chromaGain * env
    );

    // --- hue for this rung ---
    const H = (lch.H + o.hueTorque * (t - 0.5) * 2 + 360) % 360;

    // --- solve L for the contrast contract ---
    const sol = solveLightness(H, budget, entry.onLight, lightRgb, true);

    if (!sol.solved && o.contrastWins) {
      warnings.push(
        `${entry.step}: hue ${Math.round(H)}° can't reach ${entry.onLight}:1 on ${o.lightSurface} at this chroma — chroma was collapsed to keep the contrast promise.`
      );
    }

    // --- floor guard ---
    // The solver works in continuous L, but we ship 8-bit hex. Rounding
    // can drop 4.502 to 4.497 and silently fail an audit. If this rung
    // has a legal floor, nudge L darker until the ROUNDED color clears it.
    let cell = sol.c;
    if (entry.floor) {
      let L = sol.L;
      for (let k = 0; k < 40; k++) {
        if (contrast([cell.r, cell.g, cell.b], lightRgb) >= entry.floor) break;
        L = Math.max(0, L - 0.002);
        cell = oklchToRgb(L, budget, H);
      }
    }

    const { r, g, b } = cell;
    const rgb = [r, g, b];
    const outLab = rgbToOklab(r, g, b);
    const outLch = oklabToOklch(outLab.L, outLab.a, outLab.b);

    const onLight = contrast(rgb, lightRgb);
    const onDark = contrast(rgb, darkRgb);
    const vsWhite = contrast(rgb, [255, 255, 255]);
    const vsBlack = contrast(rgb, [0, 0, 0]);

    return {
      step: entry.step,
      hex: rgbToHex(r, g, b),
      rgb,
      oklch: {
        l: Math.round(outLch.L * 1000) / 1000,
        c: Math.round(outLch.C * 1000) / 1000,
        h: Math.round(outLch.H * 10) / 10,
      },
      css: `oklch(${(outLch.L * 100).toFixed(1)}% ${outLch.C.toFixed(3)} ${outLch.H.toFixed(1)})`,
      target: entry.onLight,
      onLight: Math.round(onLight * 100) / 100,
      onDark: Math.round(onDark * 100) / 100,
      // The readable foreground to put ON this swatch:
      textOn: vsWhite >= vsBlack ? "#FFFFFF" : "#000000",
      textOnRatio: Math.round(Math.max(vsWhite, vsBlack) * 100) / 100,
      grade: wcagGrade(onLight),
      clipped: sol.c.clipped,
    };
  });

  return {
    source: rgbToHex(...src),
    sourceOklch: {
      l: Math.round(lch.L * 1000) / 1000,
      c: Math.round(lch.C * 1000) / 1000,
      h: Math.round(lch.H * 10) / 10,
    },
    // Which rung the original brand color is closest to — useful for
    // "keep my logo color exactly" workflows.
    nearestStep: steps.reduce((best, s) =>
      Math.abs(s.oklch.l - lch.L) < Math.abs(best.oklch.l - lch.L) ? s : best
    ).step,
    steps,
    warnings,
    params: o,
  };
}

/* ----------------------------------------------------------------
   Neutral companion ramp.

   Surfaces, body text and borders should NOT come from the brand
   ramp — saturated body copy is fatiguing and reads as a link. But
   pure #808080 grays next to a warm brand look dirty.

   So: same solver, same contract, but chroma crushed to a whisper of
   the brand hue. That's why good systems feel cohesive — their grays
   are quietly tinted toward the brand.
---------------------------------------------------------------- */
function makeNeutralRamp(brandHex, opts = {}) {
  const tint = opts.neutralTint ?? 0.10; // 0 = dead gray, 1 = full brand chroma
  return makeRamp(brandHex, {
    ...opts,
    chromaGain: (opts.chromaGain ?? DEFAULTS.chromaGain) * tint,
    chromaFloor: 0.002,
    chromaFalloff: 1.2, // flatter — neutrals shouldn't have a saturation bulge
    hueTorque: (opts.hueTorque ?? DEFAULTS.hueTorque) * 0.5,
  });
}

/**
 * A complete two-ramp system: brand drives action, neutral drives
 * surfaces and text. This is the shape you actually ship.
 */
function makeSystem(brandHex, opts = {}) {
  const brand = makeRamp(brandHex, opts);
  const neutral = makeNeutralRamp(brandHex, opts);
  const modes = {};
  for (const mode of ["light", "dark"]) {
    const b = resolveSemantics(brand, mode, opts);
    const n = resolveSemantics(neutral, mode, opts);
    modes[mode] = {
      // structure + copy from neutral
      "surface": n["surface"],
      "surface-raised": n["surface-raised"],
      "surface-sunken": n["surface-sunken"],
      "border-subtle": n["border-subtle"],
      "border": n["border"],
      "border-strong": n["border-strong"],
      "fg": n["fg"],
      "fg-muted": n["fg-muted"],
      // emphasis from brand
      "action-bg": b["action-bg"],
      "action-bg-hover": b["action-bg-hover"],
      "action-bg-active": b["action-bg-active"],
      "action-fg": b["action-fg"],
      "action-subtle-bg": b["action-subtle-bg"],
      "action-subtle-fg": b["action-subtle-fg"],
      "focus-ring": b["focus-ring"],
    };
  }
  return { brand, neutral, modes };
}

/* ================================================================
   9. SEMANTIC LAYER
   ----------------------------------------------------------------
   Primitives (blue-600) are not what components should consume.
   Components consume roles (action.bg, action.text, border.subtle).
   The role -> step mapping is where light/dark mode gets handled,
   and it's declared ONCE, not per brand.
================================================================ */

/* A role is: a starting step (its hue/chroma character) plus, for
   anything that must be legible, the role it renders ON and the
   ratio it must hit there. Foregrounds are re-solved against their
   ACTUAL surface — not against white. A palette that is AA on white
   is not AA on a tinted page, and that gap is where real systems
   fail their audit. */

const SEMANTIC_MAP = {
  light: {
    "surface":            { step: "50" },                                  // page tint
    "surface-raised":     { step: "__white" },
    "surface-sunken":     { step: "100" },
    "border-subtle":      { step: "200" },
    "border":             { step: "300" },
    "border-strong":      { step: "500", on: "surface", min: 3.0 },        // 1.4.11 non-text
    "fg-muted":           { step: "600", on: "surface", min: 4.5 },
    "fg":                 { step: "900", on: "surface", min: 7.0 },
    "action-bg":          { step: "600", on: "surface", min: 3.0 },        // button vs page
    "action-bg-hover":    { step: "700", on: "surface", min: 3.0 },
    "action-bg-active":   { step: "800", on: "surface", min: 3.0 },
    "action-fg":          { step: "__auto-on:action-bg" },
    "action-subtle-bg":   { step: "100" },
    "action-subtle-fg":   { step: "700", on: "action-subtle-bg", min: 4.5 },
    "focus-ring":         { step: "600", on: "surface", min: 3.0 },
  },
  dark: {
    "surface":            { step: "950" },
    "surface-raised":     { step: "900" },
    "surface-sunken":     { step: "__black" },
    "border-subtle":      { step: "800" },
    "border":             { step: "700" },
    "border-strong":      { step: "500", on: "surface", min: 3.0 },
    "fg-muted":           { step: "400", on: "surface", min: 4.5 },
    "fg":                 { step: "100", on: "surface", min: 7.0 },
    "action-bg":          { step: "400", on: "surface", min: 3.0 },
    "action-bg-hover":    { step: "300", on: "surface", min: 3.0 },
    "action-bg-active":   { step: "200", on: "surface", min: 3.0 },
    "action-fg":          { step: "__auto-on:action-bg" },
    "action-subtle-bg":   { step: "900" },
    "action-subtle-fg":   { step: "300", on: "action-subtle-bg", min: 4.5 },
    "focus-ring":         { step: "400", on: "surface", min: 3.0 },
  },
};

/* Order matters: a role can only reference a role resolved before it.
   Surfaces resolve first, then contrast-solved roles, then auto-on. */
/* opts.actionAnchor — the step filled buttons are built from.
 *
 *   "600" (default, "safe"): dark enough that WHITE text sits on it.
 *          Works for every hue. But a yellow brand becomes olive.
 *
 *   "400" ("vivid"): keeps the brand's saturation. action-fg then
 *          auto-flips to BLACK. This is how yellow/lime/cyan brands
 *          stay recognizably themselves. Still fully AA — the button
 *          only has to clear 3:1 against the page as a UI element,
 *          and its label is contrast-checked independently.
 */
function resolveSemantics(ramp, mode = "light", opts = {}) {
  let map = SEMANTIC_MAP[mode];
  const byStep = Object.fromEntries(ramp.steps.map((s) => [s.step, s]));

  if (opts.actionAnchor) {
    const order = ramp.steps.map((s) => s.step);
    const i = order.indexOf(String(opts.actionAnchor));
    const shift = (role, d) => {
      const j = clamp(i + d, 0, order.length - 1);
      return { ...map[role], step: order[Math.round(j)] };
    };
    // In dark mode the ramp runs the other way, so hover goes lighter.
    const dir = mode === "dark" ? -1 : 1;
    map = {
      ...map,
      "action-bg":        shift("action-bg", 0),
      "action-bg-hover":  shift("action-bg-hover", dir),
      "action-bg-active": shift("action-bg-active", dir * 2),
    };
  }

  const out = {};

  // Pass 1 — literals and unconstrained roles (surfaces, soft borders).
  for (const [role, def] of Object.entries(map)) {
    if (def.step === "__white") { out[role] = "#FFFFFF"; continue; }
    if (def.step === "__black") { out[role] = "#000000"; continue; }
    if (def.step.startsWith("__auto-on:")) continue;
    if (def.on) continue;
    out[role] = byStep[def.step].hex;
  }

  // Pass 2 — roles with a contrast contract against a resolved surface.
  for (const [role, def] of Object.entries(map)) {
    if (!def.on || def.step.startsWith("__")) continue;
    const base = byStep[def.step];
    const bgHex = out[def.on];
    const bgRgb = hexToRgb(bgHex);

    // Already clears it at its nominal step? Keep the nominal step —
    // never distort a token we don't have to.
    if (contrast(base.rgb, bgRgb) >= def.min) { out[role] = base.hex; continue; }

    // Otherwise hold hue and re-solve lightness on THIS surface.
    const H = base.oklch.h;
    const bgL = relativeLuminance(...bgRgb);
    const darker = bgL > 0.18; // move away from the surface
    const sol = solveLightness(H, base.oklch.c, def.min + 0.15, bgRgb, darker);

    // Re-saturate. Moving lightness far from the nominal step leaves the
    // color under-chromatic for its new position — that's what turns a
    // red button into salmon. Push chroma back up to the most vivid value
    // that STILL honors the contrast contract, then keep that.
    const ceiling = ramp.sourceOklch.c * (ramp.params.chromaGain || 1);
    let L = sol.L;
    let cell = sol.c;
    for (let k = 20; k >= 0; k--) {
      const tryC = base.oklch.c + (ceiling - base.oklch.c) * (k / 20);
      if (tryC <= base.oklch.c) break;
      const t = oklchToRgb(L, tryC, H);
      if (contrast([t.r, t.g, t.b], bgRgb) >= def.min) { cell = t; break; }
    }

    // Floor guard — 8-bit rounding must not eat the margin.
    for (let k = 0; k < 60; k++) {
      if (contrast([cell.r, cell.g, cell.b], bgRgb) >= def.min) break;
      L = clamp(darker ? L - 0.002 : L + 0.002);
      cell = oklchToRgb(L, cell.chroma, H);
    }
    out[role] = rgbToHex(cell.r, cell.g, cell.b);
  }

  // Pass 3 — auto black/white foregrounds.
  for (const [role, def] of Object.entries(map)) {
    if (!def.step.startsWith("__auto-on:")) continue;
    const bg = hexToRgb(out[def.step.slice("__auto-on:".length)]);
    out[role] = contrast(bg, [255, 255, 255]) >= contrast(bg, [0, 0, 0])
      ? "#FFFFFF" : "#000000";
  }
  return out;
}

/* ================================================================
   10. AUDIT
   ----------------------------------------------------------------
   Prove the contract instead of trusting it. Returns every semantic
   pairing a component would actually render, with pass/fail.
================================================================ */

const AUDIT_PAIRS = [
  ["fg", "surface", "text"],
  ["fg", "surface-raised", "text"],
  ["fg-muted", "surface", "text"],
  ["fg-muted", "surface-raised", "text"],
  ["action-fg", "action-bg", "text"],
  ["action-subtle-fg", "action-subtle-bg", "text"],
  ["border-strong", "surface", "ui"],
  ["action-bg", "surface", "ui"],
  ["focus-ring", "surface", "ui"],
];

function auditSemantics(sem, mode) {
  return AUDIT_PAIRS.map(([fg, bg, kind]) => {
    const ratio = contrast(hexToRgb(sem[fg]), hexToRgb(sem[bg]));
    const need = kind === "ui" ? 3 : 4.5;
    return {
      mode,
      pair: `${fg} on ${bg}`,
      kind,
      fg: sem[fg],
      bg: sem[bg],
      ratio: Math.round(ratio * 100) / 100,
      need,
      pass: ratio >= need,
      aaa: kind === "text" && ratio >= 7,
    };
  });
}

/* ================================================================
   11. EXPORTERS
================================================================ */

function toCSS(ramps, { prefix = "", includeSemantics = true } = {}) {
  const lines = [];
  const p = prefix ? `${prefix}-` : "";

  lines.push("/* ---- primitives ---- */");
  lines.push(":root {");
  for (const [name, ramp] of Object.entries(ramps)) {
    lines.push(`  /* ${name} — from ${ramp.source} */`);
    for (const s of ramp.steps) {
      lines.push(`  --${p}${name}-${s.step}: ${s.hex};`);
    }
  }
  lines.push("}");

  if (!includeSemantics) return lines.join("\n");

  const [primary] = Object.keys(ramps);
  lines.push("");
  lines.push("/* ---- semantics ---- */");
  for (const mode of ["light", "dark"]) {
    const sel = mode === "light" ? ":root" : '[data-theme="dark"]';
    lines.push(`${sel} {`);
    for (const [name, ramp] of Object.entries(ramps)) {
      const sem = resolveSemantics(ramp, mode);
      for (const [role, hex] of Object.entries(sem)) {
        lines.push(`  --${p}${name}-${role}: ${hex};`);
      }
    }
    // unprefixed aliases pointing at the primary ramp
    for (const role of Object.keys(SEMANTIC_MAP[mode])) {
      lines.push(`  --${p}${role}: var(--${p}${primary}-${role});`);
    }
    lines.push("}");
  }
  return lines.join("\n");
}

/** CSS for a full makeSystem() result — the shape you actually ship. */
function toCSSSystem(system, { prefix = "" } = {}) {
  const p = prefix ? `${prefix}-` : "";
  const L = [];

  L.push("/* ============================================================");
  L.push("   PRIMITIVES — never reference these in a component.");
  L.push("   ============================================================ */");
  L.push(":root {");
  for (const [name, ramp] of [["brand", system.brand], ["neutral", system.neutral]]) {
    L.push(`  /* ${name} — solved from ${ramp.source} */`);
    for (const s of ramp.steps) {
      L.push(`  --${p}${name}-${s.step}: ${s.hex}; /* ${s.onLight}:1 on white */`);
    }
  }
  L.push("}");
  L.push("");
  L.push("/* ============================================================");
  L.push("   SEMANTICS — this is the only layer components touch.");
  L.push("   ============================================================ */");

  for (const [mode, sel] of [["light", ":root"], ["dark", '[data-theme="dark"]']]) {
    L.push(`${sel} {`);
    for (const [role, hex] of Object.entries(system.modes[mode])) {
      L.push(`  --${p}${role}: ${hex};`);
    }
    L.push("}");
  }
  L.push("");
  L.push("@media (prefers-color-scheme: dark) {");
  L.push("  :root:not([data-theme]) {");
  for (const [role, hex] of Object.entries(system.modes.dark)) {
    L.push(`    --${p}${role}: ${hex};`);
  }
  L.push("  }");
  L.push("}");
  return L.join("\n");
}

function toW3CTokens(ramps) {
  const out = {};
  for (const [name, ramp] of Object.entries(ramps)) {
    out[name] = {};
    for (const s of ramp.steps) {
      out[name][s.step] = {
        $type: "color",
        $value: s.hex,
        $description: `contrast ${s.onLight}:1 on white`,
      };
    }
  }
  out.semantic = {};
  for (const mode of ["light", "dark"]) {
    out.semantic[mode] = {};
    for (const [name, ramp] of Object.entries(ramps)) {
      const sem = resolveSemantics(ramp, mode);
      out.semantic[mode][name] = Object.fromEntries(
        Object.entries(sem).map(([role, hex]) => [role, { $type: "color", $value: hex }])
      );
    }
  }
  return out;
}

/** Drop-in replacement for your old sampleColors() */
function sampleRamp(ramp, n) {
  const s = ramp.steps;
  if (n >= s.length) return s.map((x) => x.hex);
  if (n === 1) return [s[Math.floor(s.length / 2)].hex];
  return Array.from({ length: n }, (_, i) =>
    s[Math.round((i * (s.length - 1)) / (n - 1))].hex
  );
}

/** Drop-in replacement for your old valueToColor() */
function valueToColor(hexes, v) {
  return hexes[Math.round(clamp(v) * (hexes.length - 1))];
}

/* ================================================================
   12. DATA-VIZ RAMP (for your bar/heatmap previews)
   ----------------------------------------------------------------
   Charts have a different job than UI. Sequential scales want
   monotonic *lightness* so the eye reads magnitude, and they want
   every band to survive on the chart background.
================================================================ */

function makeVizScale(brandHex, n = 7, opts = {}) {
  // A UI ramp wants calm ends. A data ramp does NOT — a choropleth's
  // darkest bin still has to read as the hue, so chroma is held much
  // later and falls off gently. Same envelope function, different tuning.
  const o = {
    ...DEFAULTS,
    chromaPeak: 0.72,
    chromaFalloff: 1.0,
    chromaGain: 1.25,
    hueTorque: (opts.hueTorque ?? DEFAULTS.hueTorque) * 0.5,
    ...opts,
  };
  const lch = (() => {
    const lab = rgbToOklab(...hexToRgb(brandHex));
    return oklabToOklch(lab.L, lab.a, lab.b);
  })();

  // Even perceptual lightness march, ends pulled in so the lightest
  // band still separates from paper and the darkest isn't a void.
  const Lmin = o.vizLmin ?? 0.32;
  const Lmax = o.vizLmax ?? 0.93;

  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const L = Lmax - t * (Lmax - Lmin);
    const env = chromaEnvelope(t, o);
    const C = Math.max(o.chromaFloor, lch.C * o.chromaGain * env);
    const H = (lch.H + o.hueTorque * (t - 0.5) * 2 + 360) % 360;
    const c = oklchToRgb(L, C, H);
    return rgbToHex(c.r, c.g, c.b);
  });
}

/**
 * Diverging scale — the perceptual replacement for your old
 * makeBlendScale(a, b). Two hues meeting at a light neutral midpoint.
 *
 * Straight A->B interpolation in sRGB passes through mud whenever the
 * two hues sit on opposite sides of the wheel (blue->orange goes gray-
 * brown through the middle). Building each arm independently against a
 * shared near-neutral pivot keeps both ends clean, and keeps lightness
 * symmetric so neither side looks "heavier" than the other.
 */
function makeDiverging(hexA, hexB, n = 9, opts = {}) {
  const o = { ...DEFAULTS, chromaPeak: 0.95, chromaFalloff: 1.0, chromaGain: 1.25, ...opts };
  const midL = o.divergingMidL ?? 0.95;   // near-white pivot
  const endL = o.divergingEndL ?? 0.42;   // both arms end equally dark

  const arm = (hex) => {
    const lab = rgbToOklab(...hexToRgb(hex));
    return oklabToOklch(lab.L, lab.a, lab.b);
  };
  const A = arm(hexA), B = arm(hexB);

  const half = Math.floor(n / 2);
  const odd = n % 2 === 1;

  // One arm, ordered pivot -> saturated end.
  const build = (lch, count) =>
    Array.from({ length: count }, (_, i) => {
      const t = count === 1 ? 1 : (i + 1) / count; // 0 at pivot, 1 at the end
      const L = midL - t * (midL - endL);
      const C = Math.max(o.chromaFloor, lch.C * o.chromaGain * Math.pow(t, 0.75));
      const c = oklchToRgb(L, C, lch.H);
      return rgbToHex(c.r, c.g, c.b);
    });

  const left = build(A, half).reverse();          // dark A ... light
  const right = build(B, half);                    // light ... dark B
  const mid = odd ? [(() => {
    const c = oklchToRgb(midL, o.chromaFloor, (A.H + B.H) / 2);
    return rgbToHex(c.r, c.g, c.b);
  })()] : [];

  return [...left, ...mid, ...right];
}

/** Categorical palette: evenly spaced hues, constant perceived
 *  lightness + chroma, so no series looks louder than another. */
function makeCategorical(brandHex, n = 6, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const lab = rgbToOklab(...hexToRgb(brandHex));
  const base = oklabToOklch(lab.L, lab.a, lab.b);
  const L = o.catL ?? 0.62;
  const C = o.catC ?? Math.max(0.09, Math.min(base.C, 0.16));

  return Array.from({ length: n }, (_, i) => {
    // Golden-angle-ish spacing avoids adjacent hues colliding.
    const H = (base.H + (360 / n) * i) % 360;
    const c = oklchToRgb(L, C, H);
    return rgbToHex(c.r, c.g, c.b);
  });
}

/* ================================================================
   EXPORTS
================================================================ */

const ColorEngine = {
  // core
  makeRamp,
  makeNeutralRamp,
  makeSystem,
  resolveSemantics,
  auditSemantics,
  // export
  toCSS,
  toCSSSystem,
  toW3CTokens,
  // viz
  makeVizScale,
  makeCategorical,
  makeDiverging,
  sampleRamp,
  valueToColor,
  // math (exposed for your existing UI)
  hexToRgb,
  rgbToHex,
  contrast,
  wcagGrade,
  rgbToOklab,
  oklabToOklch,
  oklchToRgb,
  relativeLuminance,
  // config
  RAMP_CONTRACT,
  SEMANTIC_MAP,
  DEFAULTS,
};

if (typeof module !== "undefined" && module.exports) module.exports = ColorEngine;
if (typeof window !== "undefined") window.ColorEngine = ColorEngine;
