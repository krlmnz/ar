/* Studio (/editor/). The passcode gate is the cookie. Saves go to /api/studio.
 *
 * The writing surface is TipTap. It serializes back to markdown plus the
 * existing front matter. Images upload through the same function.
 *
 * Deferred, on purpose: map blocks, chart blocks, nested structured sections,
 * duplicate/archive/tag admin, and a full content-directory CMS.
 */
import { mountEditor } from './surface.js';
import {
  splitFrontMatter,
  frontValue,
  quote,
  setField,
  compose,
  kindFromLayout,
  publishedFlag
} from './front-matter.js';

const CODE = '042986';
const COOKIE = 'ar_editor=' + CODE;
const KIND_KEY = 'ar-studio-kind';

function $(id) { return document.getElementById(id); }

function unlocked() {
  return document.cookie.split('; ').indexOf(COOKIE) !== -1;
}

function remember() {
  document.cookie = COOKIE + '; Max-Age=31536000; Path=/; SameSite=Lax';
}

function forget() {
  document.cookie = COOKIE + '; Max-Age=0; Path=/; SameSite=Lax';
}

function notice(message, isError, link) {
  const box = $('notice');
  box.hidden = false;
  box.setAttribute('class', 'studio-notice' + (isError ? ' studio-notice--error' : ''));
  box.innerHTML = '';
  box.appendChild(document.createTextNode(message));
  if (link) {
    box.appendChild(document.createTextNode(' '));
    const a = document.createElement('a');
    a.href = link.url;
    a.textContent = link.label;
    box.appendChild(a);
  }
  box.scrollIntoView({ block: 'nearest' });
}

function clearNotice() { $('notice').hidden = true; }

async function api(payload) {
  const res = await window.fetch('/api/studio', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not save.');
  return data;
}

let TEMPLATES = [];
try {
  TEMPLATES = JSON.parse($('studio-templates').textContent || '[]');
} catch (e) {
  TEMPLATES = [];
}

const KIND_LABEL = {
  guide: 'Field guide',
  center: 'Essay'
};

let current = null;
let published = false;
let hydrating = false;
let markdownMode = false;
let saveTimer = null;
let saveChain = Promise.resolve();
let lastSnapshot = '';
let surface = null;
let libraryPages = [];

function kindLabel(id) {
  return KIND_LABEL[id] || id || 'Page';
}

function defaultKind() {
  try {
    const saved = localStorage.getItem(KIND_KEY);
    if (TEMPLATES.some((item) => item.id === saved)) return saved;
  } catch (e) { /* private mode */ }
  return TEMPLATES.some((item) => item.id === 'center') ? 'center' : (TEMPLATES[0] && TEMPLATES[0].id) || 'center';
}

function rememberKind(id) {
  try { localStorage.setItem(KIND_KEY, id); } catch (e) { /* private mode */ }
}

function noteSlug(path) {
  const match = String(path || '').match(/^content\/([a-z0-9-]+)\.md$/);
  return match ? match[1] : '';
}

function noteUrl(path) {
  const slug = noteSlug(path);
  return slug ? '/notes/' + slug + '/' : '';
}

function plainText(el) {
  return (el.textContent || '').replace(/\u00a0/g, ' ').trim();
}

function setEditable(el, value) {
  el.textContent = value || '';
  el.dataset.empty = plainText(el) ? 'false' : 'true';
}

function watchEditable(el) {
  el.addEventListener('input', () => {
    el.dataset.empty = plainText(el) ? 'false' : 'true';
    if (!hydrating) {
      syncPublishChrome();
      scheduleSave();
    }
  });
  el.addEventListener('paste', (event) => {
    event.preventDefault();
    const text = (event.clipboardData.getData('text/plain') || '').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, text);
  });
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (el.id === 'doc-title') $('doc-subtitle').focus();
      else if (surface) surface.focus();
    }
  });
}

function setStatus(state, detail) {
  const el = $('save-status');
  if (!el) return;
  const labels = { saving: 'Saving…', saved: 'Saved', error: 'Error saving' };
  el.textContent = labels[state] || '';
  el.className = 'studio-status' + (state ? ' studio-status--' + state : '');
  el.title = detail || '';
}

