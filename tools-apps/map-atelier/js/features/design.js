// ═══════════════════════════════════════════════════════════════
// PALETTE + MAP-LAYER PANEL — the theme system, split by how often
// each half is touched. The palette is chosen once and then lived
// with, so it collapses to a single thumbnail docked on the map and
// only unfolds into the full template grid when clicked. Layers are
// tuned constantly, so they get the permanent right column.
//
// Three rules shape this:
//   · Progressive disclosure: one palette on screen, eight behind it.
//   · Color discovery belongs in the Color Library flyout, not in a
//     search box at the bottom of a scroll. This panel offers the
//     committed value and a handful of shades; anything more opens
//     the library beside it.
//   · A pattern is an encoding, not a texture. Orientation carries
//     category, intensity carries value — so the picker groups by
//     orientation and only reveals density/weight once committed.
// ═══════════════════════════════════════════════════════════════
import { setLayerColor, setLayerStyle, applyAllColors, applyLayerColor, applyLayerStyle,
         applyLayerOrder, removeDuplicateLayers } from './map.js';
import { PTN_STYLES, PTN_GROUPS, ptnPreviewURL, ptnMonoURL, resolveInk, ptnComposite,
         PTN_DENSITY_STEPS, PTN_WEIGHT_STEPS, ptnWeightIndex } from './patterns-engine.js';
import { openLibrary, isOpen as libraryOpen, refresh as refreshLibrary, closeLibrary } from './color-library.js';
import { S, session, persist } from '../store/state.js';
import { CARTO_PALETTES, paletteColorsFor } from '../data/cartography.js';
import { MAP_SVG } from '../data/palettes.js';
import { P, nearestPantoneToHex } from '../data/pantone.js';
import { LAYERS, LINE_STYLES, canPatternLayer, canBorderLayer, isLineLayer, isPolygonLayer,
         resolveLayer, isDuplicate, canDuplicateBase, nextLayerUid, baseIdOf } from '../data/map-layers.js';
import { patternInkColor, generateScale, ensureHashHex } from '../core/color.js';
import { $, esc } from '../core/dom.js';
import { bus, ESC } from '../core/bus.js';
import { toast } from './toast.js';

// ── palettes ───────────────────────────────────────────────────
export function applyPalette(p, { silent = false } = {}) {
  S.paletteName = p.name;
  S.colors = paletteColorsFor(p);
  S.accent = P(p.accent);
  S.ink = P(p.ink);
  applyAllColors();
  renderPalettes();
  renderPaletteDock();
  renderLayerStack();
  if (panelOpen()) renderLayerPanel();
  bus.emit('palette:applied');
  persist();
  if (!silent) toast(`“${p.name}” applied ✨`);
}

// Shuffle is random at the *palette* layer, never at the color layer —
// a random walk through 2,310 swatches produces noise, a random pick
// from eight curated palettes produces a map someone designed.
function shufflePalette() {
  const others = CARTO_PALETTES.filter(p => p.name !== S.paletteName);
  const pool = others.length ? others : CARTO_PALETTES;
  applyPalette(pool[Math.floor(Math.random() * pool.length)]);
}

// A palette reads as a miniature map, not a row of chips — the same
// artwork the home-page cards use, painted with that palette's five
// surfaces. Thumbnails match the fill swatch (54px) so a palette and a
// committed color are visibly the same kind of object.
function renderPalettes() {
  $('palette-grid').innerHTML = CARTO_PALETTES.map(p => `
    <button class="palette-card ${p.name === S.paletteName ? 'active' : ''}"
      data-palette="${esc(p.name)}" title="${esc(p.mood)}" aria-current="${p.name === S.paletteName}">
      <span class="palette-thumb">${MAP_SVG(paletteColorsFor(p))}</span>
      <span class="palette-card-name">${esc(p.name)}</span>
      <span class="palette-card-harmony">${esc(p.harmony)}</span>
    </button>`).join('');
}

