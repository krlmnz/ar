// ═══════════════════════════════════════════════════════════════
// MAP — the Mapbox instance and layer painting. Owns everything
// that turns state.colors into paint properties. Pattern
// compositing is requested over the bus (`pattern:apply`) so the
// engine stays a separate, swappable module.
// ═══════════════════════════════════════════════════════════════
import { MAPBOX_TOKEN, MAP_STYLE } from '../config.js';
import { S, session, persist } from '../store/state.js';
import { LAYERS, colorPropForType, opacityPropForType, landuseParkExpression,
         lineDashArray, isLineLayer, isPolygonLayer, canPatternLayer,
         LANDUSE_PARK_CLASSES, resolveLayer, isDuplicate, baseIdOf } from '../data/map-layers.js';
import { bus } from '../core/bus.js';

mapboxgl.accessToken = MAPBOX_TOKEN;

export const map = new mapboxgl.Map({
  container: 'mapbox',
  style: MAP_STYLE,
  center: S.camera.center,
  zoom: S.camera.zoom,
  preserveDrawingBuffer: true,
});
map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

export let mapReady = false;

// ── the layer stack ─────────────────────────────────────────────
export function layerStack() { return Array.isArray(S.layers) ? S.layers : []; }
function stackEntry(uid) { return layerStack().find(e => e.uid === uid); }

// A duplicate paints its own clones of the base surface's style layers. They
// are created lazily — the clone carries the original's source, source-layer
// and filter, so it covers exactly the same geometry and can be painted
// independently above it.
function ensureDuplicateLayers(uid) {
  const base = LAYERS.find(l => l.id === baseIdOf(uid));
  const layer = resolveLayer(uid);
  if (!base || !layer) return false;
  const styleLayers = map.getStyle()?.layers || [];
  let ok = true;
  layer.styleLayerPairs.forEach(({ base: bsid, sid }) => {
    if (map.getLayer(sid)) return;
    const src = styleLayers.find(l => l.id === bsid);
    if (!src) { ok = false; return; }
    const def = { id: sid, type: src.type, source: src.source };
    if (src['source-layer']) def['source-layer'] = src['source-layer'];
    if (src.filter) def.filter = JSON.parse(JSON.stringify(src.filter));
    if (src.layout) def.layout = JSON.parse(JSON.stringify(src.layout));
    // Start transparent: applyLayerColor paints it a beat later, and a flash
    // of the basemap's own paint would read as a bug.
    def.paint = {};
    try { map.addLayer(def); }
    catch (e) { console.warn('duplicate layer', sid, e.message); ok = false; }
  });
  return ok;
}

export function removeDuplicateLayers(uid) {
  const layer = resolveLayer(uid);
  if (!layer) return;
  [...layer.styleLayers, borderLayerId(uid)].forEach(sid => {
    if (map.getLayer(sid)) { try { map.removeLayer(sid); } catch (e) {} }
  });
}

// Render order. The stack reads bottom-to-top, and Mapbox draws in style
// order, so walking the stack and moving each layer to just under the first
// symbol layer leaves them sequenced correctly and still beneath labels.
export function applyLayerOrder() {
  if (!mapReady) return;
  const styleLayers = map.getStyle()?.layers || [];
  const firstSymbol = styleLayers.find(l => l.type === 'symbol')?.id;
  for (const entry of layerStack()) {
    const layer = resolveLayer(entry.uid);
    // background layers are always drawn first by Mapbox — nothing to move
    if (!layer || layer.type === 'background') continue;
    for (const sid of [...layer.styleLayers, borderLayerId(entry.uid)]) {
      if (!map.getLayer(sid)) continue;
      try { map.moveLayer(sid, firstSymbol); } catch (e) {}
    }
  }
}

// ── per-layer style overrides (opacity / line / border) ─────────
// S.styles[uid] is optional; every read defaults to style behaviour.
function layerStyle(layerId) { return (S.styles && S.styles[layerId]) || {}; }
export function layerOpacity(layerId) {
  // A hidden layer is drawn at zero rather than removed, so every paint path
  // — fill, line, background, border, pattern raster — hides through the one
  // value they all already read.
  const entry = stackEntry(layerId);
  if (entry && entry.visible === false) return 0;
  const o = layerStyle(layerId).opacity;
  return (o == null) ? 1 : Math.max(0, Math.min(1, o));
}

