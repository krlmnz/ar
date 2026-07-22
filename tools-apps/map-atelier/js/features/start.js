// ═══════════════════════════════════════════════════════════════
// NEW MAP — creating a fresh project (blank or the example). Every
// creation makes a real project in the projects store, so it shows
// up on the home page immediately. There's no start-card picker any
// more: the header "New" button drops straight into a blank map, and
// a brand-new visitor is dropped straight into the example map.
// ═══════════════════════════════════════════════════════════════
import { session, setState, defaultState, exampleState, persist, flushPersist } from '../store/state.js';
import { createProject } from '../store/projects.js';
import { EDITOR_PAGE } from '../config.js';
import { $ } from '../core/dom.js';
import { bus } from '../core/bus.js';
import { toast } from './toast.js';

// Register the doc as a project and point the URL (and future
// persists) at it — without reloading the page.
function beginProject(doc) {
  // write the outgoing doc before the incoming one takes its place
  flushPersist();
  const id = createProject(doc);
  session.projectId = id;
  history.replaceState(null, '', `${EDITOR_PAGE}?id=${id}`);
  setState(doc);
}

export function startExample() {
  beginProject(exampleState());
  persist();
  toast('Example loaded — Camila & Tomás’s story 💍');
}

export function startBlank() {
  beginProject(defaultState());
  bus.emit('pane:switch', 'places');
  persist();
  toast('Your map is ready — add your first place ✨');
  // land the caret in the place search — it is the first thing to do
  requestAnimationFrame(() => document.getElementById('geo-input')?.focus());
}

// ── wiring ─────────────────────────────────────────────────────
export function init() {
  $('btn-new').addEventListener('click', startBlank);
}
