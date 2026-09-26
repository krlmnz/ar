'use strict';

process.env.ELEVENTY_RUN_MODE = process.env.ELEVENTY_RUN_MODE || 'build';

const test = require('node:test');
const assert = require('node:assert/strict');
const stack = require('../lib/map-stack');
const runtime = require('../assets/js/map-runtime');

const STUDIO = 'mapbox://styles/kmunoz/cmpndx2y700jc01sc8vm610ld';

test('published default stays the Mapbox studio style', () => {
  const mapbox = require('../_data/mapbox');
  assert.equal(mapbox.style, STUDIO);
  assert.equal(mapbox.version, 'v3.9.0');
  assert.equal(stack.styleById('andean').style, mapbox.style);
  assert.equal(stack.styleById('andean').vendor, 'mapbox');
});

test('a mapbox:// style resolves onto Mapbox and keeps the token', () => {
  const cfg = stack.resolveConfig({
    style: STUDIO,
    token: 'pk.test',
    mode: 'pins',
    features: []
  });
  assert.equal(cfg.vendor, 'mapbox');
  assert.equal(cfg.styleId, 'andean');
  assert.equal(cfg.requiresToken, true);
  assert.equal(cfg.token, 'pk.test');
  assert.equal(cfg.overlays, undefined);
  assert.equal(cfg.styles, undefined);
});

test('route overlays are namespaced and are not basemap layer ids', () => {
  const cfg = stack.resolveConfig({ style: STUDIO, token: 'pk.test', mode: 'route' });
  const route = cfg.overlays.route;
  assert.equal(route.sourceId, 'andean-route');
  assert.deepEqual(route.layers.map((layer) => layer.id), [
    'andean-route-casing',
    'andean-route-line'
  ]);
  assert.deepEqual(route.layers.map((layer) => layer.role), ['casing', 'stroke']);
  route.layers.forEach((layer) => {
    assert.match(layer.id, /^andean-/);
    assert.equal(layer.type, 'line');
  });
  assert.deepEqual(route.layers[1].paint['line-dasharray'], [1.5, 1.5]);
});

test('atelier styles resolve to tokenless MapLibre https documents', () => {
  const cfg = stack.resolveConfig({
    runtime: 'maplibre',
    styleId: 'liberty',
    token: 'pk.should-not-ship',
    mode: 'route',
    includeStyles: true
  });
  assert.equal(cfg.vendor, 'maplibre');
  assert.equal(cfg.requiresToken, false);
  assert.equal(cfg.token, '');
  assert.match(cfg.style, /^https:\/\/tiles\.openfreemap\.org\/styles\/liberty$/);
  assert.ok(cfg.credits.some((credit) => credit.label === 'OpenStreetMap' && credit.href));
  assert.ok(cfg.styles.every((style) => style.vendor === 'maplibre'));
  assert.ok(cfg.styles.every((style) => style.style.startsWith('https://')));
  assert.equal(cfg.styles.some((style) => style.style.startsWith('mapbox://')), false);
});

test('MapLibre refuses a mapbox:// style instead of booting it', () => {
  assert.throws(
    () => stack.resolveConfig({ runtime: 'maplibre', styleId: 'andean' }),
    /cannot run on maplibre/
  );
  assert.throws(
    () => stack.resolveConfig({ runtime: 'maplibre', style: STUDIO }),
    /mapbox:\/\//
  );
  assert.throws(
    () => stack.resolveConfig({ styleId: 'not-a-style' }),
    /Unknown map style/
  );
});

test('every MapLibre catalog entry is an open https style', () => {
  const libre = stack.styles.filter((style) => style.vendor === 'maplibre');
  assert.ok(libre.length >= 3);
  libre.forEach((style) => {
    assert.equal(style.requiresToken, false);
    assert.match(style.style, /^https:\/\//);
    assert.ok(style.credits.length >= 1);
  });
});

test('the line overlay upsert uses catalog ids and paint overrides', () => {
  const sources = {};
  const layers = {};
  const map = {
    getStyle() { return { layers: [] }; },
    getSource(id) { return sources[id] || null; },
    getLayer(id) { return layers[id] || null; },
    addSource(id, spec) {
      sources[id] = {
        spec,
        setData(data) { spec.data = data; }
      };
    },
    addLayer(layer) { layers[layer.id] = layer; },
    setPaintProperty(id, key, value) { layers[id].paint[key] = value; },
    setLayoutProperty(id, key, value) { layers[id].layout[key] = value; }
  };

  const overlay = stack.overlays.route;
  const line = [[-70.63, -33.43], [-71.68, -33.45]];
  const first = runtime.syncLineOverlay(map, overlay, line, {});
  assert.equal(first, true);
  assert.ok(sources['andean-route']);
  assert.equal(layers['andean-route-line'].paint['line-color'], '#D7561D');
  assert.equal(layers['andean-route-casing'].layout.visibility, 'visible');
  assert.deepEqual(sources['andean-route'].spec.data.geometry.coordinates, line);

  const strokeId = 'andean-route-line';
  const second = runtime.syncLineOverlay(map, overlay, line, {
    paint: { [strokeId]: { 'line-color': '#1A97A9', 'line-width': 5 } },
    hidden: { 'andean-route-casing': true }
  });
  assert.equal(second, true);
  assert.equal(layers[strokeId].paint['line-color'], '#1A97A9');
  assert.equal(layers[strokeId].paint['line-width'], 5);
  assert.deepEqual(layers[strokeId].paint['line-dasharray'], [1.5, 1.5]);
  assert.equal(layers['andean-route-casing'].layout.visibility, 'none');
  assert.equal(Object.keys(layers).length, 2);
});

test('runtime does not invent a GL global', () => {
  assert.equal(runtime.gl('maplibre'), null);
  assert.equal(runtime.gl('mapbox'), null);
  assert.equal(runtime.createSession('maplibre'), null);
});
