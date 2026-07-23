// ═══════════════════════════════════════════════════════════════
// COLOR LIBRARY — the browse surface for all 2,310 Pantone swatches.
//
// One continuous grid rather than a set of tabs: the first two rows
// are the swatches curated for this layer's cartographic role, and
// everything below is the full library in spectrum order. Three
// orthogonal filters narrow it — hue family, tone (muted → vivid) and
// value (light → dark) — named the way people describe color out loud.
//
// It edits whatever target it was opened for (a layer fill, a border,
// or a pattern ink), so one panel serves every color slot.
// ═══════════════════════════════════════════════════════════════
import { curatedForLayer, LAYER_ROLES, contrastRatio, FILL_SEPARATION_MIN,
         HUE_FAMILIES, familyOf, TONE_BANDS, VALUE_BANDS, spectrumSort } from '../data/cartography.js';
import { PCOLORS, nearestPantoneToHex } from '../data/pantone.js';
import { S } from '../store/state.js';
import { $, esc } from '../core/dom.js';
import { bus, ESC } from '../core/bus.js';

// { layerId, slot: 'fill' | 'border' | 'ink', get(), set(hex), label }
let target = null;
let opener = null;        // what to hand focus back to on close
let searchTimer = null;   // must be cancellable from close, not just from input

// filters — hue is multi-select, tone/value are single-select bands
const filters = { q: '', hues: new Set(), tone: null, value: null };

// the whole library, pre-sorted and pre-tagged once
const ALL = PCOLORS.map(c => ({ ...c, family: familyOf(c) })).sort(spectrumSort);

export function isOpen() { return $('color-library').classList.contains('open'); }

export function openLibrary(next) {
  // the place panel occupies the identical slot on the map's right edge
  bus.emit('library:opened');
  opener = document.activeElement;
  target = next;
  resetFilters();
  $('color-library').classList.add('open');
  renderChrome();
  syncBandAvailability();
  renderBody();
  requestAnimationFrame(() => $('cl-search').focus());
}

export function closeLibrary() {
  const panel = $('color-library');
  // hand focus back before the panel goes away, or it lands on <body>
  const hadFocus = panel.contains(document.activeElement);
  clearTimeout(searchTimer);
  searchTimer = null;
  panel.classList.remove('open');
  target = null;
  if (hadFocus && opener && opener.isConnected && opener.offsetParent !== null) opener.focus();
  opener = null;
}

// An external color change (a shade chip, a palette swap) only needs the
// head, the ring and the contrast line. Re-rendering the body would throw
// away the user's scroll position through 2,310 swatches.
export function refresh() {
  if (!isOpen() || !target) return;
  const cur = currentHex();
  renderHead();
  setRing(cur);
  renderContrast(cur);
}

function resetFilters() {
  clearTimeout(searchTimer);
  searchTimer = null;
  filters.q = '';
  filters.hues.clear();
  filters.tone = null;
  filters.value = null;
  const s = $('cl-search');
  if (s) { s.value = ''; $('cl-clear').hidden = true; }
}

// ── chrome: head + filter controls ─────────────────────────────
function renderHead() {
  const cur = currentHex();
  const pn = nearestPantoneToHex(cur);
  $('cl-slot').textContent = target.label;
  $('cl-cur-swatch').style.background = cur;
  $('cl-cur-name').textContent = pn ? pn.display : '—';
  $('cl-cur-code').textContent = pn ? `PANTONE ${pn.code}` : cur.toUpperCase();
}

function renderChrome() {
  renderHead();
  const noHue = filters.hues.size === 0;
  $('cl-hues').innerHTML =
    `<button class="cl-hue all ${noHue ? 'active' : ''}" data-hue=""
       aria-pressed="${noHue}" aria-label="All hues">All</button>` +
    HUE_FAMILIES.map(f => {
      const on = filters.hues.has(f.id);
      return `<button class="cl-hue ${on ? 'active' : ''}" data-hue="${f.id}"
        aria-pressed="${on}" aria-label="${f.id}" title="${f.id}"
        ><span class="cl-hue-dot" style="background:${f.dot}"></span></button>`;
    }).join('');
  renderBands();
}

