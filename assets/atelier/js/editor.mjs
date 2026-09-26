import {
  BASEMAP_LABEL, DEFAULT_CENTER, DEFAULT_ZOOM, DRAFT_KEY, GEOCODER,
} from './config.mjs';
import { inkOn } from './color.mjs';
import { PALETTES, paletteByName } from './palettes.mjs';
import { surfaceList } from './surfaces.mjs';
import { applyGeocodedName, placeLabel } from './names.mjs';
import { embedSnippet, guestURL } from './codec.mjs';
import { reversePlace, searchPlaces } from './geocode.mjs';
import { createMap, frameOn, paintPalette, readCamera, syncMarkers, watchSize, whenStyle } from './map-view.mjs';

const $ = (id) => document.getElementById(id);

let state;
let map;
let selectedId = null;
let nextId = 1;
let saveTimer = 0;
let searchTimer = 0;
let searchSeq = 0;
let clickTimer = 0;
let searchItems = [];

function blankState() {
  const pal = PALETTES[0];
  return {
    title: '',
    desc: '',
    paletteName: pal.name,
    colors: { ...pal.colors },
    ink: pal.ink,
    places: [],
    camera: { center: DEFAULT_CENTER.slice(), zoom: DEFAULT_ZOOM },
  };
}

function loadDraft() {
  try {
    const raw = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (!raw || !raw.colors || !raw.colors.land) return null;
    raw.places = Array.isArray(raw.places) ? raw.places : [];
    return raw;
  } catch (e) {
    return null;
  }
}

function syncIds() {
  nextId = state.places.reduce((max, place) => Math.max(max, place.id || 0), 0) + 1;
}

function saveNow() {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); }
  catch (e) { /* private mode */ }
  const dot = $('save-dot');
  if (!dot) return;
  dot.hidden = false;
  clearTimeout(saveNow._hide);
  saveNow._hide = setTimeout(() => { dot.hidden = true; }, 1600);
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 280);
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('is-on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('is-on'), 2400);
}

function currentPalette() {
  return paletteByName(state.paletteName);
}

function motion(ms) {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
}

function flyTo(lng, lat) {
  frameOn(map, lng, lat, Math.max(map.getZoom(), 14), motion(700));
}

function refreshMap() {
  syncMarkers(map, state.places, {
    selectedId,
    ink: state.ink,
    onSelect: (id) => selectPlace(id, { fly: true }),
  });
}

function renderSurfaces() {
  const list = $('surface-list');
  list.replaceChildren();
  surfaceList().forEach((surface) => {
    const row = document.createElement('li');
    row.className = 'surface';
    const swatch = document.createElement('span');
    swatch.className = 'swatch swatch--sm';
    swatch.style.setProperty('--swatch-color', state.colors[surface.id] || '#ccc');
    const label = document.createElement('span');
    label.textContent = surface.label;
    row.append(swatch, label);
    list.append(row);
  });
}

function renderPalettes() {
  const list = $('palette-list');
  list.replaceChildren();
  PALETTES.forEach((pal) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'palette';
    btn.setAttribute('aria-pressed', String(pal.name === state.paletteName));
    const chips = document.createElement('span');
    chips.className = 'palette__chips';
    ['land', 'water', 'park', 'building'].forEach((key) => {
      const chip = document.createElement('i');
      chip.style.background = pal.colors[key];
      chips.append(chip);
    });
    const name = document.createElement('span');
    name.className = 'palette__name';
    name.textContent = pal.name;
    const mood = document.createElement('span');
    mood.className = 'palette__mood';
    mood.textContent = pal.mood;
    btn.append(chips, name, mood);
    btn.addEventListener('click', () => applyPalette(pal.name));
    list.append(btn);
  });
}