// The dock is the only piece of the theme system that stays on screen:
// one thumbnail of the palette actually in use, on the map it describes.
// Everything else waits behind it until asked for.
function renderPaletteDock() {
  const p = CARTO_PALETTES.find(x => x.name === S.paletteName) || CARTO_PALETTES[0];
  $('palette-dock-thumb').innerHTML = MAP_SVG(paletteColorsFor(p));
  $('palette-dock-thumb').setAttribute('aria-label', `Palette: ${p.name}. Change it`);
  $('pd-name').textContent = p.name;
}

export function openPaletteModal() {
  renderPalettes();
  $('palette-overlay').classList.add('open');
  // aria-modal is a promise that the rest of the page is unreachable; `inert`
  // is what keeps it. Without this, Tab walks straight out of the dialog.
  // (The topbar is editor-only; the stage is on every page.)
  if ($('topbar')) $('topbar').inert = true;
  $('stage').inert = true;
  bus.emit('ui:dismiss-transient');
  // a macrotask, not rAF: the browser focuses the button that was clicked
  // as part of finishing the click, which would undo an earlier focus call
  setTimeout(() => $('palette-grid').querySelector('.palette-card.active, .palette-card')?.focus(), 0);
}
export function closePaletteModal() {
  $('palette-overlay').classList.remove('open');
  if ($('topbar')) $('topbar').inert = false;
  $('stage').inert = false;
  $('palette-dock-thumb').focus();
}
function paletteModalOpen() { return $('palette-overlay').classList.contains('open'); }

// ── layer list ─────────────────────────────────────────────────
// The dot previews the pattern too, so the list reads as the map does.
function layerDotStyle(uid) {
  const c = S.colors[uid] || '#eee';
  const inst = S.patterns[uid];
  if (!inst) return `background:${c}`;
  const preview = { ...inst, strokeColor: resolveInk(inst, uid), backgroundColor: c };
  return `background-color:${c}; background-image:${ptnPreviewURL(preview)}`;
}

// ── the layer stack (rail) ─────────────────────────────────────
// Photoshop order: the top row is the topmost layer, while S.layers is
// stored bottom-to-top the way Mapbox draws. One reverse at the render
// boundary keeps both readings honest.
function stack() { return Array.isArray(S.layers) ? S.layers : []; }
function stackEntry(uid) { return stack().find(e => e.uid === uid); }

function currentLayer() { return resolveLayer(session.selectedLayer); }
// Keyed off the rail being in the document, not off session.mode: the
// mode is set by the page's router, which runs *after* boot, so asking
// about it here rendered the layer panel into a page that has none.
function isPanelOpen() { return !!$('layer-stack'); }
function layerStyle(id) { return (S.styles && S.styles[id]) || {}; }

