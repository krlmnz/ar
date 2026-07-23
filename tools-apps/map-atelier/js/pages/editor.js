// ═══════════════════════════════════════════════════════════════
// EDITOR PAGE — routing only. The feature manifest lives in
// js/views/app.js, shared with preview.html and guest.html.
//
//   editor.html?id=…     → open an existing project
//   editor.html?new=1    → a fresh blank map
//   editor.html          → your most recent map, or the example
// ═══════════════════════════════════════════════════════════════
import { boot } from '../views/app.js';
import { session, setState } from '../store/state.js';
import { getProject, listProjects, migrateLegacyDraft } from '../store/projects.js';
import * as start from '../features/start.js';
import { EDITOR_PAGE } from '../config.js';

await boot({ editor: true });

// fold a pre-multi-map draft into the projects store, if one exists
migrateLegacyDraft();

// ── routing ────────────────────────────────────────────────────
(function route() {
  const params = new URLSearchParams(location.search);

  // an explicit "new map" request always gets a blank map
  if (params.get('new')) { start.startBlank(); return; }

  const id = params.get('id');
  if (id) {
    const doc = getProject(id);
    if (doc) { session.projectId = id; setState(doc.state); return; }
    // a stale link — fall through to the most-recent map rather than
    // stranding someone on a blank screen
  }

  // No context. There is no gallery any more, so the front door is the
  // map you were last working on; a first-time visitor gets the example.
  const recent = listProjects()[0];
  if (recent) {
    session.projectId = recent.id;
    history.replaceState(null, '', `${EDITOR_PAGE}?id=${recent.id}`);
    setState(recent.state);
    return;
  }
  start.startExample();
})();
