import { BASEMAP_LABEL, DEFAULT_CENTER, DEFAULT_ZOOM } from './config.mjs';
import { inkOn } from './color.mjs';
import { decodeShare } from './codec.mjs';
import { placeLabel } from './names.mjs';
import { createMap, frameOn, paintPalette, syncMarkers, watchSize, whenStyle } from './map-view.mjs';

const $ = (id) => document.getElementById(id);

function motion(ms) {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
}

function showEmpty(message) {
  $('guest-title').textContent = 'No map in this link';
  $('guest-desc').textContent = message;
  $('guest-meta').textContent = '';
  $('guest-places').replaceChildren();
}

function render(state) {
  document.title = (state.title || 'Untitled map') + ' — Map atelier';
  $('guest-title').textContent = state.title || 'Untitled map';
  $('guest-desc').textContent = state.desc || '';
  $('guest-desc').hidden = !state.desc;
  $('guest-meta').textContent = state.places.length + ' place' + (state.places.length === 1 ? '' : 's')
    + ' · ' + state.paletteName;
  const list = $('guest-places');
  list.replaceChildren();
  state.places.forEach((place, index) => {
    const item = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'list-row guest-place';
    const num = document.createElement('span');
    num.className = 'place-num';
    num.style.background = state.ink;
    num.style.color = inkOn(state.ink);
    num.textContent = String(index + 1);
    const text = document.createElement('span');
    text.className = 'guest-place__text';
    const name = document.createElement('span');
    name.className = 'list-row__label';
    name.textContent = placeLabel(place);
    text.append(name);
    if (place.note) {
      const note = document.createElement('span');
      note.className = 'guest-place__note';
      note.textContent = place.note;
      text.append(note);
    }
    btn.append(num, text);
    btn.addEventListener('click', () => focusPlace(state, place));
    item.append(btn);
    list.append(item);
  });
}

let map;
let popup;

function focusPlace(state, place) {
  frameOn(map, place.lng, place.lat, Math.max(map.getZoom(), 14), motion(700));
  if (popup) popup.remove();
  const root = document.createElement('div');
  root.className = 'popup';
  const name = document.createElement('strong');
  name.textContent = placeLabel(place);
  root.append(name);
  if (place.note) {
    const note = document.createElement('p');
    note.textContent = place.note;
    root.append(note);
  }
  popup = new maplibregl.Popup({ offset: 18, maxWidth: '260px', focusAfterOpen: false })
    .setLngLat([place.lng, place.lat])
    .setDOMContent(root)
    .addTo(map);
}

async function boot() {
  const hash = (location.hash || '').replace(/^#/, '');
  let state = null;
  if (hash.startsWith('v=')) {
    try { state = decodeShare(hash.slice(2)); }
    catch (e) { state = null; }
  }

  const framed = window.self !== window.top;
  const camera = (state && state.camera) || { center: DEFAULT_CENTER.slice(), zoom: DEFAULT_ZOOM };
  map = createMap($('map'), camera, { cooperative: framed });
  watchSize(map, $('map'));

  if (!state) showEmpty('Open Map atelier, add places, and share a link.');
  else render(state);

  $('guest-credit').textContent = BASEMAP_LABEL;

  try {
    await whenStyle(map);
    if (state) {
      paintPalette(map, state.colors);
      syncMarkers(map, state.places, {
        selectedId: null,
        ink: state.ink,
        onSelect: (id) => {
          const place = state.places.find((p) => p.id === id);
          if (place) focusPlace(state, place);
        },
      });
    }
    $('map-fallback').hidden = true;
  } catch (e) {
    $('map-fallback').hidden = false;
  }
}

boot();
