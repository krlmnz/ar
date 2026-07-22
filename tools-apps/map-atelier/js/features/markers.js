// ═══════════════════════════════════════════════════════════════
// MARKERS — the pins on the map and the story popup. Clicking a
// pin either opens the guest story popup (guest/preview) or asks
// the places feature to open its editor panel (`place:select`).
// ═══════════════════════════════════════════════════════════════
import { map } from './map.js';
import { S, session, persist } from '../store/state.js';
import { iconSVG } from '../data/icons.js';
import { esc } from '../core/dom.js';
import { bus } from '../core/bus.js';

export const markers = {}; // placeId -> mapboxgl.Marker

// 'none' = the pin background was removed; the glyph stands alone
export function hasPinBg(place) { return place.color !== 'none'; }
export function pinColor(place) { return place.color === 'none' ? 'transparent' : (place.color || S.accent); }

function makeMarkerEl(place) {
  const el = document.createElement('div');
  el.className = 'hv-marker' + (hasPinBg(place) ? '' : ' no-bg');
  el.dataset.id = place.id;
  const glyphColor = hasPinBg(place) ? '#fff' : 'var(--ink)';
  el.innerHTML = `<div class="hv-pin" style="background:${pinColor(place)}"><span style="color:${glyphColor};display:grid;place-items:center">${iconSVG(place.icon, 16, 2)}</span></div>`;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    if (session.mode === 'guest' || document.body.classList.contains('preview')) openStoryPopup(place.id);
    else bus.emit('place:select', { id: place.id, fly: false });
  });
  return el;
}

export function addMarker(place) {
  const m = new mapboxgl.Marker({
    element: makeMarkerEl(place),
    anchor: 'bottom',
    offset: [0, 4],
    draggable: session.mode === 'editor',
  }).setLngLat([place.lng, place.lat]).addTo(map);
  if (session.mode === 'editor') {
    m.on('dragend', () => {
      const ll = m.getLngLat();
      place.lng = ll.lng; place.lat = ll.lat;
      persist();
    });
  }
  markers[place.id] = m;
}

export function removeMarker(id) {
  if (markers[id]) { markers[id].remove(); delete markers[id]; }
}

export function refreshMarker(place) {
  const m = markers[place.id];
  if (!m) return;
  const el = m.getElement();
  el.classList.toggle('no-bg', !hasPinBg(place));
  const pin = el.querySelector('.hv-pin');
  pin.style.background = pinColor(place);
  const span = pin.querySelector('span');
  span.style.color = hasPinBg(place) ? '#fff' : 'var(--ink)';
  span.innerHTML = iconSVG(place.icon, 16, 2);
}

export function rebuildMarkers() {
  Object.values(markers).forEach(m => m.remove());
  for (const k of Object.keys(markers)) delete markers[k];
  S.places.forEach(addMarker);
  highlightSelected();
}

export function highlightSelected() {
  document.querySelectorAll('.hv-marker').forEach(el => {
    el.classList.toggle('selected', el.dataset.id == session.selectedPlaceId);
  });
}

let storyPopup = null;
export function openStoryPopup(placeId) {
  const p = S.places.find(x => x.id == placeId);
  if (!p) return;
  if (storyPopup) storyPopup.remove();
  storyPopup = new mapboxgl.Popup({ className: 'hv-popup', offset: 34, maxWidth: '300px' })
    .setLngLat([p.lng, p.lat])
    .setHTML(`
      <div class="story-head">
        <div class="story-icon${hasPinBg(p) ? '' : ' no-bg'}" style="background:${pinColor(p)}">${iconSVG(p.icon, 16, 2)}</div>
        <div class="story-name">${esc(p.name)}</div>
      </div>
      ${p.note ? `<div class="story-note">${esc(p.note)}</div>` : ''}
    `)
    .addTo(map);
}

export function init() {
  bus.on('state:replaced', rebuildMarkers);
  bus.on('palette:applied', rebuildMarkers);
}
