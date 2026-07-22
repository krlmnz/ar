// ═══════════════════════════════════════════════════════════════
// PLACES — the story's pins as data + UI: the rail list, the
// place-details panel, and the add-place popover (smart geo-search
// + click-to-drop).
// ═══════════════════════════════════════════════════════════════
import { map } from './map.js';
import { addMarker, removeMarker, refreshMarker, highlightSelected, pinColor } from './markers.js';
import { S, session, persist, currentPalette, nextPlaceId } from '../store/state.js';
import { paletteColorsFor } from '../data/cartography.js';
import { nearestPantoneToHex } from '../data/pantone.js';
import { ICONS, iconSVG } from '../data/icons.js';
import { DEFAULT_CENTER } from '../config.js';
import { ensureHashHex } from '../core/color.js';
import { $, esc } from '../core/dom.js';
import { bus, ESC } from '../core/bus.js';
import { toast } from './toast.js';

const X_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

// ── places list (rail) ─────────────────────────────────────────
export function renderPlacesList() {
  const el = $('places-list');
  const count = $('place-count');
  count.textContent = S.places.length ? `${S.places.length}` : '';
  // The search box is the empty state now — it sits directly above this
  // list, so an extra "no places yet" panel would just push it off-screen.
  // The hint under it carries the click-the-map affordance the old popover
  // used to teach, and retires once the first place lands.
  $('add-hint').hidden = S.places.length > 0;
  if (!S.places.length) { el.innerHTML = ''; return; }
  el.innerHTML = S.places.map(p => `
    <div class="place-row ${p.id == session.selectedPlaceId ? 'active' : ''}" data-id="${p.id}">
      <div class="place-row-icon ${p.color === 'none' ? 'no-bg' : ''}" style="background:${pinColor(p)}">${iconSVG(p.icon, 15, 2)}</div>
      <div class="place-row-info">
        <div class="place-row-name">${esc(p.name)}</div>
        <div class="place-row-note">${esc(p.note || 'Add your story…')}</div>
      </div>
      <button class="place-row-x" data-del="${p.id}" title="Remove" aria-label="Remove ${esc(p.name)}">${X_SVG}</button>
    </div>`).join('');
}

// ── place CRUD ─────────────────────────────────────────────────
export function addPlace(data, { select = true } = {}) {
  const place = {
    id: nextPlaceId(),
    name: data.name || 'A special place',
    note: data.note || '',
    lng: data.lng, lat: data.lat,
    icon: data.icon || 'heart',
    color: data.color || '',
  };
  S.places.push(place);
  addMarker(place);
  renderPlacesList();
  persist();
  bus.emit('places:changed');
  if (select) selectPlace(place.id, { fly: true });
  return place;
}

export function deletePlace(id) {
  const idx = S.places.findIndex(p => p.id === id);
  if (idx < 0) return;
  const [p] = S.places.splice(idx, 1);
  removeMarker(id);
  if (session.selectedPlaceId === id) closePlacePanel();
  renderPlacesList();
  persist();
  bus.emit('places:changed');
  toast(`“${p.name}” removed`);
}

export function selectPlace(id, { fly = false } = {}) {
  session.selectedPlaceId = id;
  const p = S.places.find(x => x.id === id);
  if (!p) return;
  highlightSelected();
  renderPlacesList();
  renderPlacePanel(p);
  $('place-panel').classList.add('open');
  bus.emit('place:panel-opened');
  if (fly) map.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 13.5), duration: 900 });
}

export function closePlacePanel() {
  session.selectedPlaceId = null;
  $('place-panel').classList.remove('open');
  highlightSelected();
  renderPlacesList();
}

