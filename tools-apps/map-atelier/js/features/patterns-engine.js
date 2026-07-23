// ═══════════════════════════════════════════════════════════════
// PATTERN COMPOSITOR — rasterizes a pattern (drawn by
// core/pattern-svg.js) onto the map as a fill-pattern image, and
// resolves the ink color from the layer's own fill. No UI here —
// the layer panel drives it.
// ═══════════════════════════════════════════════════════════════
import { map, mapReady, applyLayerColor, layerOpacity } from './map.js';
import { S } from '../store/state.js';
import { LANDUSE_PARK_CLASSES, resolveLayer } from '../data/map-layers.js';
import { hexToHsl, hslToHex, patternInkColor } from '../core/color.js';
import { PTN_T, PTN_STYLES, PTN_GROUPS, ptnSVGString, ptnPreviewURL, ptnMonoURL,
         PTN_MONO_INK, PTN_MONO_BG, PTN_DENSITY_STEPS, PTN_WEIGHT_STEPS,
         ptnWeightIndex } from '../core/pattern-svg.js';
import { bus } from '../core/bus.js';

// re-exported so the UI has one import site for everything pattern
export { PTN_T, PTN_STYLES, PTN_GROUPS, ptnSVGString, ptnPreviewURL, ptnMonoURL,
         PTN_MONO_INK, PTN_MONO_BG, PTN_DENSITY_STEPS, PTN_WEIGHT_STEPS, ptnWeightIndex };

function ptnDPR() { return Math.max(1, Math.min(3, Math.round(window.devicePixelRatio || 2))); }

function ptnRasterize(svgString, px) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image(px, px);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

export function resolveInk(inst, layerId) {
  const base = S.colors[layerId] || '#cccccc';
  const [h, s, l] = hexToHsl(base);
  if (inst.ink === 'auto') return patternInkColor(base);
  if (inst.ink === 'soft') return l > 55 ? hslToHex(h, s, Math.max(l - 13, 8)) : hslToHex(h, s, Math.min(l + 13, 94));
  if (inst.ink === 'bold') return l > 55 ? hslToHex(h, Math.min(s + 10, 70), Math.max(l - 58, 5)) : hslToHex(h, Math.min(s + 10, 70), Math.min(l + 60, 96));
  if (inst.ink === 'accent') return S.accent;
  return inst.ink; // custom hex
}

export async function ptnComposite(layerId) {
  const layer = resolveLayer(layerId);
  if (!layer || !layer.canPattern || !mapReady) return;
  const inst = S.patterns[layerId];
  if (!inst) {
    layer.styleLayers.forEach(sid => {
      if (map.getLayer(sid)) { try { map.setPaintProperty(sid, 'fill-pattern', null); } catch(e){} }
    });
    applyLayerColor(layerId, S.colors[layerId]);
    return;
  }
  const dpr = ptnDPR();
  const px = PTN_T * dpr;
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = S.colors[layerId] || '#FFFFFF';
  ctx.fillRect(0, 0, px, px);
  const svg = ptnSVGString({ ...inst, strokeColor: resolveInk(inst, layerId), backgroundColor: null }, px);
  try {
    const img = await ptnRasterize(svg, px);
    ctx.drawImage(img, 0, 0, px, px);
  } catch (e) { console.warn('pattern rasterize failed', e); }
  const data = ctx.getImageData(0, 0, px, px);
  const imgId = 'ptn-' + layerId;
  try {
    if (map.hasImage(imgId)) map.removeImage(imgId);
    map.addImage(imgId, data, { pixelRatio: dpr });
  } catch (e) { console.warn('addImage', e.message); return; }
  const op = layerOpacity(layerId);
  // Match on the *base* style layer's name: a duplicate paints a clone whose
  // id is hv-dup-…, and testing that against 'landuse' would silently skip
  // the class mask and blanket every neighbourhood with the pattern.
  layer.styleLayerPairs.forEach(({ base: bsid, sid }) => {
    if (!map.getLayer(sid)) return;
    try {
      if (bsid === 'landuse') {
        // fill-pattern can't be data-driven, but fill-opacity can — pattern
        // everything, then only let the park classes show it (at layer opacity).
        map.setPaintProperty(sid, 'fill-pattern', imgId);
        map.setPaintProperty(sid, 'fill-opacity', ['match', ['get','class'], LANDUSE_PARK_CLASSES, op, 0]);
        return;
      }
      map.setPaintProperty(sid, 'fill-opacity', op);
      map.setPaintProperty(sid, 'fill-pattern', imgId);
    } catch (e) { console.warn('apply pattern', sid, e.message); }
  });
}

export function init() {
  bus.on('pattern:apply', ptnComposite);
  bus.on('color:changed', (layerId) => { if (S.patterns[layerId]) ptnComposite(layerId); });
}
