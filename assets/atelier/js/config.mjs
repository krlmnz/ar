// Map atelier configuration.
//
// The default basemap is OpenFreeMap Liberty: vector tiles, no API key,
// attribution arrives from the TileJSON (OpenFreeMap, OpenMapTiles,
// OpenStreetMap). Leave MAPTILER_KEY empty for that default.
//
// To switch later, set MAPTILER_KEY and add a matching entry in
// surfaces.mjs. Layer ids below are bound to Liberty only — a different
// style will load, but palettes will not recolor it until those ids exist.

export const MAPTILER_KEY = '';

export const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export function styleURL() {
  if (MAPTILER_KEY) {
    return 'https://api.maptiler.com/maps/streets-v2/style.json?key=' + encodeURIComponent(MAPTILER_KEY);
  }
  return OPENFREEMAP_STYLE;
}

export const STYLE_FAMILY = MAPTILER_KEY ? 'maptiler-streets' : 'openfreemap-liberty';

export const BASEMAP_LABEL = MAPTILER_KEY ? 'MapTiler Streets' : 'OpenFreeMap Liberty';

// Photon is the one geocoder. The public Nominatim endpoint wants a
// custom User-Agent, which browser fetch cannot set, so this slice does
// not call it. Photon answers forward and reverse search with CORS and
// no key. Be polite: geocode.mjs spaces requests.
export const GEOCODER = {
  id: 'photon',
  label: 'Photon (OpenStreetMap)',
  search: 'https://photon.komoot.io/api/',
  reverse: 'https://photon.komoot.io/reverse',
  minGapMs: 450,
};

export const DEFAULT_CENTER = [-70.6483, -33.4372]; // Santiago
export const DEFAULT_ZOOM = 13.4;

export const EDITOR_PATH = '/atelier/';
export const GUEST_PATH = '/atelier/guest/';

export const DRAFT_KEY = 'atelier:draft:v1';