function renderPlaces() {
  const list = $('places-list');
  const count = $('place-count');
  count.textContent = state.places.length ? String(state.places.length) : '';
  $('add-hint').hidden = state.places.length > 0;
  list.replaceChildren();
  state.places.forEach((place, index) => {
    const card = document.createElement('article');
    card.className = 'place-card' + (place.id === selectedId ? ' place-card--open' : '');

    const row = document.createElement('div');
    row.className = 'list-row' + (place.id === selectedId ? ' list-row--active' : '');

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'place-card__open';
    const num = document.createElement('span');
    num.className = 'place-num';
    num.style.background = state.ink;
    num.style.color = inkOn(state.ink);
    num.textContent = String(index + 1);
    const label = document.createElement('span');
    label.className = 'list-row__label';
    label.dataset.labelFor = String(place.id);
    label.textContent = placeLabel(place);
    open.append(num, label);
    open.addEventListener('click', () => selectPlace(place.id, { fly: true }));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon-btn';
    remove.setAttribute('aria-label', 'Remove ' + placeLabel(place));
    remove.textContent = '×';
    remove.addEventListener('click', () => deletePlace(place.id));

    row.append(open, remove);

    const body = document.createElement('div');
    body.className = 'place-card__body';
    body.hidden = place.id !== selectedId;

    const nameField = document.createElement('label');
    nameField.className = 'field';
    const nameLabel = document.createElement('span');
    nameLabel.className = 'field__label';
    nameLabel.textContent = 'Name';
    const nameInput = document.createElement('input');
    nameInput.className = 'input';
    nameInput.value = place.name || '';
    nameInput.placeholder = place.pendingName ? 'Locating…' : 'Place name';
    nameInput.setAttribute('aria-label', 'Place name');
    nameInput.addEventListener('input', () => {
      place.name = nameInput.value;
      place.pendingName = false;
      label.textContent = placeLabel(place);
      refreshMap();
      save();
    });
    nameField.append(nameLabel, nameInput);

    const noteField = document.createElement('label');
    noteField.className = 'field';
    const noteLabel = document.createElement('span');
    noteLabel.className = 'field__label';
    noteLabel.textContent = 'Note';
    const noteInput = document.createElement('textarea');
    noteInput.className = 'textarea';
    noteInput.rows = 3;
    noteInput.placeholder = 'Why this place is on the map';
    noteInput.value = place.note || '';
    noteInput.setAttribute('aria-label', 'Place note');
    noteInput.addEventListener('input', () => {
      place.note = noteInput.value;
      save();
    });
    noteField.append(noteLabel, noteInput);
    body.append(nameField, noteField);
    card.append(row, body);
    list.append(card);
  });
}

function renderIdentity() {
  const title = $('map-title');
  const desc = $('map-desc');
  if (document.activeElement !== title) title.value = state.title || '';
  if (document.activeElement !== desc) desc.value = state.desc || '';
  document.title = (state.title || 'Untitled map') + ' — Map atelier';
}

function render() {
  renderIdentity();
  renderPlaces();
  renderPalettes();
  renderSurfaces();
  refreshMap();
}

function selectPlace(id, { fly = false } = {}) {
  selectedId = id;
  const place = state.places.find((p) => p.id === id);
  renderPlaces();
  refreshMap();
  if (place && fly) flyTo(place.lng, place.lat);
  showPane('places');
}

function deletePlace(id) {
  state.places = state.places.filter((p) => p.id !== id);
  if (selectedId === id) selectedId = null;
  renderPlaces();
  refreshMap();
  save();
}

function addPlace(data, { select = true, fly = false } = {}) {
  const place = {
    id: nextId++,
    name: data.name || '',
    note: data.note || '',
    lng: data.lng,
    lat: data.lat,
    pendingName: !!data.pendingName,
  };
  state.places.push(place);
  if (select) selectedId = place.id;
  renderPlaces();
  refreshMap();
  save();
  if (fly) flyTo(place.lng, place.lat);
  return place;
}

function applyPalette(name) {
  const pal = paletteByName(name);
  state.paletteName = pal.name;
  state.colors = { ...pal.colors };
  state.ink = pal.ink;
  paintPalette(map, state.colors);
  renderPalettes();
  renderSurfaces();
  renderPlaces();
  refreshMap();
  save();
}

function showPane(name) {
  const places = name === 'places';
  $('pane-places').hidden = !places;
  $('pane-design').hidden = places;
  $('tab-places').setAttribute('aria-selected', String(places));
  $('tab-design').setAttribute('aria-selected', String(!places));
}

function setSearchMessage(text) {
  const el = $('geo-results');
  el.hidden = !text;
  el.replaceChildren();
  if (!text) return;
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  el.append(p);
}

function renderSearch(items) {
  searchItems = items;
  const el = $('geo-results');
  el.replaceChildren();
  if (!items.length) {
    el.hidden = false;
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'Nothing found. Try a town or landmark, or click the map.';
    el.append(p);
    return;
  }
  el.hidden = false;
  items.forEach((item, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gs-result';
    const name = document.createElement('span');
    name.className = 'gs-result__name';
    name.textContent = item.name;
    const context = document.createElement('span');
    context.className = 'gs-result__context';
    context.textContent = item.context;
    btn.append(name, context);
    btn.addEventListener('click', () => addFromSearch(index));
    el.append(btn);
  });
}

function addFromSearch(index) {
  const item = searchItems[index];
  if (!item) return;
  addPlace({ name: item.name, lng: item.lng, lat: item.lat, pendingName: false }, { fly: true });
  $('geo-input').value = '';
  $('geo-results').hidden = true;
  $('geo-results').replaceChildren();
  searchItems = [];
  $('map-status').textContent = 'Added ' + item.name;
}

async function runSearch(query) {
  const seq = ++searchSeq;
  setSearchMessage('Searching…');
  let center = null;
  try { center = map.getCenter(); } catch (e) { center = null; }
  try {
    const items = await searchPlaces(query, center ? { lng: center.lng, lat: center.lat } : null);
    if (seq !== searchSeq) return;
    renderSearch(items);
  } catch (e) {
    if (seq !== searchSeq) return;
    setSearchMessage('Search is unavailable. You can still click the map to add a place.');
  }
}

