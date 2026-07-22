// ═══════════════════════════════════════════════════════════════
// PATTERN SVG — the seamless tiling generator. Pure functions only:
// a pattern instance {style, densityStep, strokeWidth, angle} in, an
// SVG string out. No map, no state, no DOM.
//
// It lives in core/ (not features/) so anything can draw a pattern
// without booting Mapbox — the picker, the layer list, and the
// design-system doc all render from here.
// ═══════════════════════════════════════════════════════════════
export const PTN_T = 64;
const PTN_DIVISORS = [4, 8, 16, 32, 64];
function ptnDPR() { return Math.max(1, Math.min(3, Math.round(window.devicePixelRatio || 2))); }

// Orientation is the carrier of meaning, not decoration. Two habitats
// in *different* categories must differ in orientation; two habitats in
// the same category differ only in intensity (density/weight) at a
// shared orientation. The `group` field is what enforces that in the UI.
export const PTN_STYLES = [
  { id: 'v-hatch',    label: 'Pinstripe', group: 'lines',  axis: 'Vertical',   body: ({ stroke, w, s }) => hatchLines(s, 'v', stroke, w) },
  { id: 'h-hatch',    label: 'Linen',     group: 'lines',  axis: 'Horizontal', body: ({ stroke, w, s }) => hatchLines(s, 'h', stroke, w) },
  { id: 'diag',       label: 'Diag ⟋',    group: 'lines',  axis: 'Diagonal ⟋', body: ({ stroke, w, s }) => diagLines(s, 1, stroke, w) },
  { id: 'diag-back',  label: 'Diag ⟍',    group: 'lines',  axis: 'Diagonal ⟍', body: ({ stroke, w, s }) => diagLines(s, -1, stroke, w) },
  { id: 'grid',       label: 'Lattice',   group: 'grids',  axis: 'Orthogonal', body: ({ stroke, w, s }) => hatchLines(s, 'h', stroke, w) + hatchLines(s, 'v', stroke, w) },
  { id: 'crosshatch', label: 'Cross',     group: 'grids',  axis: 'Crossed',    body: ({ stroke, w, s }) => diagLines(s, 1, stroke, w) + diagLines(s, -1, stroke, w) },
  { id: 'dots',       label: 'Confetti',  group: 'marks',  axis: 'Point grid', body: ({ stroke, w, s }) => dotsField(s, Math.min(w * 0.6, s / 2 - 1), stroke) },
  { id: 'stipple',    label: 'Stipple',   group: 'marks',  axis: 'Scattered',  body: ({ stroke, w, s }) => stippleField(s, Math.max(0.9, w * 0.5), stroke) },
  { id: 'dashes',     label: 'Dashes',    group: 'marks',  axis: 'Broken',     body: ({ stroke, w, s }) => dashField(s, stroke, w) },
  { id: 'waves',      label: 'Waves',     group: 'curves', axis: 'Sinuous',    body: ({ stroke, w, s }) => wavesField(s, stroke, w) },
  { id: 'chevron',    label: 'Chevron',   group: 'curves', axis: 'Zigzag',     body: ({ stroke, w, s }) => chevronField(s, stroke, w) },
];

// Group order = grid order. Distinct categories sit in distinct rows so
// "different orientation = different category" is legible at a glance.
export const PTN_GROUPS = [
  { id: 'lines',  label: 'Lines',  hint: 'One orientation each — use a different angle per category' },
  { id: 'grids',  label: 'Grids',  hint: 'Crossed strokes read denser — good for a dominant class' },
  { id: 'marks',  label: 'Marks',  hint: 'Point fields stay legible at small polygon sizes' },
  { id: 'curves', label: 'Curves', hint: 'Organic rhythm — water, wetland, and moving surfaces' },
];