function renderBands() {
  const band = (el, bands, active, axis) => $(el).innerHTML =
    `<button class="cl-band-opt ${active ? '' : 'active'}" data-band=""
       aria-pressed="${!active}" aria-label="All ${axis}">All</button>` +
    bands.map(b => `<button class="cl-band-opt ${active === b.id ? 'active' : ''}"
      data-band="${b.id}" aria-pressed="${active === b.id}">${b.label}</button>`).join('');
  band('cl-tone', TONE_BANDS, filters.tone, 'tones');
  band('cl-value', VALUE_BANDS, filters.value, 'values');
}

// A band that can only ever return zero results is a dead end — the tone
// axis inside Neutral/White/Black is the obvious case, since those
// families are defined by having almost no saturation. Dim and disable
// those buttons rather than letting the user land on an empty grid.
function syncBandAvailability() {
  const count = (axis, id) => {
    const probe = { ...filters, [axis]: id };
    return ALL.reduce((n, c) => n + (matchesWith(probe, c) ? 1 : 0), 0);
  };
  [['tone', 'cl-tone', TONE_BANDS], ['value', 'cl-value', VALUE_BANDS]].forEach(([axis, el, bands]) => {
    $(el).querySelectorAll('[data-band]').forEach(b => {
      if (!b.dataset.band) return;                       // "All" is never dead
      const dead = count(axis, b.dataset.band) === 0;
      b.disabled = dead;
      b.classList.toggle('dead', dead);
    });
  });
}