async function nameFromClick(place) {
  try {
    const hit = await reversePlace(place.lng, place.lat);
    if (!applyGeocodedName(place, hit && hit.name)) return;
  } catch (e) {
    if (!applyGeocodedName(place, '')) return;
  }
  const label = document.querySelector('[data-label-for="' + place.id + '"]');
  if (label) label.textContent = placeLabel(place);
  const card = label && label.closest('.place-card');
  const input = card && card.querySelector('input.input');
  if (input && document.activeElement !== input) input.value = place.name;
  refreshMap();
  save();
  $('map-status').textContent = placeLabel(place) + ' added';
}

function onMapClick(event) {
  const place = addPlace({
    lng: event.lngLat.lng,
    lat: event.lngLat.lat,
    pendingName: true,
  });
  $('map-status').textContent = 'Looking up a name for the new place';
  nameFromClick(place);
}

function openShare() {
  state.camera = readCamera(map);
  saveNow();
  const origin = location.origin;
  $('share-link').value = guestURL(state, origin);
  $('share-embed').value = embedSnippet(state, origin);
  const pal = currentPalette();
  $('share-summary').textContent = state.places.length + ' place' + (state.places.length === 1 ? '' : 's')
    + ' · ' + pal.name + ' · ' + BASEMAP_LABEL;
  const dialog = $('share-dialog');
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.hidden = false;
  $('share-copy').focus();
}

function copyText(value, button, doneLabel) {
  const finish = () => {
    const previous = button.textContent;
    button.textContent = doneLabel;
    setTimeout(() => { button.textContent = previous; }, 1600);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(value).then(finish).catch(() => {
      window.prompt('Copy this:', value);
    });
    return;
  }
  window.prompt('Copy this:', value);
}

function wire() {
  $('map-title').addEventListener('input', (event) => {
    state.title = event.target.value;
    document.title = (state.title || 'Untitled map') + ' — Map atelier';
    save();
  });
  $('map-desc').addEventListener('input', (event) => {
    state.desc = event.target.value;
    save();
  });
  $('tab-places').addEventListener('click', () => showPane('places'));
  $('tab-design').addEventListener('click', () => showPane('design'));
  $('btn-new').addEventListener('click', () => {
    const dirty = state.places.length || state.title || state.desc;
    if (dirty && !window.confirm('Start a blank map? This replaces the map saved in this browser.')) return;
    state = blankState();
    selectedId = null;
    syncIds();
    map.jumpTo({ center: state.camera.center, zoom: state.camera.zoom });
    paintPalette(map, state.colors);
    render();
    saveNow();
  });
  $('btn-share').addEventListener('click', openShare);
  $('share-close').addEventListener('click', () => $('share-dialog').close());
  $('share-copy').addEventListener('click', () => copyText($('share-link').value, $('share-copy'), 'Copied'));
  $('share-copy-embed').addEventListener('click', () => copyText($('share-embed').value, $('share-copy-embed'), 'Copied'));
  $('share-open').addEventListener('click', () => {
    window.open($('share-link').value, '_blank', 'noopener');
  });

  const input = $('geo-input');
  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(searchTimer);
    searchSeq++;
    if (q.length < 2) {
      $('geo-results').hidden = true;
      $('geo-results').replaceChildren();
      return;
    }
    searchTimer = setTimeout(() => runSearch(q), 420);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && searchItems[0]) {
      event.preventDefault();
      addFromSearch(0);
    }
  });

  map.on('click', (event) => {
    const target = event.originalEvent && event.originalEvent.target;
    if (target && target.closest && target.closest('.pin, .maplibregl-popup, .maplibregl-ctrl')) return;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => onMapClick(event), 260);
  });
  map.on('dblclick', () => clearTimeout(clickTimer));
  map.on('moveend', () => {
    state.camera = readCamera(map);
    save();
  });

  window.addEventListener('pagehide', saveNow);
}

function resumePendingNames() {
  state.places.forEach((place) => {
    if (place.pendingName) nameFromClick(place);
  });
}

async function boot() {
  state = loadDraft() || blankState();
  syncIds();
  $('basemap-note').textContent = BASEMAP_LABEL + ' · ' + GEOCODER.label;
  map = createMap($('map'), state.camera);
  watchSize(map, $('map'));
  wire();
  render();
  try {
    await whenStyle(map);
    paintPalette(map, state.colors);
    refreshMap();
    resumePendingNames();
    $('map-fallback').hidden = true;
  } catch (e) {
    $('map-fallback').hidden = false;
  }
  map.on('error', (event) => {
    if (map.isStyleLoaded()) return;
    const message = event && event.error && event.error.message;
    if (!message) return;
    $('map-fallback').hidden = false;
    $('map-fallback').textContent = 'The basemap did not load. ' + message;
  });
}

boot();
