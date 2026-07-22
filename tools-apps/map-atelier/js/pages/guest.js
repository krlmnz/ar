// ═══════════════════════════════════════════════════════════════
// GUEST PAGE — a published map, decoded entirely from the URL.
//
//   guest.html#v=…       → the shared map, read-only
//
// This page never touches the projects store, so it works for a
// visitor who has never opened the atelier.
// ═══════════════════════════════════════════════════════════════
import { boot } from '../views/app.js';
import { session, setState } from '../store/state.js';
import { decodeShare } from '../store/share-codec.js';
import { EDITOR_PAGE } from '../config.js';

// Read-only before anything initializes — this page must never write to the
// visitor's own projects store.
session.mode = 'guest';
session.projectId = null;

const { mapFeature } = await boot();

(function route() {
  const hash = location.hash || '';
  if (!hash.startsWith('#v=')) { location.replace(`${EDITOR_PAGE}?new=1`); return; }

  requestAnimationFrame(() => mapFeature.map.resize());
  try {
    setState(decodeShare(hash.slice(3)));
  } catch (e) {
    console.warn('bad share payload', e);
    location.replace(`${EDITOR_PAGE}?new=1`);
  }
})();