// in-place state flips, so the focused button survives
function syncHues() {
  const none = filters.hues.size === 0;
  $('cl-hues').querySelectorAll('[data-hue]').forEach(b => {
    const on = b.dataset.hue ? filters.hues.has(b.dataset.hue) : none;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
}
function syncBand(row, active) {
  row.querySelectorAll('[data-band]').forEach(b => {
    const on = b.dataset.band ? b.dataset.band === active : !active;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

// ── filtering ──────────────────────────────────────────────────
// Parameterised so a hypothetical filter set can be probed without
// mutating the live one (see syncBandAvailability).
function matchesWith(f, c) {
  // curatedForLayer() hands back raw PCOLORS entries, which carry no
  // `family` — only ALL is pre-tagged. Reading c.family directly made
  // every hue filter silently delete the whole curated strip.
  if (f.hues.size && !f.hues.has(c.family ?? familyOf(c))) return false;
  if (f.tone) {
    const b = TONE_BANDS.find(x => x.id === f.tone);
    if (b && !b.test(c)) return false;
  }
  if (f.value) {
    const b = VALUE_BANDS.find(x => x.id === f.value);
    if (b && !b.test(c)) return false;
  }
  const q = f.q;
  if (!q) return true;
  return c.display.includes(q) || c.name.includes(q)
      || c.code.toLowerCase().includes(q) || c.hex.includes(q.replace('#', ''));
}

const matches = c => matchesWith(filters, c);

const anyFilter = () => !!(filters.q || filters.hues.size || filters.tone || filters.value);

// ── body: curated strip + the full library ─────────────────────
function currentHex() { return (target.get() || '#cccccc').toLowerCase(); }

// Roving tabindex: with 2,310 swatches in the grid, leaving every one in
// the tab order would take a keyboard user 2,310 presses to reach the
// close button. Exactly one swatch is tabbable; arrows move within the
// grid, which is the standard pattern for a large 2-D collection.
const swatch = (c, cur) => {
  const on = `#${c.hex}`.toLowerCase() === cur;
  return `<button class="chip-swatch ${on ? 'active' : ''}"
    data-hex="#${c.hex}" style="background:#${c.hex}" tabindex="-1"
    aria-label="${esc(c.display)}, Pantone ${c.code}"${on ? ' aria-current="true"' : ''}
    title="${esc(c.display)} · PANTONE ${c.code} · #${c.hex.toUpperCase()}"></button>`;
};

// after any body render, make sure exactly one swatch can be tabbed to
function syncRovingTabstop() {
  const body = $('cl-body');
  const chips = body.querySelectorAll('.chip-swatch');
  if (!chips.length) return;
  chips.forEach(c => c.tabIndex = -1);
  (body.querySelector('.chip-swatch.active') || chips[0]).tabIndex = 0;
}

// arrow-key movement across the wrapping grid; columns are measured from
// layout rather than assumed, so it survives a panel resize
function moveFocus(from, key) {
  const chips = [...$('cl-body').querySelectorAll('.chip-swatch')];
  const i = chips.indexOf(from);
  if (i < 0) return false;
  const top = chips[0].offsetTop;
  let perRow = chips.findIndex(c => c.offsetTop > top);
  if (perRow < 1) perRow = chips.length;
  const to = {
    ArrowRight: i + 1, ArrowLeft: i - 1,
    ArrowDown: i + perRow, ArrowUp: i - perRow,
    Home: 0, End: chips.length - 1,
  }[key];
  if (to == null || to < 0 || to >= chips.length) return false;
  from.tabIndex = -1;
  chips[to].tabIndex = 0;
  chips[to].focus();
  return true;
}

// Two rows at the panel's ten-per-row grid. Kept deliberately small:
// this is the shortlist, not a second library.
const CURATED_ROWS = 2, PER_ROW = 10;

// Move the selection ring without touching the other 2,309 nodes.
function setRing(cur) {
  const body = $('cl-body');
  body.querySelectorAll('.chip-swatch.active').forEach(el => {
    el.classList.remove('active');
    el.removeAttribute('aria-current');
  });
  body.querySelectorAll(`.chip-swatch[data-hex="${cur}"]`).forEach(el => {
    el.classList.add('active');
    el.setAttribute('aria-current', 'true');
  });
}

function renderBody() {
  if (!target) return;
  const cur = currentHex();
  const role = LAYER_ROLES[target.layerId];
  const curated = curatedForLayer(target.layerId, 60).filter(matches).slice(0, CURATED_ROWS * PER_ROW);
  const rest = ALL.filter(matches);

  const curatedBlock = curated.length ? `
    <div class="cl-sec">
      <div class="cl-sec-head">
        <span class="cl-sec-title">Curated for ${esc(role ? role.label : target.label)}</span>
        <span class="cl-sec-count">${curated.length}</span>
      </div>
      ${role ? `<div class="cl-sec-note">${esc(role.rule)}</div>` : ''}
      <div class="chips">${curated.map(c => swatch(c, cur)).join('')}</div>
    </div>` : '';

  const restBlock = rest.length ? `
    <div class="cl-sec">
      <div class="cl-sec-head">
        <span class="cl-sec-title">${anyFilter() ? 'Matching colors' : 'All colors'}</span>
        <span class="cl-sec-count">${rest.length.toLocaleString()}</span>
      </div>
      <div class="chips">${rest.map(c => swatch(c, cur)).join('')}</div>
    </div>`
    : `<div class="cl-empty">No colors match. Try clearing a filter, or search “fog”, “clay”, “sage”…</div>`;

  $('cl-body').innerHTML = curatedBlock + restBlock;
  syncRovingTabstop();
  renderContrast(cur);
  announce(rest.length
    ? `${rest.length.toLocaleString()} colors match`
    : 'No colors match the current filters');
}

// a single polite live region — the grid itself is far too large to
// announce, but its size and the empty state are what a screen reader
// user needs to know after changing a filter
function announce(msg) {
  const el = $('cl-status');
  if (el) el.textContent = msg;
}

// Live accessibility readout. A fill is judged against the surface it
// sits on; a pattern ink or border is judged against its own layer's
// fill, which is what it actually has to survive against.
function renderContrast(cur) {
  const box = $('cl-contrast');
  if (!target) { box.innerHTML = ''; return; }
  const ownFill = S.colors[target.layerId];
  const isFill = target.slot === 'fill';
  const against = isFill
    ? (target.layerId === 'land' ? S.colors.water : S.colors.land)
    : ownFill;
  const label = isFill
    ? (target.layerId === 'land' ? 'water' : 'land')
    : `the ${(LAYER_ROLES[target.layerId] || {}).label?.toLowerCase() || 'layer'} fill`;
  if (!against) { box.innerHTML = ''; return; }
  const r = contrastRatio(cur, against);
  const weak = r < FILL_SEPARATION_MIN;
  box.innerHTML = `<span class="cl-contrast-dot ${weak ? 'weak' : 'ok'}"></span>
    <span><b>${r.toFixed(2)}:1</b> against ${label}</span>
    ${weak ? `<span class="cl-contrast-tip">Separated by hue alone — add a pattern so it survives
      grayscale and color blindness.</span>` : ''}`;
}

export function init() {
  $('cl-close').addEventListener('click', closeLibrary);

  // search — debounced, since a keystroke can re-render 2,310 nodes.
  // The timer lives at module scope so close/reset can cancel it; without
  // that, hitting Escape mid-type fires the callback against a null target.
  $('cl-search').addEventListener('input', e => {
    const v = e.target.value;
    $('cl-clear').hidden = !v;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (!target) return;
      filters.q = v.trim().toLowerCase();
      renderBody();
    }, 110);
  });
  $('cl-clear').addEventListener('click', () => {
    clearTimeout(searchTimer);
    $('cl-search').value = ''; $('cl-clear').hidden = true;
    filters.q = ''; renderBody(); $('cl-search').focus();
  });

  // These rows are 12 and 4 buttons. Flip their state in place rather
  // than re-emitting markup — an innerHTML rebuild destroys the very
  // button the user just activated and drops focus to <body>.
  $('cl-hues').addEventListener('click', e => {
    const b = e.target.closest('[data-hue]'); if (!b) return;
    const id = b.dataset.hue;
    if (!id) filters.hues.clear();
    else if (filters.hues.has(id)) filters.hues.delete(id);
    else filters.hues.add(id);
    syncHues();
    syncBandAvailability();
    renderBody();
  });

  ['cl-tone', 'cl-value'].forEach(id => {
    $(id).addEventListener('click', e => {
      const b = e.target.closest('[data-band]'); if (!b) return;
      const axis = e.currentTarget.dataset.axis;
      filters[axis] = b.dataset.band || null;
      syncBand(e.currentTarget, filters[axis]);
      syncBandAvailability();
      renderBody();
    });
  });

  $('cl-body').addEventListener('keydown', e => {
    const b = e.target.closest('.chip-swatch'); if (!b) return;
    if (moveFocus(b, e.key)) e.preventDefault();
  });

  $('cl-body').addEventListener('click', e => {
    const b = e.target.closest('[data-hex]'); if (!b || !target) return;
    target.set(b.dataset.hex);
    renderHead();
    // repaint only the selection ring — re-rendering 2,310 nodes on every
    // click would throw away scroll position and feel like a page reload
    const cur = b.dataset.hex.toLowerCase();
    setRing(cur);
    renderContrast(cur);
    announce(`${b.getAttribute('aria-label')} selected`);
  });

  bus.on('color:changed', () => { if (isOpen()) renderHead(); });
  // a modal opening above the map takes the flyout with it
  bus.on('ui:dismiss-transient', () => { if (isOpen()) closeLibrary(); });
  bus.on('place:panel-opened',  () => { if (isOpen()) closeLibrary(); });
  bus.on('state:replaced', closeLibrary);
  bus.on('ui:escape', ctx => { if (!ctx.handled && isOpen()) { closeLibrary(); ctx.handled = true; } },
    { priority: ESC.FLYOUT });
}
