// ═══════════════════════════════════════════════════════════════
// EDITOR CHROME — the tool strip, the panes it switches between,
// the story fields, the save dot, and global keyboard handling.
//
// The strip is a Photoshop-style tool rail rather than a wizard:
// story, places and map are three modes you move between freely,
// not three steps you complete in order. One pane is on screen at
// a time and every pane starts at the top of the rail, so nothing
// is permanently pinned above the thing you came here to edit.
//
// Preview and guest pages load this module too — they have no rail,
// so init() wires only what exists.
// ═══════════════════════════════════════════════════════════════
import { S, persist } from '../store/state.js';
import { uiIcon } from '../data/ui-icons.js';
import { $ } from '../core/dom.js';
import { bus } from '../core/bus.js';

const DEFAULT_PANE = 'places';

export function switchPane(name) {
  if (!document.getElementById('pane-' + name)) return;
  document.querySelectorAll('.rail-pane')
    .forEach(p => p.classList.toggle('active', p.id === 'pane-' + name));
  document.querySelectorAll('.tool-btn').forEach(b => {
    const on = b.dataset.pane === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
  // a pane switch is a fresh start — don't inherit the last pane's scroll
  const body = document.querySelector('.rail-body');
  if (body) body.scrollTop = 0;
}

function activePane() {
  return document.querySelector('.rail-pane.active')?.id.replace('pane-', '') || DEFAULT_PANE;
}

function hydrate() {
  const t = $('story-title'), d = $('story-desc');
  if (t) t.value = S.title;
  if (d) d.value = S.desc;
}

// ── wiring ─────────────────────────────────────────────────────
export function init() {
  const nav = document.getElementById('tool-nav');

  // guest and preview have no rail at all — everything below is editor chrome
  if (!nav) {
    bus.on('state:replaced', hydrate);
    return;
  }

  // The glyph is prepended to the label the markup already carries, so the
  // icon set stays in one module instead of inline across the page.
  nav.querySelectorAll('.tool-btn').forEach(b => {
    b.insertAdjacentHTML('afterbegin', uiIcon(b.dataset.pane, 20));
    b.addEventListener('click', () => switchPane(b.dataset.pane));
  });

  $('story-title').addEventListener('input', e => { S.title = e.target.value; persist(); });
  $('story-desc').addEventListener('input', e => { S.desc = e.target.value; persist(); });

  // save dot
  let saveDotTimer;
  bus.on('state:saved', () => {
    const dot = $('save-dot');
    dot.classList.add('on');
    clearTimeout(saveDotTimer);
    saveDotTimer = setTimeout(() => dot.classList.remove('on'), 1500);
  });

  document.addEventListener('keydown', e => {
    // one press, one layer: the first listener to act claims the event
    if (e.key === 'Escape') bus.emit('ui:escape', { handled: false });
  });

  bus.on('pane:switch', switchPane);
  bus.on('state:replaced', hydrate);

  // the color library is a flyout off the map pane — if something opens it
  // from elsewhere, bring the pane it belongs to along
  bus.on('library:opened', () => { if (activePane() !== 'map') switchPane('map'); });

  switchPane(DEFAULT_PANE);
}