function hatchLines(s, dir, stroke, w) {
  let d = '';
  for (let k = s / 2; k < PTN_T; k += s) d += dir === 'h' ? `M0 ${k} H${PTN_T} ` : `M${k} 0 V${PTN_T} `;
  return `<path d="${d.trim()}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="butt"/>`;
}
function diagLines(s, slope, stroke, w) {
  let d = '';
  for (let c = -PTN_T; c < 2 * PTN_T; c += s) {
    d += slope > 0 ? `M${c} 0 L${c + PTN_T} ${PTN_T} ` : `M${c} ${PTN_T} L${c + PTN_T} 0 `;
  }
  return `<path d="${d.trim()}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="butt"/>`;
}
function dotsField(s, r, fill) {
  let c = '';
  for (let y = s / 2; y < PTN_T; y += s)
    for (let x = s / 2; x < PTN_T; x += s)
      c += `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}"/>`;
  return `<g fill="${fill}">${c}</g>`;
}
function dashField(s, stroke, w) {
  const dash = Math.max(3, s * 0.55);
  let d = '';
  for (let y = s / 2, row = 0; y < PTN_T; y += s, row++) {
    const offset = row % 2 ? dash : 0;          // brick-stagger the rows
    for (let x = -dash + offset; x < PTN_T; x += dash * 2) d += `M${x.toFixed(1)} ${y} h${dash.toFixed(1)} `;
  }
  return `<path d="${d.trim()}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="butt"/>`;
}
function wavesField(s, stroke, w) {
  const amp = Math.min(s * 0.28, 5);
  let d = '';
  for (let y = s / 2; y < PTN_T; y += s) {
    d += `M0 ${y} `;
    const stepX = Math.max(2, s / 8);
    for (let x = 0; x <= PTN_T; x += stepX) {
      const yy = y + Math.sin((x / s) * Math.PI * 2) * amp;
      d += `L${x.toFixed(1)} ${yy.toFixed(2)} `;
    }
  }
  return `<path d="${d.trim()}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function chevronField(s, stroke, w) {
  const amp = Math.min(s * 0.4, s / 2);
  let d = '';
  for (let y = s / 2; y < PTN_T; y += s) {
    d += `M0 ${(y + amp / 2).toFixed(1)} `;
    for (let x = 0; x < PTN_T; x += s) {
      d += `L${(x + s / 2).toFixed(1)} ${(y - amp / 2).toFixed(1)} L${(x + s).toFixed(1)} ${(y + amp / 2).toFixed(1)} `;
    }
  }
  return `<path d="${d.trim()}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function stippleField(s, r, fill) {
  let st = 0x9e3779b9 >>> 0;
  const rnd = () => (st = (st * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const n = Math.max(1, Math.round((PTN_T * PTN_T) / (s * s)));
  let c = '';
  for (let i = 0; i < n; i++) {
    const x = rnd() * PTN_T, y = rnd() * PTN_T;
    const xs = [x]; if (x < r) xs.push(x + PTN_T); if (x > PTN_T - r) xs.push(x - PTN_T);
    const ys = [y]; if (y < r) ys.push(y + PTN_T); if (y > PTN_T - r) ys.push(y - PTN_T);
    xs.forEach(px => ys.forEach(py => { c += `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${r.toFixed(2)}"/>`; }));
  }
  return `<g fill="${fill}">${c}</g>`;
}

const PTN_STEPS_11 = (() => {
  const max = 64, min = 4;
  return Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    const val = max * Math.pow(min / max, t);
    return PTN_DIVISORS.reduce((a, b) => Math.abs(b - val) < Math.abs(a - val) ? b : a);
  });
})();
function patternSpacingForStep(step) {
  const s = Math.max(0, Math.min(PTN_STEPS_11.length - 1, Math.round(step)));
  return PTN_STEPS_11[s];
}

export function ptnSVGString(inst, sizeOverride) {
  const style = PTN_STYLES.find(s => s.id === inst.style) || PTN_STYLES[0];
  const s = patternSpacingForStep(inst.densityStep);
  const w = (inst.strokeWidth || 2);
  const body = style.body({ stroke: inst.strokeColor, w, s });
  const bg = inst.backgroundColor
    ? `<rect width="${PTN_T}" height="${PTN_T}" fill="${inst.backgroundColor}"/>` : '';
  const rot = inst.angle ? ` transform="rotate(${inst.angle} ${PTN_T/2} ${PTN_T/2})"` : '';
  const size = sizeOverride || PTN_T;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${PTN_T} ${PTN_T}">${bg}<g${rot}>${body}</g></svg>`;
}

export function ptnPreviewURL(inst) {
  // single quotes — this value is embedded in double-quoted style attributes
  return `url('data:image/svg+xml;utf8,${encodeURIComponent(ptnSVGString(inst))}')`;
}

// The picker shows patterns as black-on-white marks, never in the layer's
// own color. A thumbnail tinted with the fill is a swatch; a monochrome
// one is an icon — and an icon is what you compare orientation across.
export const PTN_MONO_INK = '#111416';
export const PTN_MONO_BG  = '#ffffff';

export function ptnMonoURL(styleId, { densityStep = 5, strokeWidth = 1.6, angle = 0 } = {}) {
  return ptnPreviewURL({
    style: styleId, densityStep, strokeWidth, angle,
    strokeColor: PTN_MONO_INK, backgroundColor: PTN_MONO_BG,
  });
}

// Density and weight are the two intensity axes. Both are exposed as
// discrete ramps rather than sliders so a set of layers can be given
// *matching* steps — the whole point of same-orientation encoding.
export const PTN_DENSITY_STEPS = 11;
export const PTN_WEIGHT_STEPS  = [0.8, 1.2, 1.6, 2.2, 3.0, 4.0];

export function ptnWeightIndex(w) {
  let best = 0, bd = Infinity;
  PTN_WEIGHT_STEPS.forEach((v, i) => { const d = Math.abs(v - w); if (d < bd) { bd = d; best = i; } });
  return best;
}
