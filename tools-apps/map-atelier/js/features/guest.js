// ═══════════════════════════════════════════════════════════════
// GUEST MODE — the published, read-only face of a map: the hero
// card, the explore list, and the "made with" badge.
// Also rendered when the editor toggles Preview.
// ═══════════════════════════════════════════════════════════════
import { map } from './map.js';
import { openStoryPopup, pinColor } from './markers.js';
import { S, session } from '../store/state.js';
import { iconSVG } from '../data/icons.js';
import { $, esc } from '../core/dom.js';
import { bus } from '../core/bus.js';

export function renderGuestHero() {
  $('gh-title').textContent = S.title || '';
  $('gh-desc').textContent = S.desc || '';
  $('gh-meta-places').textContent = `${S.places.length} place${S.places.length !== 1 ? 's' : ''}`;
  $('gh-meta-pal').textContent = `${S.paletteName} · Pantone`;
  // the explore list is open on load — no need to click "Explore" first
  $('guest-list').classList.add('open');
  $('gh-list-toggle').textContent = 'Hide the places';
  $('guest-list').innerHTML = S.places.map(p => `
    <div class="place-row" data-gid="${p.id}">
      <div class="place-row-icon ${p.color === 'none' ? 'no-bg' : ''}" style="background:${pinColor(p)}">${iconSVG(p.icon, 15, 2)}</div>
      <div class="place-row-info">
        <div class="place-row-name">${esc(p.name)}</div>
        <div class="place-row-note">${esc(p.note || '')}</div>
      </div>
    </div>`).join('');
}

// ── wiring ─────────────────────────────────────────────────────
export function init() {
  $('gh-list-toggle').addEventListener('click', () => {
    const open = $('guest-list').classList.toggle('open');
    $('gh-list-toggle').textContent = open ? 'Hide the places' : 'Explore the places';
  });
  $('guest-list').addEventListener('click', e => {
    const row = e.target.closest('[data-gid]');
    if (!row) return;
    const p = S.places.find(x => x.id == row.dataset.gid);
    if (!p) return;
    map.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 13.5), duration: 1000 });
    setTimeout(() => openStoryPopup(p.id), 1050);
  });

  bus.on('state:replaced', () => {
    if (session.mode === 'guest' || document.body.classList.contains('preview')) renderGuestHero();
  });
}