const ICON = {
  grip: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6.4 0 10 7 10 7a17 17 0 0 1-3 3.9M6.5 7.6C3.8 9.3 2 12 2 12s3.6 7 10 7a9.9 9.9 0 0 0 4.2-.9"/><path d="M3 3l18 18"/></svg>',
  dup: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  del: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

function renderLayerStack() {
  const host = $('layer-stack');
  if (!host) return;
  // rendered top-down; `data-uid` is what every handler works from
  host.innerHTML = [...stack()].reverse().map(entry => {
    const layer = resolveLayer(entry.uid);
    if (!layer) return '';
    const on = entry.uid === session.selectedLayer;
    const hidden = entry.visible === false;
    const dup = isDuplicate(entry.uid);
    const canDup = canDuplicateBase(layer);
    return `<div class="layer-row ${on ? 'active' : ''} ${hidden ? 'hidden-layer' : ''}"
        data-uid="${esc(entry.uid)}" role="listitem" tabindex="0" draggable="true"
        aria-current="${on}" aria-label="${esc(entry.name || layer.label)}">
      <span class="layer-grip" aria-hidden="true">${ICON.grip}</span>
      <span class="layer-chip-dot" style="${layerDotStyle(entry.uid)}"></span>
      <span class="layer-row-name">${esc(entry.name || layer.label)}</span>
      <span class="layer-row-acts">
        ${canDup ? `<button class="layer-act" data-act="dup" title="Duplicate layer" aria-label="Duplicate ${esc(entry.name || layer.label)}">${ICON.dup}</button>` : ''}
        <button class="layer-act" data-act="vis" title="${hidden ? 'Show layer' : 'Hide layer'}"
          aria-pressed="${!hidden}" aria-label="${hidden ? 'Show' : 'Hide'} ${esc(entry.name || layer.label)}">${hidden ? ICON.eyeOff : ICON.eye}</button>
        ${dup ? `<button class="layer-act danger" data-act="del" title="Delete copy" aria-label="Delete ${esc(entry.name || layer.label)}">${ICON.del}</button>` : ''}
      </span>
    </div>`;
  }).join('');
  const nm = $('mlp-name');
  if (nm) nm.textContent = currentLayerName();
}

function currentLayerName() {
  const e = stackEntry(session.selectedLayer);
  const l = currentLayer();
  return (e && e.name) || (l && l.label) || '—';
}

// ── layer actions ──────────────────────────────────────────────
function toggleVisibility(uid) {
  const e = stackEntry(uid);
  if (!e) return;
  e.visible = e.visible === false;
  applyLayerStyle(uid);
  if (S.patterns[uid]) ptnComposite(uid);
  renderLayerStack();
  persist();
}

// A copy paints the same geometry again, above the original — that is what
// makes a pattern over a solid fill, or a translucent tint over a base,
// possible at all. It starts as an exact clone so the map does not change
// until you edit the copy.
function duplicateLayer(uid) {
  const base = resolveLayer(uid);
  if (!base || !canDuplicateBase(base)) return;
  const uid2 = nextLayerUid(stack(), baseIdOf(uid));
  const i = stack().findIndex(e => e.uid === uid);
  const src = stackEntry(uid);
  stack().splice(i + 1, 0, { uid: uid2, name: `${(src && src.name) || base.label} copy`, visible: true });
  S.colors[uid2] = S.colors[uid];
  if (S.patterns[uid]) S.patterns[uid2] = JSON.parse(JSON.stringify(S.patterns[uid]));
  if (S.styles && S.styles[uid]) S.styles[uid2] = JSON.parse(JSON.stringify(S.styles[uid]));
  applyLayerColor(uid2, S.colors[uid2]);
  if (S.patterns[uid2]) ptnComposite(uid2);
  applyLayerOrder();
  selectLayer(uid2);
  renderLayerStack();
  persist();
  toast('Layer duplicated ✓');
}

function deleteLayer(uid) {
  if (!isDuplicate(uid)) return;          // base surfaces are the map itself
  removeDuplicateLayers(uid);
  const i = stack().findIndex(e => e.uid === uid);
  if (i >= 0) stack().splice(i, 1);
  delete S.colors[uid];
  delete S.patterns[uid];
  if (S.styles) delete S.styles[uid];
  if (session.selectedLayer === uid) {
    session.selectedLayer = stack()[stack().length - 1]?.uid || 'land';
    if (panelOpen()) renderLayerPanel();
  }
  renderLayerStack();
  persist();
  toast('Layer removed');
}

// `to` is an index into the stored bottom-to-top array
function moveLayer(uid, to) {
  const from = stack().findIndex(e => e.uid === uid);
  if (from < 0 || to < 0 || to >= stack().length || from === to) return;
  const [e] = stack().splice(from, 1);
  stack().splice(to, 0, e);
  applyLayerOrder();
  renderLayerStack();
  persist();
}

// ── layer panel (opens on the map) ─────────────────────────────
export function openLayerPanel(uid) {
  if (!$('layer-panel')) return;
  if (uid) session.selectedLayer = uid;
  // the place panel and this one share the same corner — one at a time
  bus.emit('ui:dismiss-transient');
  $('layer-panel').classList.add('open');
  renderLayerPanel();
}
export function closeLayerPanel() {
  const p = $('layer-panel');
  if (p) p.classList.remove('open');
  if (libraryOpen()) closeLibrary();
}
function panelOpen() { return !!$('layer-panel')?.classList.contains('open'); }

function selectLayer(layerId) {
  session.selectedLayer = layerId;
  renderLayerStack();
  if (panelOpen()) renderLayerPanel();
  if (libraryOpen()) openFillLibrary();
}

function renderLayerPanel() {
  const layer = currentLayer();
  if (!layer || !$('layer-panel')) return;
  const uid = session.selectedLayer;
  const c = S.colors[uid] || '#cccccc';

  const nm = $('mlp-name');
  if (nm) nm.textContent = currentLayerName();
  $('lp-name').textContent = currentLayerName();
  $('lp-swatch').style.cssText = layerDotStyle(uid);

  // The committed swatch previews color *and* pattern together — it is a
  // proof of the layer, not a color chip.
  const sw = $('cur-swatch');
  sw.style.cssText = layerDotStyle(uid);
  $('hex-input').value = c.replace('#', '').toUpperCase();
  $('native-picker').value = ensureHashHex(c);
  $('opacity-input').value = Math.round((layerStyle(layer.id).opacity ?? 1) * 100);

  const showPattern = canPatternLayer(layer);
  const showBorder  = canBorderLayer(layer);
  const showLine    = isLineLayer(layer);
  $('mlp-pattern-block').style.display = showPattern ? '' : 'none';
  $('mlp-border-block').style.display  = showBorder  ? '' : 'none';
  $('mlp-line-block').style.display    = showLine    ? '' : 'none';

  if (showPattern) renderPatternBlock();
  if (showBorder)  renderBorderBlock();
  if (showLine)    renderLineBlock();
}

// ── color editing ──────────────────────────────────────────────
function setColor(hex) {
  if (!session.selectedLayer) return;
  setLayerColor(session.selectedLayer, hex);
}

function setOpacityPct(pct) {
  if (!session.selectedLayer) return;
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  setLayerStyle(session.selectedLayer, { opacity: v / 100 });
}

// ── library targets ────────────────────────────────────────────
function openFillLibrary() {
  const lid = session.selectedLayer;
  if (!lid) return;
  openLibrary({
    layerId: lid, slot: 'fill', label: `${currentLayer().label} · fill`,
    get: () => S.colors[lid],
    set: hex => setColor(hex),
  });
}
function openInkLibrary() {
  const lid = session.selectedLayer;
  const inst = S.patterns[lid];
  if (!lid || !inst) return;
  openLibrary({
    layerId: lid, slot: 'ink', label: `${currentLayer().label} · pattern ink`,
    get: () => (S.patterns[lid] ? resolveInk(S.patterns[lid], lid) : '#000000'),
    // re-read state rather than closing over `inst`: picking a different
    // pattern style swaps the object, and the stale reference would silently
    // write the ink onto an orphan
    set: hex => {
      const cur = S.patterns[lid];
      if (!cur) return;
      cur.ink = hex;
      ptnComposite(lid); renderPatternBlock(); persist();
    },
  });
}

// ── line block ─────────────────────────────────────────────────
function renderLineBlock() {
  const st = layerStyle(session.selectedLayer);
  const w = st.lineWidth ?? 3;
  $('line-width').value = w;
  $('line-width-val').textContent = w;
  const active = st.lineStyle || 'solid';
  $('line-styles').innerHTML = LINE_STYLES.map(s =>
    `<button class="seg-chip ${s.id === active ? 'active' : ''}" data-linestyle="${s.id}" aria-pressed="${s.id === active}">${s.label}</button>`).join('');
}

// ── border block ───────────────────────────────────────────────
// The width input is the on/off switch: 0 means no border. One control
// instead of a checkbox plus a slider, and it matches the color row above.
function renderBorderBlock() {
  const b = layerStyle(session.selectedLayer).border;
  const bc = (b && b.color) || S.ink || '#333333';
  $('border-swatch').style.background = bc;
  $('border-hex').value = bc.replace('#', '').toUpperCase();
  $('border-picker').value = ensureHashHex(bc);
  $('border-width').value = (b && b.width) || 0;
}
function currentBorder() {
  const b = layerStyle(session.selectedLayer).border || {};
  return { color: b.color || S.ink || '#333333', width: b.width || 0, style: b.style || 'solid' };
}
function patchBorder(patch) {
  if (!session.selectedLayer) return;
  const next = { ...currentBorder(), ...patch };
  if (!next.width) next.width = 2;               // giving it a color implies showing it
  setLayerStyle(session.selectedLayer, { border: next });
}

// ── pattern block ──────────────────────────────────────────────
function defaultPattern(styleId) {
  return { style: styleId, densityStep: 5, strokeWidth: 1.6, angle: 0, ink: 'auto' };
}

function renderPatternBlock() {
  const lid = session.selectedLayer;
  const cur = S.patterns[lid];
  const style = cur && PTN_STYLES.find(s => s.id === cur.style);

  $('ptn-axis').textContent = style ? style.axis : 'Orientation encodes category';

  const tile = (st) => `<button class="ptn-tile ${cur && cur.style === st.id ? 'active' : ''}"
    data-ptn="${st.id}" title="${esc(st.label)} · ${esc(st.axis)}"
    aria-label="${esc(st.label)}, ${esc(st.axis)}" aria-pressed="${!!(cur && cur.style === st.id)}"
    style="background-image:${ptnMonoURL(st.id, { densityStep: 5, strokeWidth: 1.6 })}"></button>`;

  // One continuous grid, ordered by orientation family (lines → grids →
  // marks → curves). Adjacency does the grouping; labelled sections only
  // added chrome to a set small enough to scan in a single pass.
  const ordered = PTN_GROUPS.flatMap(g => PTN_STYLES.filter(s => s.group === g.id));

  $('pattern-groups').innerHTML = `<div class="ptn-grid" role="group" aria-label="Pattern">
      <button class="ptn-tile none ${!cur ? 'active' : ''}" data-ptn="none" title="No pattern"
        aria-label="No pattern" aria-pressed="${!cur}"></button>
      ${ordered.map(tile).join('')}
    </div>`;

  renderPtnControls();
}

function renderPtnControls() {
  const lid = session.selectedLayer;
  const inst = S.patterns[lid];
  const box = $('ptn-controls');
  box.style.display = inst ? 'block' : 'none';
  if (!inst) return;

  // Density ramp — the same pattern at rising frequency, left to right.
  $('ptn-density-val').textContent = `${inst.densityStep + 1} / ${PTN_DENSITY_STEPS}`;
  $('ptn-density-ramp').innerHTML = Array.from({ length: PTN_DENSITY_STEPS }, (_, i) =>
    `<button class="ramp-step ${i === inst.densityStep ? 'active' : ''}" data-density="${i}"
      title="Density ${i + 1}" aria-label="Density ${i + 1} of ${PTN_DENSITY_STEPS}"
      aria-pressed="${i === inst.densityStep}"
      style="background-image:${ptnMonoURL(inst.style, { densityStep: i, strokeWidth: 1.4 })}"></button>`).join('');

  // Weight ramp — same frequency, thickening stroke.
  const wIdx = ptnWeightIndex(inst.strokeWidth);
  $('ptn-weight-val').textContent = inst.strokeWidth.toFixed(1);
  $('ptn-weight-ramp').innerHTML = PTN_WEIGHT_STEPS.map((w, i) =>
    `<button class="ramp-step ${i === wIdx ? 'active' : ''}" data-weight="${w}"
      title="Weight ${w.toFixed(1)}" aria-label="Line weight ${w.toFixed(1)}"
      aria-pressed="${i === wIdx}"
      style="background-image:${ptnMonoURL(inst.style, { densityStep: 4, strokeWidth: w })}"></button>`).join('');

  // Ink alternates — the presets, then a jump into the full library.
  const presets = [['auto', 'Auto'], ['soft', 'Soft'], ['bold', 'Bold'], ['accent', 'Accent']];
  const active = resolveInk(inst, lid).toLowerCase();
  $('ptn-inks').innerHTML = presets.map(([id, lbl]) => {
    const hex = resolveInk({ ...inst, ink: id }, lid);
    return `<button class="chip-swatch ${inst.ink === id ? 'active' : ''}" data-ink="${id}"
      style="background:${hex}" title="${lbl} · ${hex.toUpperCase()}"
      aria-label="${lbl} ink, ${hex.toUpperCase()}" aria-pressed="${inst.ink === id}"></button>`;
  }).join('') + generateScale(S.colors[lid] || '#888', 8).map(hex =>
    `<button class="chip-swatch ${hex.toLowerCase() === active && typeof inst.ink === 'string' && inst.ink.startsWith('#') ? 'active' : ''}"
      data-ink="${hex}" style="background:${hex}" title="${hex.toUpperCase()}"
      aria-label="Ink ${hex.toUpperCase()}"></button>`).join('');
}

// ── wiring ─────────────────────────────────────────────────────
// Split in two: the palette dock ships with the map surface, so it is
// wired on every page. The layer panel is editor furniture that lives in
// the rail, so it is wired only when the rail is actually there.
export function init() {
  wirePalette();
  if ($('pane-map')) wireLayerPanel();

  renderPaletteDock();
  session.selectedLayer = session.selectedLayer || 'land';
  if (isPanelOpen()) renderLayerStack();
}

function wirePalette() {
  $('btn-shuffle-palette').addEventListener('click', shufflePalette);
  $('palette-dock-thumb').addEventListener('click', openPaletteModal);
  $('palette-close').addEventListener('click', closePaletteModal);
  $('palette-overlay').addEventListener('click', e => {
    if (e.target === $('palette-overlay')) closePaletteModal();   // backdrop
  });

  $('palette-grid').addEventListener('click', e => {
    const b = e.target.closest('[data-palette]'); if (!b) return;
    const p = CARTO_PALETTES.find(x => x.name === b.dataset.palette);
    if (p) { applyPalette(p); closePaletteModal(); }
  });

  bus.on('palette:open', openPaletteModal);
  bus.on('palette:applied', renderPaletteDock);
  bus.on('state:replaced', renderPaletteDock);
  bus.on('ui:escape', ctx => { if (!ctx.handled && paletteModalOpen()) { closePaletteModal(); ctx.handled = true; } },
    { priority: ESC.MODAL });
}

function wireLayerPanel() {
  const host = $('layer-stack');

  host.addEventListener('click', e => {
    const row = e.target.closest('.layer-row'); if (!row) return;
    const uid = row.dataset.uid;
    const act = e.target.closest('.layer-act')?.dataset.act;
    if (act === 'vis') { toggleVisibility(uid); return; }
    if (act === 'dup') { duplicateLayer(uid); return; }
    if (act === 'del') { deleteLayer(uid); return; }
    selectLayer(uid);
    openLayerPanel(uid);
  });

  host.addEventListener('keydown', e => {
    const row = e.target.closest('.layer-row'); if (!row) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    selectLayer(row.dataset.uid);
    openLayerPanel(row.dataset.uid);
  });

  // ---- drag to restack ----
  // The rows render top-down while S.layers is stored bottom-up, so the drop
  // index is mirrored once here rather than in every caller.
  let dragUid = null;
  host.addEventListener('dragstart', e => {
    const row = e.target.closest('.layer-row'); if (!row) return;
    dragUid = row.dataset.uid;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    // Firefox refuses to start a drag without payload
    try { e.dataTransfer.setData('text/plain', dragUid); } catch (err) {}
  });
  host.addEventListener('dragend', () => {
    dragUid = null;
    host.querySelectorAll('.layer-row').forEach(r => r.classList.remove('dragging', 'drop-target'));
  });
  host.addEventListener('dragover', e => {
    const row = e.target.closest('.layer-row');
    if (!row || !dragUid || row.dataset.uid === dragUid) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    host.querySelectorAll('.layer-row').forEach(r => r.classList.toggle('drop-target', r === row));
  });
  host.addEventListener('drop', e => {
    const row = e.target.closest('.layer-row');
    if (!row || !dragUid) return;
    e.preventDefault();
    const rows = [...host.querySelectorAll('.layer-row')].map(r => r.dataset.uid);
    const visualTo = rows.indexOf(row.dataset.uid);
    const uid = dragUid;
    dragUid = null;
    moveLayer(uid, stack().length - 1 - visualTo);
  });

  $('lp-close').addEventListener('click', closeLayerPanel);


  // ---- fill ----
  $('cur-swatch').addEventListener('click', openFillLibrary);
  $('open-library').addEventListener('click', openFillLibrary);
  $('native-picker').addEventListener('input', e => setColor(e.target.value));
  $('hex-input').addEventListener('input', e => {
    const val = '#' + e.target.value.trim().replace(/^#/, '');
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) setColor(val);
  });
  $('opacity-input').addEventListener('input', e => {
    const n = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n)) setOpacityPct(n);
  });

  // ---- line ----
  $('line-width').addEventListener('input', e => {
    if (!session.selectedLayer) return;
    const w = +e.target.value;
    $('line-width-val').textContent = w;
    setLayerStyle(session.selectedLayer, { lineWidth: w });
  });
  $('line-styles').addEventListener('click', e => {
    const b = e.target.closest('[data-linestyle]'); if (!b || !session.selectedLayer) return;
    setLayerStyle(session.selectedLayer, { lineStyle: b.dataset.linestyle });
    renderLineBlock();
  });

  // ---- border ----
  $('border-swatch').addEventListener('click', () => $('border-picker').click());
  $('border-picker').addEventListener('input', e => patchBorder({ color: e.target.value }));
  $('border-hex').addEventListener('input', e => {
    const val = '#' + e.target.value.trim().replace(/^#/, '');
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) patchBorder({ color: val });
  });
  $('border-width').addEventListener('input', e => {
    if (!session.selectedLayer) return;
    const w = Math.max(0, Math.min(12, parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0));
    // 0 is "no border" — clear the override entirely rather than drawing a hairline
    if (w === 0) setLayerStyle(session.selectedLayer, { border: null });
    else patchBorder({ width: w });
  });

  // ---- pattern ----
  $('pattern-groups').addEventListener('click', e => {
    const b = e.target.closest('[data-ptn]'); if (!b) return;
    const lid = session.selectedLayer;
    const id = b.dataset.ptn;
    if (id === 'none') S.patterns[lid] = null;
    else {
      const cur = S.patterns[lid];
      S.patterns[lid] = cur ? { ...cur, style: id } : defaultPattern(id);
    }
    ptnComposite(lid);
    renderPatternBlock();
    renderLayerPanel();
    persist();
  });

  $('ptn-density-ramp').addEventListener('click', e => {
    const b = e.target.closest('[data-density]'); if (!b) return;
    const inst = S.patterns[session.selectedLayer]; if (!inst) return;
    inst.densityStep = +b.dataset.density;
    ptnComposite(session.selectedLayer);
    renderPtnControls(); renderLayerPanel(); persist();
  });

  $('ptn-weight-ramp').addEventListener('click', e => {
    const b = e.target.closest('[data-weight]'); if (!b) return;
    const inst = S.patterns[session.selectedLayer]; if (!inst) return;
    inst.strokeWidth = +b.dataset.weight;
    ptnComposite(session.selectedLayer);
    renderPtnControls(); renderLayerPanel(); persist();
  });

  $('ptn-inks').addEventListener('click', e => {
    const b = e.target.closest('[data-ink]'); if (!b) return;
    const inst = S.patterns[session.selectedLayer]; if (!inst) return;
    inst.ink = b.dataset.ink;
    ptnComposite(session.selectedLayer);
    renderPtnControls(); renderLayerPanel(); persist();
  });

  $('open-library-ink').addEventListener('click', openInkLibrary);

  // bus
  bus.on('color:changed', () => {
    renderLayerStack();
    if (panelOpen()) renderLayerPanel();
    refreshLibrary();
  });
  bus.on('palette:applied', () => { renderLayerStack(); if (panelOpen()) renderLayerPanel(); });
  bus.on('state:replaced', () => {
    // a swapped doc brings its own stack; make sure the selection still exists
    if (!stackEntry(session.selectedLayer)) session.selectedLayer = stack()[0]?.uid || 'land';
    renderLayerStack();
    if (panelOpen()) renderLayerPanel();
  });
  bus.on('ui:escape', ctx => {
    if (ctx.handled || !panelOpen()) return;
    closeLayerPanel(); ctx.handled = true;
  }, { priority: ESC.FLYOUT });
  // the place panel takes the same corner
  bus.on('place:select', () => closeLayerPanel());
}
