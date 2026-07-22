// ═══════════════════════════════════════════════════════════════
// MAP LAYERS — the editable surfaces of the map style
// (verified against style kmunoz/cmpndx2y700jc01sc8vm610ld)
// ═══════════════════════════════════════════════════════════════
export const LAYERS = [
  { id: 'land',        label: 'Land',      type: 'background', desc: 'Base terrain',
    styleLayers: ['land', 'background'], canPattern: false },
  { id: 'water',       label: 'Water',     type: 'fill',       desc: 'Rivers, lakes, the Pacific',
    styleLayers: ['water'], canPattern: true },
  { id: 'park',        label: 'Parks',     type: 'fill',       desc: 'Green spaces',
    styleLayers: ['national-park', 'landuse'], canPattern: true, clearsPattern: true,
    // a synthetic outline must sit on the source-layer whose `class` the
    // greenery filter reads — that's `landuse`, not `national-park`.
    borderStyleLayer: 'landuse', borderClassFilter: true },
  { id: 'building',    label: 'Buildings', type: 'fill',       desc: 'Building footprints',
    styleLayers: ['building'], canPattern: true },
  { id: 'road-simple', label: 'Roads',     type: 'line',       desc: 'Roads & streets', isRoad: true,
    styleLayers: ['road-simple', 'bridge-simple', 'tunnel-simple'], canPattern: false },
];

// Layers that can carry a woven pattern (order = chip order in the UI).
// Patterns only make sense on polygon (fill) layers — never on lines.
export const PTN_LAYERS = ['water', 'park', 'building'];

// ── layer instances ────────────────────────────────────────────
// The five entries above are *surfaces* of the basemap. What the editor
// stacks are instances of them: `uid` is the styling key, `base` is which
// surface it paints. A base instance uses the surface's own id as its uid,
// so every doc and share link written before duplicates existed still
// resolves — `S.colors.water` is simply the instance whose uid is 'water'.
//
// A duplicate gets `water~2` and renders as its own cloned Mapbox layers
// over the same geometry, which is what makes stacking a pattern over a
// solid fill (or a translucent tint over a base) possible.
const DUP_SEP = '~';
export function baseIdOf(uid) { return String(uid).split(DUP_SEP)[0]; }
export function isDuplicate(uid) { return String(uid).includes(DUP_SEP); }
export function dupStyleLayerId(uid, i) { return `hv-dup-${String(uid).replace(DUP_SEP, '-')}-${i}`; }

// A background layer has no source to clone and would paint over the whole
// viewport, so Land is the one surface that cannot be stacked.
export function canDuplicateBase(base) { return base && base.type !== 'background'; }
export function isBackgroundLayer(layer) { return layer.type === 'background'; }

// Resolve a uid to a layer definition. Duplicates get the same geometry and
// controls as their base but point at their own cloned style layers.
// `styleLayerPairs` keeps the original id alongside the clone, because the
// paint code special-cases `landuse` by name.
export function resolveLayer(uid) {
  const base = LAYERS.find(l => l.id === baseIdOf(uid));
  if (!base) return null;
  const dup = isDuplicate(uid);
  const pairs = base.styleLayers.map((sid, i) => ({ base: sid, sid: dup ? dupStyleLayerId(uid, i) : sid }));
  if (!dup) return { ...base, styleLayerPairs: pairs };
  const bIdx = base.borderStyleLayer ? base.styleLayers.indexOf(base.borderStyleLayer) : -1;
  return {
    ...base,
    id: uid,
    label: base.label,
    styleLayers: pairs.map(p => p.sid),
    styleLayerPairs: pairs,
    borderStyleLayer: bIdx >= 0 ? dupStyleLayerId(uid, bIdx) : null,
  };
}

// The stack, bottom-to-top in the list = bottom-to-top on the map.
// Land first because a background layer always renders underneath.
export function defaultLayerStack() {
  return LAYERS.map(l => ({ uid: l.id, name: l.label, visible: true }));
}

// Next free uid for another copy of a surface.
export function nextLayerUid(stack, baseId) {
  let n = 2;
  const taken = new Set(stack.map(e => e.uid));
  while (taken.has(`${baseId}${DUP_SEP}${n}`)) n++;
  return `${baseId}${DUP_SEP}${n}`;
}

// geometry helpers — the panel decides which controls to show from these
export function isPolygonLayer(layer)  { return layer.type === 'fill'; }
export function isLineLayer(layer)     { return layer.type === 'line'; }
export function canPatternLayer(layer) { return !!layer.canPattern && isPolygonLayer(layer); }
// polygons draw a stroke around the fill; lines get their own width/dash controls
export function canBorderLayer(layer)  { return isPolygonLayer(layer); }

export function colorPropForType(type) {
  return type === 'background' ? 'background-color'
       : type === 'line'       ? 'line-color'
       :                         'fill-color';
}
export function opacityPropForType(type) {
  return type === 'background' ? 'background-opacity'
       : type === 'line'       ? 'line-opacity'
       :                         'fill-opacity';
}

// Dash arrays are expressed in line-widths (Mapbox multiplies by line-width).
// 'solid' is signalled by the absence of a dasharray.
export const LINE_STYLES = [
  { id: 'solid',  label: 'Solid',  dash: null },
  { id: 'dashed', label: 'Dashed', dash: [2, 1.5] },
  { id: 'dotted', label: 'Dotted', dash: [0.1, 2] },
];
export function lineDashArray(styleId) {
  return (LINE_STYLES.find(s => s.id === styleId) || LINE_STYLES[0]).dash;
}

// The style's `landuse` layer covers whole neighborhoods (residential,
// commercial…), not just greenery — painting it flat would blanket the land
// color. Restrict the park color to actual green classes; the rest stays clear.
export const LANDUSE_PARK_CLASSES = ['park','grass','pitch','garden','cemetery','recreation_ground','golf_course','wood','scrub'];
export function landuseParkExpression(color) {
  return ['match', ['get','class'], LANDUSE_PARK_CLASSES, color, 'rgba(0,0,0,0)'];
}
