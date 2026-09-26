// A short set of whole-map palettes. Each one recolors land, water,
// parks, and buildings. Roads and labels stay with the basemap, except
// that a dark land color flips label ink so names stay readable.

export const PALETTES = [
  {
    name: 'Paper day',
    mood: 'Warm paper, river blue, garden green',
    ink: '#1F4E79',
    colors: { land: '#F4F1EA', water: '#4F84C4', park: '#B7D7A8', building: '#E3DDD4' },
  },
  {
    name: 'Coastal',
    mood: 'Harbor teal for water-forward maps',
    ink: '#155E75',
    colors: { land: '#F3F6F4', water: '#0E7490', park: '#A8D0C4', building: '#E4E7E4' },
  },
  {
    name: 'Survey',
    mood: 'Field-sheet sand and umber',
    ink: '#6B3A2A',
    colors: { land: '#E7D7C1', water: '#8C5A3C', park: '#8A9164', building: '#D2C4B0' },
  },
  {
    name: 'High contrast',
    mood: 'Surfaces separate on lightness alone',
    ink: '#111416',
    colors: { land: '#F7F7F2', water: '#0B3A66', park: '#1F6B45', building: '#8D8F8C' },
  },
  {
    name: 'Night',
    mood: 'Dark land so the water and parks still read',
    ink: '#D6E8F5',
    colors: { land: '#1E2226', water: '#16324F', park: '#1E4D3A', building: '#3A4046' },
  },
];

export function paletteByName(name) {
  return PALETTES.find((p) => p.name === name) || PALETTES[0];
}
