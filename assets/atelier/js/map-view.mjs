// MapLibre view. Paints the active palette onto the Liberty surfaces
// and keeps one DOM marker per place. Attribution stays on — the style's
// TileJSON supplies OpenFreeMap / OpenMapTiles / OpenStreetMap.

import { styleURL, STYLE_FAMILY, DEFAULT_CENTER, DEFAULT_ZOOM } from './config.mjs';
import { darken, inkOn, isDark } from './color.mjs';
import { surfaceTable } from './surfaces.mjs';

const originals = new WeakMap();

function storeFor(map) {
  if (!originals.has(map)) originals.set(map, new Map());
  return originals.get(map);
}

function snapshot(map, layerId, prop) {
  const store = storeFor(map);
  const key = layerId + '\0' + prop;
  if (!store.has(key)) {
    try { store.set(key, map.getPaintProperty(layerId, prop)); }
    catch (e) { store.set(key, undefined); }
  }
  return store.get(key);
}

function paint(map, layerId, prop, value) {
  if (!map.getLayer(layerId)) return;
  try { map.setPaintProperty(layerId, prop, value); }
  catch (e) { console.warn('[atelier]', layerId, prop, e.message); }
}

export function createMap(container, camera, { cooperative = false } = {}) {
  const center = (camera && camera.center) || DEFAULT_CENTER;
  const zoom = camera && camera.zoom != null ? camera.zoom : DEFAULT_ZOOM;
  const map = new maplibregl.Map({
    container,
    style: styleURL(),
    center,
    zoom,
    attributionControl: true,
    cooperativeGestures: cooperative,
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  return map;
}

export function readCamera(map) {
  const c = map.getCenter();
  return { center: [c.lng, c.lat], zoom: map.getZoom() };
}

function framePadding(map) {
  const rail = document.querySelector('.atelier-rail, .guest-card');
  const base = { top: 72, right: 72, bottom: 72, left: 48 };
  if (!rail) return base;
  const rect = rail.getBoundingClientRect();
  const mapRect = map.getContainer().getBoundingClientRect();
  if (!rect.width || !mapRect.width) return base;
  if (rect.width > mapRect.width * 0.75) {
    return { ...base, top: Math.min(rect.height + 28, mapRect.height * 0.55) };
  }
  return { ...base, left: Math.min(rect.width + 40, mapRect.width * 0.5) };
}

export function frameOn(map, lng, lat, zoom, duration) {
  map.flyTo({
    center: [lng, lat],
    zoom,
    duration,
    padding: framePadding(map),
  });
}

function bindLiberty(map, table) {
  if (map.getLayer('building')) {
    map.setLayerZoomRange('building', table.buildingMinZoom, 24);
  }
}

function paintLabels(map, land) {
  const dark = isDark(land);
  const layers = (map.getStyle() && map.getStyle().layers) || [];
  layers.forEach((layer) => {
    if (layer.type !== 'symbol' || !map.getLayer(layer.id)) return;
    ['text-color', 'text-halo-color', 'icon-color'].forEach((prop) => {
      const original = snapshot(map, layer.id, prop);
      if (original == null) return;
      if (!dark) {
        paint(map, layer.id, prop, original);
        return;
      }
      if (prop === 'text-halo-color') paint(map, layer.id, prop, '#14171a');
      else paint(map, layer.id, prop, '#F4F1EA');
    });
  });
}

export function paintPalette(map, colors) {
  const table = surfaceTable(STYLE_FAMILY);
  if (!table) {
    console.warn('[atelier] No surface table for ' + STYLE_FAMILY + '. Palettes are not applied.');
    return;
  }
  bindLiberty(map, table);
  table.surfaces.forEach((surface) => {
    const color = colors[surface.id];
    if (!color) return;
    surface.layers.forEach((layer) => paint(map, layer.id, layer.prop, color));
  });
  table.outlines.forEach((line) => {
    const color = colors[line.from];
    if (!color) return;
    paint(map, line.id, line.prop, darken(color, line.amount));
  });
  table.opacity.forEach(([id, value]) => paint(map, id, 'fill-opacity', value));
  if (colors.land) paintLabels(map, colors.land);
}

export function whenStyle(map) {
  if (map.isStyleLoaded()) return Promise.resolve();
  return new Promise((resolve) => {
    map.once('style.load', () => resolve());
  });
}

const markers = new WeakMap();

export function syncMarkers(map, places, { selectedId, ink, onSelect }) {
  const prev = markers.get(map) || [];
  prev.forEach((m) => m.remove());
  const text = inkOn(ink);
  const next = places.map((place, index) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'pin' + (place.id === selectedId ? ' pin--selected' : '');
    el.style.setProperty('--pin', ink);
    el.style.color = text;
    el.style.zIndex = place.id === selectedId ? '2' : '1';
    el.textContent = String(index + 1);
    el.setAttribute('aria-label', (place.name || 'Place') + ', place ' + (index + 1));
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (onSelect) onSelect(place.id);
    });
    return new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([place.lng, place.lat])
      .addTo(map);
  });
  markers.set(map, next);
}

export function watchSize(map, container) {
  if (typeof ResizeObserver === 'undefined') return;
  let last = 0;
  const observer = new ResizeObserver(() => {
    const size = container.clientWidth + container.clientHeight;
    if (size === last) return;
    last = size;
    map.resize();
  });
  observer.observe(container);
}