export function applyLayerColor(layerId, color) {
  const layer = resolveLayer(layerId);
  if (!layer || !color || !mapReady) return;
  if (isDuplicate(layerId) && !ensureDuplicateLayers(layerId)) return;
  const prop = colorPropForType(layer.type);
  const op = layerOpacity(layerId);
  layer.styleLayerPairs.forEach(({ base: bsid, sid }) => {
    if (!map.getLayer(sid)) return;
    try {
      if (bsid === 'landuse') {
        map.setPaintProperty(sid, 'fill-color', landuseParkExpression(color));
        if (!S.patterns[layerId]) {
          // opacity is a per-class mask: park classes get `op`, the rest 0
          map.setPaintProperty(sid, 'fill-opacity', landuseParkOpacity(op));
          try { map.setPaintProperty(sid, 'fill-pattern', null); } catch(e){}
        }
        return;
      }
      map.setPaintProperty(sid, prop, color);
      if (layer.type === 'fill' && !S.patterns[layerId]) {
        map.setPaintProperty(sid, 'fill-opacity', op);
      }
      if (layer.type === 'line') {
        map.setPaintProperty(sid, 'line-opacity', op);
      }
      if (layer.type === 'background') {
        map.setPaintProperty(sid, 'background-opacity', op);
      }
      if (layer.clearsPattern && !S.patterns[layerId]) {
        try { map.setPaintProperty(sid, 'fill-pattern', null); } catch(e){}
      }
    } catch(e) { console.warn(sid, prop, e.message); }
  });
  if (isLineLayer(layer))    applyLineStyle(layerId);
  if (isPolygonLayer(layer)) applyBorder(layerId);
}

// landuse masks its parks with a match on `class`; fold opacity into the `1`
function landuseParkOpacity(op) {
  return ['match', ['get','class'],
    ['park','grass','pitch','garden','cemetery','recreation_ground','golf_course','wood','scrub'],
    op, 0];
}

// ── line layers: width + dash style ─────────────────────────────
// The style's own line-width, captured before we ever override it, so a doc
// with no width set can be restored to the basemap default instead of
// inheriting whatever the previously-open doc happened to use.
const baseLineWidth = new Map();
function rememberLineWidth(sid) {
  if (baseLineWidth.has(sid)) return;
  try { baseLineWidth.set(sid, map.getPaintProperty(sid, 'line-width')); }
  catch (e) { baseLineWidth.set(sid, undefined); }
}

export function applyLineStyle(layerId) {
  const layer = resolveLayer(layerId);
  if (!layer || !isLineLayer(layer) || !mapReady) return;
  const st = layerStyle(layerId);
  layer.styleLayers.forEach(sid => {
    if (!map.getLayer(sid)) return;
    rememberLineWidth(sid);
    try {
      map.setPaintProperty(sid, 'line-width',
        st.lineWidth != null ? st.lineWidth : baseLineWidth.get(sid));
      const dash = st.lineStyle ? lineDashArray(st.lineStyle) : null;
      // null clears any override → back to the style's own dash (solid here)
      map.setPaintProperty(sid, 'line-dasharray', dash);
    } catch(e) { console.warn('line style', sid, e.message); }
  });
}

// ── polygon layers: a synthetic outline drawn as its own line layer ──
// Mapbox fill-outline-color is 1px & undashed; a real border needs a line
// layer over the same source. We add one lazily, keyed hv-border-<id>.
function borderLayerId(layerId) { return 'hv-border-' + layerId; }

function ensureBorderLayer(layer) {
  const bid = borderLayerId(layer.id);
  if (map.getLayer(bid)) return bid;
  // clone source + source-layer from a specific style layer when the layer
  // declares one (park's outline must ride `landuse`, whose `class` the
  // greenery filter reads), else the first existing style layer.
  const preferred = layer.borderStyleLayer;
  const src = (preferred && map.getLayer(preferred))
    || layer.styleLayers.map(sid => map.getLayer(sid)).find(Boolean);
  if (!src) return null;
  const def = { id: bid, type: 'line', source: src.source, layout: { 'line-join': 'round' }, paint: {} };
  if (src.sourceLayer) def['source-layer'] = src.sourceLayer;
  // restrict a class-filtered layer's outline to the greenery classes only
  if (layer.borderClassFilter) {
    def.filter = ['match', ['get','class'], LANDUSE_PARK_CLASSES, true, false];
  }
  try { map.addLayer(def); return bid; }
  catch (e) { console.warn('add border layer', e.message); return null; }
}

