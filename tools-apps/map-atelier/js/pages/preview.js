// ═══════════════════════════════════════════════════════════════
// PREVIEW PAGE — your own draft, wearing the guest face.
//
//   preview.html?id=…    → preview that project
//
// It reads the same projects store the editor writes, so what you
// see is your unpublished draft — no share payload involved. The
// only chrome is the way back.
// ═══════════════════════════════════════════════════════════════
import { boot } from '../views/app.js';
import { session, setState } from '../store/state.js';
import { getProject, listProjects } from '../store/projects.js';
import { EDITOR_PAGE } from '../config.js';

// Read-only before anything initializes, so no feature can persist over the
// draft during boot.
session.mode = 'guest';
session.projectId = null;

const { mapFeature } = await boot();

(function route() {
  const id = new URLSearchParams(location.search).get('id');
  const doc = (id && getProject(id)) || listProjects()[0];
  if (!doc) { location.replace(EDITOR_PAGE); return; }

  requestAnimationFrame(() => mapFeature.map.resize());
  setState(doc.state);

  document.getElementById('preview-exit')
    .addEventListener('click', () => { location.href = `${EDITOR_PAGE}?id=${doc.id}`; });
})();
