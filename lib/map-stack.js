// Style catalog and app-owned overlay specs.
//
// Page templates never name a GL vendor, a mapbox:// URL, or a layer id.
// resolveConfig() is what the build stamps into #map-config. The browser
// runtime (assets/js/map-runtime.js) draws overlays from this spec.
//
// Basemap layers stay inside the style document. Nothing here addresses
// them by id. Overlay ids are namespaced (`andean-`) so they cannot collide
// with a basemap that already has a layer called "route" or "road".
'use strict';

const MAPLIBRE_VERSION = '5.24.0';

const OPEN_CREDITS = [
  { label: 'OpenFreeMap', href: 'https://openfreemap.org' },
  { label: 'OpenMapTiles', href: 'https://www.openmaptiles.org/' },
  { label: 'OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' }
];

const MAPBOX_CREDITS = [
  { label: 'Mapbox', href: 'https://www.mapbox.com/about/maps/' },
  { label: 'OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' }
];

// MapLibre 6 ships ESM only. This site loads GL the same way it loads
// Mapbox: a classic script that sets a global. 5.24 is the last 5.x line
// and still publishes dist/maplibre-gl.js (window.maplibregl).
const assets = {
  maplibre: {
    version: MAPLIBRE_VERSION,
    css: 'https://cdn.jsdelivr.net/npm/maplibre-gl@' + MAPLIBRE_VERSION + '/dist/maplibre-gl.css',
    js: 'https://cdn.jsdelivr.net/npm/maplibre-gl@' + MAPLIBRE_VERSION + '/dist/maplibre-gl.js'
  }
};

const STYLES = [
  {
    id: 'andean',
    label: 'Andean studio',
    vendor: 'mapbox',
    // The custom studio style. MapLibre cannot load the mapbox:// protocol.
    style: 'mapbox://styles/kmunoz/cmpndx2y700jc01sc8vm610ld',
    requiresToken: true,
    tone: 'light',
    credits: MAPBOX_CREDITS
  },
  {
    id: 'liberty',
    label: 'Liberty',
    vendor: 'maplibre',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    requiresToken: false,
    tone: 'light',
    credits: OPEN_CREDITS
  },
  {
    id: 'positron',
    label: 'Positron',
    vendor: 'maplibre',
    style: 'https://tiles.openfreemap.org/styles/positron',
    requiresToken: false,
    tone: 'light',
    credits: OPEN_CREDITS
  },
  {
    id: 'dark',
    label: 'Dark',
    vendor: 'maplibre',
    style: 'https://tiles.openfreemap.org/styles/dark',
    requiresToken: false,
    tone: 'dark',
    credits: OPEN_CREDITS
  }
];

// App overlays. Paint defaults match map-tokens.css; the engine still lets
// --route-casing and --route-line override line-color at draw time, and the
// atelier bench can override the stroke further without naming these ids.
//
// The stroke is dashed on purpose: these are straight segments between
// stops, not driving geometry. A solid road-weight line would assert a
// road that is not there.
const OVERLAYS = {
  route: {
    sourceId: 'andean-route',
    layers: [
      {
        id: 'andean-route-casing',
        role: 'casing',
        type: 'line',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': 'rgba(24, 23, 22, 0.14)',
          'line-width': 7,
          'line-opacity': 0.9
        }
      },
      {
        id: 'andean-route-line',
        role: 'stroke',
        type: 'line',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#D7561D',
          'line-width': 3,
          'line-dasharray': [1.5, 1.5]
        }
      }
    ]
  }
};

function styleById(id) {
  return STYLES.find((style) => style.id === id) || null;
}

function inferVendor(styleUrl) {
  return String(styleUrl || '').indexOf('mapbox://') === 0 ? 'mapbox' : 'maplibre';
}

function publicStyle(style) {
  return {
    id: style.id,
    label: style.label,
    vendor: style.vendor,
    style: style.style,
    tone: style.tone || 'light',
    credits: style.credits
  };
}

function fallbackEntry(vendor, style) {
  return {
    id: vendor === 'mapbox' ? 'custom-mapbox' : 'custom',
    label: 'Custom',
    vendor,
    style,
    requiresToken: vendor === 'mapbox',
    tone: 'light',
    credits: vendor === 'mapbox' ? MAPBOX_CREDITS : OPEN_CREDITS
  };
}

/**
 * Merge a page mapConfig with the catalog.
 * Layouts keep passing token + style. runtime and styleId are optional.
 * MapLibre configs drop the token so a public bench does not embed a pk.
 */
function resolveConfig(cfg) {
  const input = cfg || {};
  const picked = input.styleId ? styleById(input.styleId) : null;

  if (input.styleId && !picked) {
    throw new Error('Unknown map style "' + input.styleId + '"');
  }
  if (picked && input.runtime && input.runtime !== picked.vendor) {
    throw new Error(
      'Style "' + picked.id + '" is a ' + picked.vendor +
      ' style and cannot run on ' + input.runtime
    );
  }

  const style = (picked && picked.style) || input.style || styleById('andean').style;
  const vendor = input.runtime || (picked && picked.vendor) || inferVendor(style);
  const known = STYLES.find((entry) => entry.style === style);
  const entry = picked || known || fallbackEntry(vendor, style);

  if (vendor === 'maplibre' && String(entry.style).indexOf('mapbox://') === 0) {
    throw new Error('MapLibre cannot load a mapbox:// style');
  }
  if (entry.vendor !== vendor) {
    throw new Error(
      'Style "' + entry.id + '" belongs to ' + entry.vendor + ', not ' + vendor
    );
  }

  const out = Object.assign({}, input, {
    vendor,
    styleId: entry.id,
    style: entry.style,
    styleLabel: entry.label,
    tone: entry.tone || 'light',
    requiresToken: vendor === 'mapbox' && entry.requiresToken !== false,
    credits: entry.credits,
    token: vendor === 'mapbox' ? (input.token || '') : ''
  });

  if (input.mode === 'route') {
    out.overlays = { route: OVERLAYS.route };
  } else {
    delete out.overlays;
  }

  if (input.includeStyles) {
    out.styles = STYLES.filter((item) => item.vendor === vendor).map(publicStyle);
  } else {
    delete out.styles;
  }

  return out;
}

module.exports = {
  MAPLIBRE_VERSION,
  assets,
  styles: STYLES,
  overlays: OVERLAYS,
  styleById,
  inferVendor,
  resolveConfig
};