// ── place details panel ────────────────────────────────────────
function renderPlacePanel(p) {
  const noBg = p.color === 'none';
  $('pp-pin').classList.toggle('no-bg', noBg);
  $('pp-pin').style.background = noBg ? 'transparent' : pinColor(p);
  $('pp-pin').style.color = noBg ? 'var(--ink)' : '#fff';
  $('pp-pin').innerHTML = iconSVG(p.icon, 19, 2);
  $('pp-name').value = p.name;
  $('pp-note').value = p.note;
  // icons
  $('pp-icons').innerHTML = Object.keys(ICONS).map(ic => `
    <button class="icon-cell ${ic === p.icon ? 'active' : ''}" data-icon="${ic}" title="${ic}">${iconSVG(ic, 16)}</button>`).join('');
  // backgrounds: a "none" chip, then accent + ink + palette colors
  const pal = currentPalette();
  const opts = [S.accent, S.ink, ...Object.values(paletteColorsFor(pal))];
  const uniq = [...new Set(opts.map(c => c.toLowerCase()))];
  const noneChip = `<button class="pin-color pin-none ${noBg ? 'active' : ''}" data-color="none" title="No background" aria-label="No background"></button>`;
  $('pp-colors').innerHTML = noneChip + uniq.map(c => {
    const active = !noBg && (p.color || S.accent).toLowerCase() === c;
    const pn = nearestPantoneToHex(c);
    return `<button class="pin-color ${active ? 'active' : ''}" data-color="${c}" style="background:${c}" title="${pn ? pn.display : c}"></button>`;
  }).join('') + `<input type="color" id="pp-custom-color" value="${ensureHashHex(noBg ? S.accent : (p.color || S.accent))}" title="Custom color" aria-label="Custom pin color" style="width:26px;height:26px;border:none;border-radius:50%;padding:0;background:none;cursor:pointer">`;
  // NB: no listener here — this input is re-created by every render, so a
  // handler bound to it would be destroyed by its own first event. It is
  // delegated from the persistent #pp-colors container in init() instead.
}

function selectedPlace() {
  return S.places.find(x => x.id === session.selectedPlaceId);
}

// ── add-place popover ──────────────────────────────────────────
let geoTimer, geoSeq = 0;
let geoItems = [];

// Add mode is now just "the next map click drops a pin" — there is no
// popover to open. The + button is its toggle and its only indicator,
// alongside the crosshair cursor.
export function setAddMode(on) {
  session.addMode = on;
  const btn = $('btn-add-place');
  btn.classList.toggle('armed', on);
  btn.setAttribute('aria-pressed', String(on));
  map.getCanvas().style.cursor = on ? 'crosshair' : '';
}

function renderGeoResults(items) {
  const rows = items.map((it, i) => `
    <button class="add-result" data-geo="${i}">
      <span class="add-result-icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5c2.5 0 4.5 2 4.5 4.5 0 3-4.5 6.5-4.5 6.5S2.5 9 2.5 6C2.5 3.5 4.5 1.5 7 1.5z" stroke="currentColor" stroke-width="1.2"/><circle cx="7" cy="6" r="1.6" stroke="currentColor" stroke-width="1.2"/></svg></span>
      <span style="min-width:0">
        <div class="add-result-name">${esc(it.name)}</div>
        <div class="add-result-ctx">${esc(it.context)}</div>
      </span>
    </button>`).join('');
  $('add-results').innerHTML = (items.length ? `<div class="add-divider">Search results</div>${rows}` :
    `<div class="add-divider">Search results</div><div class="add-hint" style="margin-top:0">Nothing found — try a broader search, or click the map to drop a pin.</div>`);
  geoItems = items;
}

async function geoSearch(q) {
  const mySeq = ++geoSeq;
  try {
    const url = `https://api.mapbox.com/search/geocode/v6/forward`
      + `?q=${encodeURIComponent(q)}`
      + `&limit=6&proximity=${DEFAULT_CENTER[0]},${DEFAULT_CENTER[1]}`
      + `&types=place,locality,neighborhood,street,address,district`
      + `&access_token=${mapboxgl.accessToken}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('geocode ' + res.status);
    const data = await res.json();
    if (mySeq !== geoSeq) return;
    const items = (data.features || []).map(f => {
      const p = f.properties || {};
      const coords = p.coordinates || {};
      const ctx = p.context || {};
      const parts = [];
      ['place','district','region','country'].forEach(k => {
        if (ctx[k]?.name && ctx[k].name !== p.name) parts.push(ctx[k].name);
      });
      return { name: p.name || 'Unknown', context: parts.slice(0,2).join(', '), lng: coords.longitude, lat: coords.latitude };
    });
    renderGeoResults(items);
  } catch (err) {
    if (mySeq !== geoSeq) return;
    console.warn('geo search failed', err);
    renderGeoResults([]);
  }
}

// click map to drop a pin (add mode only)
async function onMapClick(e) {
  if (session.mode !== 'editor' || !session.addMode) return;
  const { lng, lat } = e.lngLat;
  const place = addPlace({ name: 'New place', lng, lat, icon: 'heart' });
  setAddMode(false);
  // reverse geocode a nicer name
  try {
    const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&types=address,street,neighborhood,place&access_token=${mapboxgl.accessToken}`;
    const res = await fetch(url);
    const data = await res.json();
    const f = (data.features || [])[0];
    if (f?.properties?.name && place.name === 'A special place') {
      place.name = f.properties.name;
      renderPlacesList();
      if (session.selectedPlaceId === place.id) $('pp-name').value = place.name;
      persist();
    }
  } catch (err) { /* keep default name */ }
}

