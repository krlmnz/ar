// ═══════════════════════════════════════════════════════════════
// PROJECTS STORE — multi-map persistence over localStorage.
// One doc per map (`hv:project:<id>`) plus an id index
// (`hv:projects`). This is the only file that knows how maps are
// stored — swap in a real backend by reimplementing these seven
// functions.
//
// Doc shape: { id, createdAt, updatedAt, state }
// `state` is the editor state doc (see store/state.js).
// ═══════════════════════════════════════════════════════════════
const INDEX_KEY = 'hv:projects';
const DOC_PREFIX = 'hv:project:';
const LEGACY_DRAFT_KEY = 'hv-map-atelier-draft';

function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('storage write failed', e); }
}
function readIndex() {
  const ids = readJSON(INDEX_KEY);
  return Array.isArray(ids) ? ids : [];
}
function newId() {
  return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function listProjects() {
  return readIndex()
    .map(id => getProject(id))
    .filter(Boolean)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getProject(id) {
  const doc = readJSON(DOC_PREFIX + id);
  return doc && doc.state ? doc : null;
}

export function createProject(state) {
  const id = newId();
  const now = Date.now();
  writeJSON(DOC_PREFIX + id, { id, createdAt: now, updatedAt: now, state });
  writeJSON(INDEX_KEY, [...readIndex(), id]);
  return id;
}

export function saveProject(id, state) {
  const doc = getProject(id);
  if (!doc) return;
  writeJSON(DOC_PREFIX + id, { ...doc, updatedAt: Date.now(), state });
}

export function duplicateProject(id) {
  const doc = getProject(id);
  if (!doc) return null;
  const copy = JSON.parse(JSON.stringify(doc.state));
  copy.title = copy.title ? `${copy.title} (copy)` : 'Untitled map (copy)';
  return createProject(copy);
}

export function deleteProject(id) {
  localStorage.removeItem(DOC_PREFIX + id);
  writeJSON(INDEX_KEY, readIndex().filter(x => x !== id));
}

// One-time upgrade: the single-file atelier kept exactly one draft under
// LEGACY_DRAFT_KEY. Fold it into the projects store so nothing is lost.
export function migrateLegacyDraft() {
  const draft = readJSON(LEGACY_DRAFT_KEY);
  if (!draft || !draft.colors) return null;
  const id = createProject(draft);
  localStorage.removeItem(LEGACY_DRAFT_KEY);
  return id;
}