export function applyBorder(layerId) {
  const layer = resolveLayer(layerId);
  if (!layer || !isPolygonLayer(layer) || !mapReady) return;
  const b = layerStyle(layerId).border;
  const bid = borderLayerId(layerId);
  if (!b || !b.width) {
    if (map.getLayer(bid)) { try { map.setPaintProperty(bid, 'line-opacity', 0); } catch(e){} }
    return;
  }
  if (!ensureBorderLayer(layer)) return;
  try {
    map.setPaintProperty(bid, 'line-color', b.color || '#000000');
    map.setPaintProperty(bid, 'line-width', b.width);
    map.setPaintProperty(bid, 'line-opacity', layerOpacity(layerId));
    map.setPaintProperty(bid, 'line-dasharray', b.style ? lineDashArray(b.style) : null);
  } catch(e) { console.warn('apply border', e.message); }
}

// full re-apply of every editable surface (color + style)
export function applyLayerStyle(layerId) {
  applyLayerColor(layerId, S.colors[layerId]);
}

export function applyAllColors() {
  // Paint in stack order so duplicates are created and moved bottom-up, then
  // settle the whole order once at the end.
  for (const entry of layerStack()) {
    const color = S.colors[entry.uid];
    if (color) applyLayerColor(entry.uid, color);
  }
  // Every pattern-capable layer, not just the ones with a pattern: after a
  // state swap the incoming doc may have none where the outgoing one did, and
  // ptnComposite() is what clears the old raster. Skipping the null entries
  // left the previous map's hatching painted on.
  for (const entry of layerStack()) {
    const l = resolveLayer(entry.uid);
    if (l && canPatternLayer(l)) bus.emit('pattern:apply', entry.uid);
  }
  applyLayerOrder();
}

export function setLayerColor(layerId, color) {
  S.colors[layerId] = color;
  applyLayerColor(layerId, color);
  bus.emit('color:changed', layerId);
  persist();
}

// apply a style override (opacity / line / border) and repaint the layer
export function setLayerStyle(layerId, patch) {
  if (!S.styles) S.styles = {};
  S.styles[layerId] = { ...(S.styles[layerId] || {}), ...patch };
  const layer = resolveLayer(layerId);
  // opacity touches the fill/pattern path; re-run color, then pattern if any
  applyLayerColor(layerId, S.colors[layerId]);
  if (layer && S.patterns[layerId]) bus.emit('pattern:apply', layerId);
  bus.emit('color:changed', layerId);
  persist();
}

export function syncCameraFromState() {
  map.jumpTo({ center: S.camera.center, zoom: S.camera.zoom });
}

// 'load' waits for every tile — a single slow request can stall it. Paint
// properties only need the style, so go ready on style.load with load as backup.
function onMapReady() {
  if (mapReady) return;
  mapReady = true;
  applyAllColors();
}
map.on('style.load', onMapReady);
map.on('load', onMapReady);
map.on('error', e => console.warn('map error', e && e.error && e.error.message));

map.on('moveend', () => {
  if (session.mode !== 'editor') return;
  const c = map.getCenter();
  S.camera = { center: [c.lng, c.lat], zoom: map.getZoom() };
  persist();
});

export function init() {
  // Mapbox sizes its canvas once and only re-reads the container on demand, so
  // any CSS-driven change to #map leaves the canvas stale — switching rail
  // panes, a width breakpoint, the rail collapsing. Rather than enumerate every
  // event that can do that and miss one, watch the box itself.
  const mapEl = document.getElementById('map');
  if (mapEl && typeof ResizeObserver !== 'undefined') {
    let last = 0;
    new ResizeObserver(() => {
      const w = mapEl.clientWidth + mapEl.clientHeight;
      if (w === last) return;                 // ignore the observer's own echo
      last = w;
      map.resize();
    }).observe(mapEl);
  }
  bus.on('state:replaced', () => {
    syncCameraFromState();
    if (mapReady) applyAllColors();
  });
}