// ── wiring ─────────────────────────────────────────────────────
export function init() {
  // list
  $('places-list').addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) { e.stopPropagation(); deletePlace(+del.dataset.del); return; }
    const row = e.target.closest('.place-row');
    if (row) selectPlace(+row.dataset.id, { fly: true });
  });

  // details panel
  $('pp-icons').addEventListener('click', e => {
    const btn = e.target.closest('[data-icon]');
    const p = selectedPlace();
    if (!btn || !p) return;
    p.icon = btn.dataset.icon;
    refreshMarker(p); renderPlacePanel(p); renderPlacesList(); persist();
  });
  // delegated: #pp-custom-color is replaced on every render of this panel
  $('pp-colors').addEventListener('input', e => {
    if (e.target.id !== 'pp-custom-color') return;
    const p = selectedPlace(); if (!p) return;
    p.color = e.target.value;
    refreshMarker(p); renderPlacesList(); persist();
  });
  $('pp-colors').addEventListener('click', e => {
    const btn = e.target.closest('[data-color]');
    const p = selectedPlace();
    if (!btn || !p) return;
    p.color = btn.dataset.color;
    refreshMarker(p); renderPlacePanel(p); renderPlacesList(); persist();
  });
  $('pp-name').addEventListener('input', e => {
    const p = selectedPlace();
    if (!p) return;
    p.name = e.target.value;
    renderPlacesList(); persist(); bus.emit('places:changed');
  });
  $('pp-note').addEventListener('input', e => {
    const p = selectedPlace();
    if (!p) return;
    p.note = e.target.value;
    renderPlacesList(); persist();
  });
  $('pp-close').addEventListener('click', closePlacePanel);
  $('pp-done').addEventListener('click', () => { closePlacePanel(); toast('Place saved ✓'); });
  $('pp-delete').addEventListener('click', () => {
    if (session.selectedPlaceId != null) deletePlace(session.selectedPlaceId);
  });

  // + arms click-to-drop; the search below it is always available
  $('btn-add-place').addEventListener('click', () => {
    bus.emit('pane:switch', 'places');
    setAddMode(!session.addMode);
  });
  $('geo-input').addEventListener('input', e => {
    const q = e.target.value.trim();
    clearTimeout(geoTimer);
    if (!q) { $('add-results').innerHTML = ''; return; }
    geoTimer = setTimeout(() => geoSearch(q), 280);
  });
  $('add-results').addEventListener('click', e => {
    const geo = e.target.closest('[data-geo]');
    if (geo) {
      const it = geoItems[+geo.dataset.geo];
      if (!it || !isFinite(it.lng)) return;
      const place = addPlace({ name: it.name, lng: it.lng, lat: it.lat, icon: 'heart' }, { select: false });
      setAddMode(false);
      // the query has been spent — clear it so the list below is visible again
      $('geo-input').value = '';
      $('add-results').innerHTML = '';
      map.flyTo({ center: [it.lng, it.lat], zoom: Math.max(map.getZoom(), 13.5), duration: 1000 });
      setTimeout(() => selectPlace(place.id, { fly: false }), 1050);
    }
  });
  map.on('click', onMapClick);

  // bus
  bus.on('ui:dismiss-transient', () => { if (session.selectedPlaceId != null) closePlacePanel(); });
  bus.on('library:opened',       () => { if (session.selectedPlaceId != null) closePlacePanel(); });
  bus.on('place:select', ({ id, fly }) => selectPlace(id, { fly }));
  bus.on('addmode:set', setAddMode);
  bus.on('state:replaced', () => {
    session.selectedPlaceId = null;
    $('place-panel').classList.remove('open');
    renderPlacesList();
  });
  bus.on('palette:applied', () => {
    renderPlacesList();
    const p = selectedPlace();
    if (p) renderPlacePanel(p);
  });
  bus.on('ui:escape', ctx => {
    if (ctx.handled) return;
    // the panel sits above the map like the flyout does; add-mode is under both
    if (session.selectedPlaceId != null) { closePlacePanel(); ctx.handled = true; }
    else if (session.addMode) { setAddMode(false); ctx.handled = true; }
  }, { priority: ESC.FLYOUT });
}
