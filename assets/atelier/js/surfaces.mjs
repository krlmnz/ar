// Paint targets for OpenFreeMap Liberty (OSM Liberty / OpenMapTiles).
// Verified against https://tiles.openfreemap.org/styles/liberty.
// A MapTiler (or other) style needs its own table — do not guess ids.

import { STYLE_FAMILY } from './config.mjs';

const LIBERTY = {
  surfaces: [
    {
      id: 'land',
      label: 'Land',
      layers: [{ id: 'background', prop: 'background-color' }],
    },
    {
      id: 'water',
      label: 'Water',
      layers: [
        { id: 'water', prop: 'fill-color' },
        { id: 'waterway_river', prop: 'line-color' },
        { id: 'waterway_other', prop: 'line-color' },
        { id: 'waterway_tunnel', prop: 'line-color' },
      ],
    },
    {
      id: 'park',
      label: 'Parks',
      layers: [
        { id: 'park', prop: 'fill-color' },
        { id: 'landcover_wood', prop: 'fill-color' },
        { id: 'landcover_grass', prop: 'fill-color' },
        { id: 'landuse_pitch', prop: 'fill-color' },
        { id: 'landuse_cemetery', prop: 'fill-color' },
      ],
    },
    {
      id: 'building',
      label: 'Buildings',
      layers: [
        { id: 'building', prop: 'fill-color' },
        { id: 'building-3d', prop: 'fill-extrusion-color' },
      ],
    },
  ],
  // Outlines are derived from the surface color so they stay in family.
  outlines: [
    { id: 'park_outline', prop: 'line-color', from: 'park', amount: 0.22 },
    { id: 'building', prop: 'fill-outline-color', from: 'building', amount: 0.18 },
  ],
  // Liberty draws woods and grass very transparent. Lift them so a
  // palette actually reads as parks.
  opacity: [
    ['park', 0.92],
    ['landcover_wood', 0.72],
    ['landcover_grass', 0.66],
    ['landuse_pitch', 0.85],
    ['landuse_cemetery', 0.8],
  ],
  // Footprints start at zoom 16 in the stock style. Bring them in a
  // little so a neighborhood view shows the building color.
  buildingMinZoom: 13,
};

const TABLES = {
  'openfreemap-liberty': LIBERTY,
};

export function surfaceTable(family = STYLE_FAMILY) {
  return TABLES[family] || null;
}

export function surfaceList(family = STYLE_FAMILY) {
  const table = surfaceTable(family);
  return table ? table.surfaces : [];
}