function show(view) {
  if (view !== 'edit') flushSoon();
  ['library', 'edit', 'new'].forEach((name) => {
    $('view-' + name).hidden = name !== view;
  });
  document.querySelectorAll('.studio-bar [data-view]').forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.getAttribute('data-view') === view ? 'true' : 'false');
  });
  $('studio').classList.toggle('studio--writing', view === 'edit');
  const reading = document.querySelector('.reading');
  if (reading) reading.classList.toggle('reading--wide', view === 'edit');
  clearNotice();
  syncComposing();
  if (view === 'new') window.setTimeout(() => $('new-title').focus(), 0);
}

function cacheDraft(path, text, isPublished) {
  try {
    sessionStorage.setItem('ar-draft:' + path, text);
    const slug = noteSlug(path);
    if (!slug) return;
    const parts = splitFrontMatter(text);
    const layout = frontValue(parts.front, 'layout');
    sessionStorage.setItem('ar-draft-at:' + path, String(Date.now()));
    sessionStorage.setItem('ar-note:' + slug, JSON.stringify({
      slug,
      title: frontValue(parts.front, 'title') || 'Untitled',
      kind: layout.indexOf('guide') !== -1 ? 'guide' : 'center',
      subtitle: frontValue(parts.front, 'subtitle'),
      series: frontValue(parts.front, 'series'),
      cover: /^cover:\s*true\s*$/m.test(parts.front),
      cover_meta: frontValue(parts.front, 'cover_meta'),
      markdown: parts.body,
      published: !!isPublished,
      savedAt: Date.now()
    }));
  } catch (e) { /* private mode */ }
}

function formatUpdated(value) {
  const match = String(value || '').match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}

function pageUpdated(page) {
  if (page.updated) return formatUpdated(page.updated);
  if (!page.text) return '';
  return formatUpdated(frontValue(splitFrontMatter(page.text).front, 'updated'));
}

function renderLibrary() {
  const box = $('library');
  const query = ($('library-search').value || '').trim().toLowerCase();
  const rows = libraryPages.filter((page) => {
    if (!query) return true;
    const hay = [page.title, page.path, page.kind, kindLabel(page.kind), page.published ? 'published' : 'draft'].join(' ').toLowerCase();
    return hay.indexOf(query) !== -1;
  });
  box.innerHTML = '';
  if (!rows.length) {
    box.innerHTML = '<p class="studio-hint">Nothing here yet.</p>';
    return;
  }
  const table = document.createElement('table');
  table.className = 'studio-table';
  const caption = document.createElement('caption');
  caption.className = 'sr-only';
  caption.textContent = 'Pages';
  table.appendChild(caption);
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Title', 'Status', 'Type', 'Updated', ''].forEach((label) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    if (!label) th.appendChild(Object.assign(document.createElement('span'), { className: 'sr-only', textContent: 'Actions' }));
    headRow.appendChild(th);
  });
  head.appendChild(headRow);
  const body = document.createElement('tbody');
  rows.forEach((page) => body.appendChild(libraryRow(page)));
  table.append(head, body);
  box.appendChild(table);
}

function libraryRow(page) {
  const tr = document.createElement('tr');
  const title = document.createElement('th');
  title.scope = 'row';
  const name = document.createElement('button');
  name.type = 'button';
  name.className = 'studio-table__title';
  name.textContent = page.title || page.path;
  name.addEventListener('click', () => openEditor(page));
  const path = document.createElement('div');
  path.className = 'studio-table__path';
  path.textContent = page.path;
  title.append(name, path);

  const status = document.createElement('td');
  status.className = 'studio-table__status';
  const pill = document.createElement('span');
  if (page.locked) {
    pill.className = 'pill';
    pill.textContent = 'Template';
  } else {
    pill.className = 'pill' + (page.published ? '' : ' pill--draft');
    pill.textContent = page.published ? 'Published' : 'Draft';
  }
  status.appendChild(pill);

  const type = document.createElement('td');
  type.className = 'studio-table__kind';
  type.textContent = kindLabel(page.kind);

  const updated = document.createElement('td');
  updated.className = 'studio-table__updated';
  updated.textContent = pageUpdated(page) || '—';

  const actions = document.createElement('td');
  actions.className = 'studio-table__actions';
  const preview = document.createElement('a');
  preview.href = page.url;
  preview.textContent = 'Preview';
  actions.appendChild(preview);
  const siteHref = page.publicUrl || (page.published ? noteUrl(page.path) : '');
  if (siteHref && siteHref !== page.url) {
    const site = document.createElement('a');
    site.href = siteHref;
    site.textContent = 'Site';
    actions.appendChild(site);
  }
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'studio-table__edit';
  edit.textContent = 'Edit';
  edit.addEventListener('click', () => openEditor(page));
  actions.appendChild(edit);

  tr.append(title, status, type, updated, actions);
  return tr;
}

