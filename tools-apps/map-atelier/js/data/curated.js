// ═══════════════════════════════════════════════════════════════
// CURATED CONTENT — starter places (from the Chile guide, real
// coordinates) and the example story map shown to first-timers.
// ═══════════════════════════════════════════════════════════════
export const CURATED = [
  { name:'Bocanáriz',           tag:'Wine bar · Lastarria',      lng:-70.6405, lat:-33.4380, icon:'wine',    note:'Wines by the glass from every corner of Chile.' },
  { name:'Ambrosía Bistró',     tag:'Restaurant · Lastarria',    lng:-70.6400, lat:-33.4370, icon:'dining',  note:'Chilean–Thai–Peruvian–French. Get a reservation.' },
  { name:'Chipe Libre',         tag:'Pisco bar · Lastarria',     lng:-70.6412, lat:-33.4376, icon:'cocktail',note:'The independent republic of pisco.' },
  { name:'La Chascona',         tag:'Neruda’s house · Bellavista', lng:-70.6344, lat:-33.4311, icon:'book',  note:'Built like a ship, for a love with wild curly hair.' },
  { name:'GAM',                 tag:'Cultural center',           lng:-70.6417, lat:-33.4382, icon:'music',   note:'Theater, dance, and art — always something on.' },
  { name:'W Santiago',          tag:'Hotel · El Golf',           lng:-70.6007, lat:-33.4149, icon:'home',    note:'The rooftop pool with the best view of the Andes.' },
  { name:'La Cabrera Chile',    tag:'Steakhouse · El Golf',      lng:-70.6015, lat:-33.4118, icon:'dining',  note:'Cuts that do not mess around.' },
  { name:'Plaza Los Dominicos', tag:'Artisan market',            lng:-70.5415, lat:-33.4084, icon:'flower',  note:'Baby-alpaca scarves and woven treasures.' },
  { name:'Casa del Bosque',     tag:'Winery · Casablanca',       lng:-71.4353, lat:-33.3188, icon:'wine',    note:'Tastings on a hill above the valley.' },
  { name:'Matetic Vineyards',   tag:'Winery · Casablanca',       lng:-71.4769, lat:-33.4786, icon:'rings',   note:'Biodynamic wine among olive trees.' },
  { name:'La Sebastiana',       tag:'Neruda’s house · Valparaíso', lng:-71.6265, lat:-33.0460, icon:'camera', note:'Five stories above the harbor.' },
  { name:'Playa Reñaca',        tag:'Beach · Viña del Mar',      lng:-71.5450, lat:-32.9694, icon:'wave',    note:'Where Santiago goes to soak up the sun.' },
  { name:'Isla Negra',          tag:'Coast · Neruda trail',      lng:-71.6950, lat:-33.4095, icon:'heart',   note:'His favorite house, shaped like a boat facing the sea.' },
  { name:'Pomaire',             tag:'Pottery town',              lng:-71.1514, lat:-33.6499, icon:'coffee',  note:'Clay pots, cazuela, and chanchitos for good luck.' },
  { name:'Embalse El Yeso',     tag:'Reservoir · Cajón del Maipo', lng:-70.0652, lat:-33.6429, icon:'mountain', note:'Turquoise water 3,000 meters up.' },
  { name:'Termas Valle de Colina', tag:'Hot springs · Andes',    lng:-69.9809, lat:-33.8527, icon:'spa',     note:'Terraced pools at altitude. Bring layers.' },
  { name:'Termas Geométricas',  tag:'Hot springs · Villarrica',  lng:-71.8749, lat:-39.5019, icon:'spa',     note:'Seventeen pools on a red wooden walkway in the forest.' },
  { name:'Volcán Villarrica',   tag:'Volcano · Pucón',           lng:-71.9396, lat:-39.4203, icon:'mountain',note:'Rucapillán — stand on the rim of a fuming crater.' },
];

// The example story map
export const EXAMPLE = {
  title: 'Camila & Tomás',
  desc: 'Nos casamos el 14 de marzo en el Valle de Casablanca. This map is our story — every place we fell in love with (and in), from a wine bar in Lastarria to the vineyard where we’ll say “sí, acepto.” Ven a conocer nuestro Chile.',
  paletteName: 'Analogous Coast',
  camera: { center: [-71.05, -33.42], zoom: 8.4 },
  places: [
    { name:'Bocanáriz', lng:-70.6405, lat:-33.4380, icon:'wine', note:'Where it all began — a wine flight, a shared table, and four hours that felt like twenty minutes. Feb 2022.' },
    { name:'La Chascona', lng:-70.6344, lat:-33.4311, icon:'book', note:'Our first Sunday together. Tomás read Neruda aloud in the ship-cabin dining room. Cursi, pero funcionó.' },
    { name:'Embalse El Yeso', lng:-70.0652, lat:-33.6429, icon:'mountain', note:'Our first road trip. Turquoise water, 3,000 meters up, empanadas in the trunk.' },
    { name:'Isla Negra', lng:-71.6950, lat:-33.4095, icon:'heart', note:'Where Tomás whispered “algún día nos casamos frente al mar.” We watched the waves from Neruda’s window.' },
    { name:'Termas Geométricas', lng:-71.8749, lat:-39.5019, icon:'spa', note:'Camila’s 30th. Seventeen hot pools, one freezing waterfall, y una promesa.' },
    { name:'Casa del Bosque', lng:-71.4353, lat:-33.3188, icon:'rings', note:'The proposal — at the tasting house on the hill, at golden hour. She said sí before he finished the question.' },
    { name:'Matetic Vineyards', lng:-71.4769, lat:-33.4786, icon:'church', note:'THE VENUE · March 14, 2027. Biodynamic wine, olive trees, and everyone we love in one valley.' },
    { name:'Playa Reñaca', lng:-71.5450, lat:-32.9694, icon:'wave', note:'Day-after beach day. Everyone’s invited. Bring sunscreen and your worst dance moves.' },
  ],
};
