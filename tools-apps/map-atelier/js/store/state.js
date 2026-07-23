// ═══════════════════════════════════════════════════════════════
// EDITOR STATE — the current map doc (S), the editing session
// (mode, project id, selections), and debounced persistence into
// the projects store.
//
// `S` is a live binding: always reference `S.foo` inside functions,
// never destructure it at module top level. Swap the whole doc with
// setState() — it announces `state:replaced` so every feature
// re-renders itself.
// ═══════════════════════════════════════════════════════════════
import { CARTO_PALETTES, paletteColorsFor } from '../data/cartography.js';
import { defaultLayerStack } from '../data/map-layers.js';
import { P } from '../data/pantone.js';
import { EXAMPLE } from '../data/curated.js';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../config.js';
import { saveProject } from './projects.js';
import { bus } from '../core/bus.js';

export const session = {
  mode: 'editor',        // 'editor' | 'guest'
  projectId: null,       // which project doc persist() writes to
  selectedLayer: 'water',
  selectedPtnLayer: 'water',
  selectedPlaceId: null,
  addMode: false,
};

export function defaultState() {
  const pal = CARTO_PALETTES[0];
  return {
    title: '',
    desc: '',
    paletteName: pal.name,
    colors: paletteColorsFor(pal),
    accent: P(pal.accent),
    ink: P(pal.ink),
    patterns: { water: null, park: null, building: null },
    // Legend inputs only — the swatches are regenerated deterministically by
    // core/scale.js, so they never need storing (and never go stale).
    // brand:'' is the empty state: a neutral palette plus a prompt.
    legend: {
      brand: '',
      patterns: true,
      taxonomy: [
        { name: 'Grassland', children: ['Modified', 'Neutral', 'Calcareous'] },
        { name: 'Woodland',  children: ['Broadleaved', 'Coniferous', 'Mixed'] },
        { name: 'Wetland',   children: ['Fen', 'Marsh', 'Reedbed'] },
      ],
    },
    // per-layer line/border/opacity overrides — all optional, absent = style default.
    // shape: { [uid]: { opacity?, lineWidth?, lineStyle?, border?:{color,width,style} } }
    styles: {},
    // the editable layer stack, bottom-to-top. Entries are instances of the
    // five basemap surfaces; see data/map-layers.js.
    layers: defaultLayerStack(),
    places: [],
    camera: { center: DEFAULT_CENTER.slice(), zoom: DEFAULT_ZOOM },
  };
}

export let S = defaultState();

export function setState(next) {
  S = next;
  syncIdCounter();
  migrateLayerStack();
  bus.emit('state:replaced');
}

// Docs written before the stack existed carry colors/patterns/styles keyed by
// surface id and no `layers` array. Those keys *are* valid base uids, so the
// default stack restores them exactly — no data migration, just the ordering
// that was previously implicit in LAYERS.
function migrateLayerStack() {
  if (Array.isArray(S.layers) && S.layers.length) return;
  S.layers = defaultLayerStack();
}

export function currentPalette() {
  return CARTO_PALETTES.find(p => p.name === S.paletteName) || CARTO_PALETTES[0];
}

// ── place ids ──────────────────────────────────────────────────
let idCtr = 0;
export function nextPlaceId() { return ++idCtr; }
function syncIdCounter() { idCtr = Math.max(0, ...S.places.map(p => p.id || 0)); }

// ── the example map, as a ready-to-save state doc ──────────────
export function exampleState() {
  const st = defaultState();
  st.title = EXAMPLE.title;
  st.desc = EXAMPLE.desc;
  st.camera = { center: EXAMPLE.camera.center.slice(), zoom: EXAMPLE.camera.zoom };
  const pal = CARTO_PALETTES.find(p => p.name === EXAMPLE.paletteName) || CARTO_PALETTES[0];
  st.paletteName = pal.name;
  st.colors = paletteColorsFor(pal);
  st.accent = P(pal.accent);
  st.ink = P(pal.ink);
  st.layers = defaultLayerStack();
  st.patterns = { water: { style: 'waves', densityStep: 3, strokeWidth: 1.4, angle: 0, ink: 'soft' }, park: null, building: null };
  st.styles = {};
  st.places = EXAMPLE.places.map((p, i) => ({ id: i + 1, color: '', note: '', ...p }));
  return st;
}

// ── persistence (debounced) ────────────────────────────────────
// Debouncing means there is always an unwritten window of up to 400ms.
// Anything that ends the page — closing the tab, following a link, opening
// a different project — has to flush it first, or the last edits are lost.
let saveTimer;

export function flushPersist() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  if (session.mode === 'guest' || !session.projectId) return;
  saveProject(session.projectId, S);
  bus.emit('state:saved');
}

export function persist() {
  if (session.mode === 'guest' || !session.projectId) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveProject(session.projectId, S);
    bus.emit('state:saved');
  }, 400);
}

// pagehide covers tab close, reload and same-tab navigation; visibilitychange
// catches the mobile case where pagehide can be skipped.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPersist);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPersist();
  });
}