async function loadLibrary(quiet) {
  const box = $('library');
  if (!quiet) box.innerHTML = '<p class="studio-hint">Loading…</p>';
  try {
    const res = await window.fetch('/editor/pages.json');
    const pages = await res.json();
    let drafts = [];
    try {
      const extra = await api({ action: 'list' });
      drafts = extra.pages || [];
    } catch (e) {
      drafts = [];
    }
    const seen = {};
    drafts.forEach((page) => { seen[page.path] = true; });
    libraryPages = drafts.concat(pages.filter((page) => !seen[page.path]));
    libraryPages.sort((a, b) => {
      const left = pageUpdated(a);
      const right = pageUpdated(b);
      if (left !== right) return left < right ? 1 : -1;
      return String(a.title || '').localeCompare(String(b.title || ''));
    });
    renderLibrary();
  } catch (e) {
    box.innerHTML = '<p class="studio-hint">Could not load the library.</p>';
  }
}

function fillKinds(selected) {
  const select = $('doc-kind');
  select.innerHTML = '';
  const items = TEMPLATES.slice().sort((a, b) => a.order - b.order);
  const known = {};
  items.forEach((item) => {
    known[item.id] = true;
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.title;
    select.appendChild(opt);
  });
  if (selected && !known[selected]) {
    const opt = document.createElement('option');
    opt.value = selected;
    opt.textContent = kindLabel(selected);
    select.appendChild(opt);
  }
  select.value = selected && (known[selected] || true) ? selected : defaultKind();
}

function applyDocChrome(kind) {
  const doc = $('studio-doc');
  const essay = kind !== 'guide';
  doc.classList.toggle('tpl--center', essay);
  doc.classList.toggle('studio-doc--guide', kind === 'guide');
  const series = $('doc-series');
  const showSeries = kind === 'guide' || !!plainText(series);
  series.hidden = !showSeries;
}

function bodyMarkdown() {
  if (markdownMode) return $('doc-markdown').value;
  return surface ? surface.getMarkdown() : '';
}

function editorState() {
  return {
    title: plainText($('doc-title')),
    subtitle: plainText($('doc-subtitle')),
    series: $('doc-series').hidden ? frontValue(current && current.front, 'series') : plainText($('doc-series')),
    kind: $('doc-kind').value,
    published,
    body: bodyMarkdown().replace(/\s+$/, '')
  };
}

function snapshot() {
  return JSON.stringify(editorState());
}

function isDirty() {
  if (!current || hydrating || !lastSnapshot) return false;
  let saved;
  try { saved = JSON.parse(lastSnapshot); } catch (e) { return true; }
  const now = editorState();
  return saved.title !== now.title
    || saved.subtitle !== now.subtitle
    || saved.series !== now.series
    || saved.kind !== now.kind
    || saved.body !== now.body;
}

function buildText(nextPublished, verb) {
  let front = current.front || '';
  const title = plainText($('doc-title'));
  front = setField(front, 'title', quote(title));
  front = setField(front, 'subtitle', quote(plainText($('doc-subtitle'))));
  const kind = $('doc-kind').value;
  const template = TEMPLATES.find((item) => item.id === kind);
  if (template) front = setField(front, 'layout', template.layout);
  if (!$('doc-series').hidden) front = setField(front, 'series', quote(plainText($('doc-series'))));
  front = setField(front, 'published', nextPublished ? 'true' : 'false');
  if (verb === 'publish') front = setField(front, 'updated', new Date().toISOString().slice(0, 10));
  return compose(front, bodyMarkdown());
}

function enqueue(task) {
  const run = saveChain.then(task, task);
  saveChain = run.then(() => {}, () => {});
  return run;
}

async function persist(nextPublished, verb) {
  if (!current) return;
  const title = plainText($('doc-title'));
  if (!title) {
    if (verb === 'publish') published = false;
    if (verb === 'unpublish') published = true;
    syncPublishChrome();
    setStatus('error', 'Give the page a title first.');
    if (verb !== 'update') notice('Give the page a title first.', true);
    return;
  }
  if (surface && !markdownMode) await surface.persistLocalImages();
  const text = buildText(nextPublished, verb);
  const snap = snapshot();
  if (verb === 'update' && snap === lastSnapshot) {
    setStatus('saved');
    return;
  }
  setStatus('saving');
  const wasLive = publishedFlag(current.front);
  const data = await api({ action: 'write', path: current.path, text, verb });
  const parts = splitFrontMatter(data.text || text);
  current.front = parts.front;
  published = publishedFlag(parts.front);
  lastSnapshot = snap;
  cacheDraft(current.path, data.text || text, published);
  const updated = formatUpdated(frontValue(parts.front, 'updated'));
  $('doc-updated').textContent = updated;
  $('doc-meta').hidden = !updated;
  setStatus('saved');
  syncPublishChrome();
  if (verb === 'publish') {
    const publicUrl = noteUrl(current.path);
    const message = wasLive ? 'Updated.' : 'Published. It is on the site now.';
    if (publicUrl) notice(message, false, { url: publicUrl, label: 'View on the site' });
    else notice(message, false, { url: current.url, label: 'Preview' });
  } else if (verb === 'unpublish') {
    notice('Unpublished. It is a draft again.', false, { url: current.url, label: 'Preview' });
  }
  loadLibrary(true);
}

function scheduleSave() {
  if (hydrating || !current) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    enqueue(() => persist(published, 'update')).catch((error) => {
      setStatus('error', error.message);
    });
  }, 700);
}

function flushSoon() {
  if (!current || hydrating) return Promise.resolve();
  window.clearTimeout(saveTimer);
  if (snapshot() === lastSnapshot) return Promise.resolve();
  return enqueue(() => persist(published, 'update')).catch((error) => {
    setStatus('error', error.message);
    throw error;
  });
}

function ensureSurface() {
  if (surface) return surface;
    surface = mountEditor($('doc-body'), {
    uploadImage,
    onSelection: syncToolbar,
    onWarn(message) { notice(message, false); },
    onChange(error) {
      if (error) {
        setStatus('error', error.message || 'Could not add that image.');
        return;
      }
      if (!hydrating && !markdownMode) {
        syncPublishChrome();
        scheduleSave();
      }
    }
  });
  return surface;
}

async function uploadImage(file) {
  let type = (file.type || '').toLowerCase();
  if (type === 'image/jpg') type = 'image/jpeg';
  if (!type && /\.svg$/i.test(file.name || '')) type = 'image/svg+xml';
  if (type !== 'image/jpeg' && type !== 'image/png' && type !== 'image/webp' && type !== 'image/svg+xml') {
    throw new Error('Use a JPEG, PNG, WebP, or an SVG diagram.');
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('That image is over 5 MB.');
  const data = await blobToBase64(file);
  const result = await api({
    action: 'upload',
    name: file.name || 'image',
    contentType: type,
    data
  });
  if (!result.url) throw new Error('Could not store that image.');
  return result.url;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      const comma = value.indexOf(',');
      resolve(comma === -1 ? value : value.slice(comma + 1));
    };
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(blob);
  });
}

function fillEditor(page, text) {
  ensureSurface();
  hydrating = true;
  markdownMode = false;
  $('studio-doc').classList.remove('is-markdown');
  $('markdown-toggle').setAttribute('aria-pressed', 'false');
  $('doc-markdown').hidden = true;
  const parts = splitFrontMatter(text);
  const kind = kindFromLayout(frontValue(parts.front, 'layout')) || page.kind || defaultKind();
  current = {
    path: page.path,
    url: page.url || ('/editor/draft/?path=' + encodeURIComponent(page.path)),
    front: parts.front
  };
  published = publishedFlag(parts.front);
  fillKinds(kind);
  applyDocChrome(kind);
  setEditable($('doc-title'), frontValue(parts.front, 'title') || page.title || '');
  setEditable($('doc-subtitle'), frontValue(parts.front, 'subtitle'));
  setEditable($('doc-series'), frontValue(parts.front, 'series'));
  applyDocChrome($('doc-kind').value);
  const updated = formatUpdated(frontValue(parts.front, 'updated'));
  $('doc-updated').textContent = updated;
  $('doc-meta').hidden = !updated;
  $('preview-link').href = current.url;
  surface.setMarkdown(parts.body || '', false);
  $('doc-markdown').value = surface.getMarkdown();
  closeLinkForm();
  lastSnapshot = snapshot();
  hydrating = false;
  syncPublishChrome();
  setStatus('saved');
  show('edit');
  surface.focus();
}

async function openEditor(page) {
  clearNotice();
  try {
    if (page.text) {
      fillEditor(page, page.text);
      return;
    }
    const data = await api({ action: 'read', path: page.path });
    fillEditor(page, data.text);
  } catch (e) {
    notice(e.message, true);
  }
}

async function createDraft(event) {
  event.preventDefault();
  const title = $('new-title').value.trim();
  const kind = defaultKind();
  if (!title) {
    notice('Give the page a title.', true);
    return;
  }
  try {
    const data = await api({ action: 'create', kind, title, blank: true });
    $('new-title').value = '';
    rememberKind(kind);
    fillEditor({ path: data.path, title: data.title, kind: data.kind, url: data.url }, data.text);
    cacheDraft(data.path, data.text, false);
    loadLibrary();
  } catch (e) {
    notice(e.message, true);
  }
}

const liftedPanels = new Map();

function menuPanel(menu) {
  return liftedPanels.get(menu) || menu.querySelector('.studio-menu__panel');
}

function dropToolbarPanel(menu) {
  const panel = liftedPanels.get(menu);
  if (!panel) return;
  panel.classList.remove('is-lifted', 'is-add');
  panel.style.position = '';
  panel.style.top = '';
  panel.style.left = '';
  panel.style.right = '';
  panel.style.width = '';
  panel.style.maxHeight = '';
  panel.style.maxWidth = '';
  panel.style.overflowY = '';
  panel.style.zIndex = '';
  menu.appendChild(panel);
  liftedPanels.delete(menu);
}

function closeMenus() {
  document.querySelectorAll('.studio-menu').forEach((menu) => {
    const panel = menuPanel(menu);
    const trigger = menu.querySelector('.studio-menu__trigger');
    if (panel) panel.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    dropToolbarPanel(menu);
  });
}

function phoneWriting() {
  return window.matchMedia('(max-width: 720px)').matches;
}

function inWritingField(node) {
  return !!(node && node.closest && node.closest('#doc-title, #doc-subtitle, #doc-series, #doc-body, #doc-markdown, #link-form, .studio-docbar'));
}

function syncDocbarHeight() {
  const bar = document.querySelector('.studio-docbar');
  if (!bar) return;
  document.documentElement.style.setProperty('--studio-docbar-h', bar.offsetHeight + 'px');
}

function syncComposing() {
  const studio = $('studio');
  const editing = $('view-edit') && !$('view-edit').hidden;
  if (!studio) return;
  if (!editing || !phoneWriting()) {
    studio.classList.remove('is-composing');
    document.documentElement.style.removeProperty('--studio-stick');
    document.documentElement.style.removeProperty('--studio-docbar-h');
    if (liftedPanels.size) closeMenus();
    return;
  }
  const focused = inWritingField(document.activeElement);
  const vv = window.visualViewport;
  const keyboard = !!(vv && window.innerHeight - vv.height > 120);
  const composing = focused || keyboard;
  studio.classList.toggle('is-composing', composing);
  if (composing && vv) {
    document.documentElement.style.setProperty('--studio-stick', vv.offsetTop + 'px');
    syncDocbarHeight();
  } else {
    document.documentElement.style.removeProperty('--studio-stick');
    document.documentElement.style.removeProperty('--studio-docbar-h');
  }
}

function placeToolbarMenu(menu) {
  const trigger = menu.querySelector('.studio-menu__trigger');
  if (!trigger || !phoneWriting() || !menu.closest('.studio-toolbar')) return;
  let panel = liftedPanels.get(menu);
  if (!panel) {
    panel = menu.querySelector('.studio-menu__panel');
    if (!panel) return;
    liftedPanels.set(menu, panel);
    document.body.appendChild(panel);
  }
  panel.classList.add('is-lifted');
  panel.classList.toggle('is-add', menu.classList.contains('studio-add'));
  const rect = trigger.getBoundingClientRect();
  const margin = 8;
  const vv = window.visualViewport;
  const viewTop = vv ? vv.offsetTop : 0;
  const viewH = vv ? vv.height : window.innerHeight;
  const viewW = vv ? vv.width : window.innerWidth;
  panel.style.position = 'fixed';
  panel.style.zIndex = '80';
  panel.style.top = Math.round(rect.bottom + 6) + 'px';
  panel.style.maxHeight = Math.max(140, Math.round(viewTop + viewH - rect.bottom - 16)) + 'px';
  panel.style.maxWidth = Math.round(viewW - margin * 2) + 'px';
  panel.style.overflowY = 'auto';
  panel.style.width = menu.classList.contains('studio-add')
    ? 'min(16.5rem, ' + Math.round(viewW - margin * 2) + 'px)'
    : '';
  if (menu.classList.contains('studio-add') || rect.left > viewW * 0.5) {
    panel.style.left = 'auto';
    panel.style.right = Math.max(margin, Math.round(viewW - rect.right)) + 'px';
  } else {
    panel.style.right = 'auto';
    panel.style.left = Math.max(margin, Math.round(Math.min(rect.left, viewW - 180))) + 'px';
  }
}

function repositionLiftedMenus() {
  liftedPanels.forEach((panel, menu) => {
    if (!panel.hidden) placeToolbarMenu(menu);
  });
}

function syncPublishChrome() {
  const button = $('publish');
  const more = $('publish-more');
  const panel = $('publish-panel');
  const split = document.querySelector('.studio-publish');
  if (!button || !more || !split) return;
  const live = published && publishedFlag(current && current.front);
  if (!published) button.textContent = 'Publish';
  else if (live && isDirty()) button.textContent = 'Update';
  else button.textContent = 'Published';
  more.hidden = !published;
  split.classList.toggle('is-published', published);
  if (!published && panel) {
    panel.hidden = true;
    more.setAttribute('aria-expanded', 'false');
  }
}

function toggleMenu(menu) {
  if (!menu || (markdownMode && menu.dataset.menu !== 'publish')) return;
  const panel = menu.querySelector('.studio-menu__panel');
  const willOpen = panel && panel.hidden;
  closeMenus();
  if (!willOpen || !panel) return;
  panel.hidden = false;
  menu.querySelector('.studio-menu__trigger').setAttribute('aria-expanded', 'true');
  placeToolbarMenu(menu);
}

function syncToolbar() {
  if (!surface) return;
  const editor = surface.editor;
  const centered = editor.isActive({ textAlign: 'center' });
  const right = editor.isActive({ textAlign: 'right' });
  const justify = editor.isActive({ textAlign: 'justify' });
  const map = {
    bold: () => editor.isActive('bold'),
    italic: () => editor.isActive('italic'),
    strike: () => editor.isActive('strike'),
    code: () => editor.isActive('code'),
    underline: () => editor.isActive('underline'),
    highlight: () => editor.isActive('highlight'),
    link: () => editor.isActive('link'),
    superscript: () => editor.isActive('superscript'),
    subscript: () => editor.isActive('subscript'),
    paragraph: () => editor.isActive('paragraph'),
    h2: () => editor.isActive('heading', { level: 2 }),
    h3: () => editor.isActive('heading', { level: 3 }),
    bullet: () => editor.isActive('bulletList'),
    ordered: () => editor.isActive('orderedList'),
    quote: () => editor.isActive('blockquote'),
    codeBlock: () => editor.isActive('codeBlock'),
    alignLeft: () => !centered && !right && !justify,
    alignCenter: () => centered,
    alignRight: () => right,
    alignJustify: () => justify
  };
  document.querySelectorAll('.studio-toolbar [data-cmd]').forEach((button) => {
    const cmd = button.getAttribute('data-cmd');
    const on = map[cmd] ? map[cmd]() : false;
    if (map[cmd] && button.getAttribute('role') !== 'menuitemradio' && button.getAttribute('role') !== 'menuitem') {
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (button.getAttribute('role') === 'menuitemradio') {
      button.setAttribute('aria-checked', on ? 'true' : 'false');
    }
    if (cmd === 'link') button.setAttribute('aria-label', on ? 'Remove link' : 'Link');
    if (cmd === 'undo') button.disabled = markdownMode || !editor.can().undo();
    else if (cmd === 'redo') button.disabled = markdownMode || !editor.can().redo();
    else button.disabled = markdownMode;
  });
  document.querySelectorAll('.studio-menu__trigger').forEach((button) => {
    button.disabled = markdownMode;
  });
  const heading = document.querySelector('[data-menu="heading"] .studio-menu__trigger');
  const h2 = map.h2();
  const h3 = map.h3();
  if (heading) heading.setAttribute('aria-pressed', h2 || h3 ? 'true' : 'false');
  const label = $('heading-label');
  if (label) label.textContent = h2 ? 'H2' : h3 ? 'H3' : 'H';
  const list = document.querySelector('[data-menu="list"] .studio-menu__trigger');
  if (list) list.setAttribute('aria-pressed', map.bullet() ? 'true' : 'false');
}

function runCommand(cmd) {
  if (!surface || markdownMode) return;
  closeMenus();
  const chain = surface.editor.chain().focus();
  if (cmd === 'bold') chain.toggleBold().run();
  else if (cmd === 'italic') chain.toggleItalic().run();
  else if (cmd === 'strike') chain.toggleStrike().run();
  else if (cmd === 'underline') chain.toggleUnderline().run();
  else if (cmd === 'highlight') chain.toggleHighlight().run();
  else if (cmd === 'superscript') chain.toggleSuperscript().run();
  else if (cmd === 'subscript') chain.toggleSubscript().run();
  else if (cmd === 'code') chain.toggleCode().run();
  else if (cmd === 'paragraph') chain.setParagraph().run();
  else if (cmd === 'h2') chain.setHeading({ level: 2 }).run();
  else if (cmd === 'h3') chain.setHeading({ level: 3 }).run();
  else if (cmd === 'bullet') chain.toggleBulletList().run();
  else if (cmd === 'ordered') chain.toggleOrderedList().run();
  else if (cmd === 'quote') chain.toggleBlockquote().run();
  else if (cmd === 'rule') chain.setHorizontalRule().run();
  else if (cmd === 'codeBlock') chain.toggleCodeBlock().run();
  else if (cmd === 'alignLeft') chain.unsetTextAlign().run();
  else if (cmd === 'alignCenter') chain.setTextAlign('center').run();
  else if (cmd === 'alignRight') chain.setTextAlign('right').run();
  else if (cmd === 'alignJustify') chain.setTextAlign('justify').run();
  else if (cmd === 'undo') chain.undo().run();
  else if (cmd === 'redo') chain.redo().run();
  else if (cmd === 'link') toggleLink();
  else if (cmd === 'image') $('image-file').click();
  syncToolbar();
}

let linkSelection = null;

function closeLinkForm() {
  const form = $('link-form');
  if (form) form.hidden = true;
  linkSelection = null;
}

function toggleLink() {
  if (!surface || markdownMode) return;
  const editor = surface.editor;
  const form = $('link-form');
  if (form && !form.hidden) {
    closeLinkForm();
    editor.commands.focus();
    return;
  }
  if (editor.isActive('link')) {
    editor.chain().focus().unsetLink().run();
    closeLinkForm();
    return;
  }
  const { from, to } = editor.state.selection;
  linkSelection = { from, to };
  $('link-url').value = '';
  form.hidden = false;
  $('link-url').focus();
}

function applyLink(event) {
  event.preventDefault();
  const href = $('link-url').value.trim();
  const chain = surface.editor.chain().focus();
  if (linkSelection) chain.setTextSelection(linkSelection);
  if (!href) {
    chain.unsetLink().run();
  } else {
    const url = /^https?:\/\//i.test(href) || href.startsWith('/') || href.startsWith('#') || href.startsWith('mailto:')
      ? href
      : 'https://' + href;
    chain.extendMarkRange('link').setLink({ href: url }).run();
  }
  closeLinkForm();
  syncToolbar();
}

function setMarkdownMode(on) {
  if (!surface) return;
  if (on === markdownMode) return;
  if (on) {
    closeLinkForm();
    $('doc-markdown').value = surface.getMarkdown();
    $('doc-markdown').hidden = false;
    $('studio-doc').classList.add('is-markdown');
  } else {
    hydrating = true;
    surface.setMarkdown($('doc-markdown').value, false);
    hydrating = false;
    $('doc-markdown').hidden = true;
    $('studio-doc').classList.remove('is-markdown');
    scheduleSave();
  }
  markdownMode = on;
  if (on) closeMenus();
  $('markdown-toggle').setAttribute('aria-pressed', on ? 'true' : 'false');
  syncToolbar();
}

function init() {
  if (!$('studio')) return;

  if (unlocked()) $('app').hidden = false;
  else $('gate-screen').hidden = false;

  $('gate-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if ($('gate-code').value.trim() === CODE) {
      remember();
      $('gate-screen').hidden = true;
      $('app').hidden = false;
      loadLibrary();
    } else {
      $('gate-error').hidden = false;
    }
  });

  $('forget').addEventListener('click', () => {
    forget();
    $('app').hidden = true;
    $('gate-screen').hidden = false;
  });

  document.querySelectorAll('.studio-bar [data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      show(view);
      if (view === 'library') loadLibrary();
    });
  });

  $('back-library').addEventListener('click', () => {
    show('library');
    loadLibrary();
  });

  if (unlocked()) loadLibrary();

  $('open-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const path = $('open-path').value.trim().replace(/^\/+/, '');
    if (!path) return;
    openEditor({ path, title: path, kind: 'file' });
  });

  $('new-form').addEventListener('submit', createDraft);
  $('library-search').addEventListener('input', renderLibrary);

  watchEditable($('doc-title'));
  watchEditable($('doc-subtitle'));
  watchEditable($('doc-series'));

  $('doc-kind').addEventListener('change', () => {
    const kind = $('doc-kind').value;
    if (kind === 'guide' && !plainText($('doc-series'))) setEditable($('doc-series'), 'Field guide');
    applyDocChrome(kind);
    rememberKind(kind);
    syncPublishChrome();
    scheduleSave();
  });

  $('preview-link').addEventListener('click', (event) => {
    if (!isDirty()) return;
    event.preventDefault();
    const href = $('preview-link').href;
    flushSoon().then(() => { window.location.assign(href); }).catch((error) => {
      notice(error.message, true);
    });
  });

  $('publish').addEventListener('click', () => {
    if (published && !isDirty()) return;
    if (!plainText($('doc-title'))) {
      notice('Give the page a title first.', true);
      return;
    }
    window.clearTimeout(saveTimer);
    const previous = published;
    published = true;
    syncPublishChrome();
    enqueue(() => persist(true, 'publish')).catch((error) => {
      published = previous;
      syncPublishChrome();
      setStatus('error', error.message);
      notice(error.message, true);
    });
  });
  $('unpublish').addEventListener('click', () => {
    closeMenus();
    window.clearTimeout(saveTimer);
    const previous = published;
    published = false;
    syncPublishChrome();
    enqueue(() => persist(false, 'unpublish')).catch((error) => {
      published = previous;
      syncPublishChrome();
      setStatus('error', error.message);
      notice(error.message, true);
    });
  });

  document.querySelectorAll('.studio-toolbar button').forEach((button) => {
    button.addEventListener('mousedown', (event) => event.preventDefault());
  });
  const formatting = document.querySelector('.studio-toolbar');
  if (formatting) formatting.addEventListener('scroll', () => closeMenus(), { passive: true });
  document.addEventListener('focusin', syncComposing);
  document.addEventListener('focusout', () => window.setTimeout(syncComposing, 0));
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      syncComposing();
      repositionLiftedMenus();
    });
    window.visualViewport.addEventListener('scroll', () => {
      syncComposing();
      repositionLiftedMenus();
    });
  }
  window.addEventListener('resize', syncComposing);
  const docbar = document.querySelector('.studio-docbar');
  if (docbar && window.ResizeObserver) {
    new ResizeObserver(() => {
      if ($('studio').classList.contains('is-composing')) syncDocbarHeight();
    }).observe(docbar);
  }
  document.querySelectorAll('.studio-toolbar [data-cmd]').forEach((button) => {
    button.addEventListener('click', () => runCommand(button.getAttribute('data-cmd')));
  });
  document.querySelectorAll('.studio-menu__trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => toggleMenu(trigger.closest('.studio-menu')));
  });
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target.closest && (target.closest('.studio-menu') || target.closest('.studio-menu__panel')))) closeMenus();
    const form = $('link-form');
    if (!form || form.hidden) return;
    if (target.closest && (target.closest('#link-form') || target.closest('[data-cmd="link"]'))) return;
    closeLinkForm();
  });
  $('markdown-toggle').addEventListener('click', () => setMarkdownMode(!markdownMode));
  $('link-form').addEventListener('submit', applyLink);
  $('link-url').addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    closeLinkForm();
    if (surface) surface.editor.commands.focus();
  });
  $('doc-markdown').addEventListener('input', () => { if (!hydrating) scheduleSave(); });
  $('image-file').addEventListener('change', () => {
    const files = [...($('image-file').files || [])];
    $('image-file').value = '';
    if (files.length && surface) surface.insertFiles(files);
  });

  $('studio-doc').addEventListener('dragover', (event) => {
    if (event.dataTransfer && [...event.dataTransfer.types].includes('Files')) event.preventDefault();
  });
  $('studio-doc').addEventListener('drop', (event) => {
    const files = [...(event.dataTransfer ? event.dataTransfer.files : [])].filter((file) => (file.type || '').startsWith('image/'));
    if (!files.length || !surface) return;
    event.preventDefault();
    surface.insertFiles(files);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenus();
      closeLinkForm();
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      flushSoon();
    }
  });

  window.addEventListener('beforeunload', () => { flushSoon(); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

document.addEventListener('selectionchange', () => {
  if (surface && document.activeElement && document.activeElement.closest && document.activeElement.closest('.ProseMirror')) {
    syncToolbar();
  }
});
