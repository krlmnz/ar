/* Studio app for /editor/. The passcode gate is the cookie. Saves go to
 * /api/studio, which stores the draft on the site. No GitHub token in the browser.
 */
(function () {
  'use strict';

  var CODE = '042986';
  var COOKIE = 'ar_editor=' + CODE;

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
    var box = $('notice');
    box.hidden = false;
    box.setAttribute('class', 'studio-notice' + (isError ? ' studio-notice--error' : ''));
    box.innerHTML = '';
    box.appendChild(document.createTextNode(message));
    if (link) {
      box.appendChild(document.createTextNode(' '));
      var a = document.createElement('a');
      a.href = link.url;
      a.textContent = link.label;
      box.appendChild(a);
    }
    box.scrollIntoView({ block: 'nearest' });
  }

  function clearNotice() { $('notice').hidden = true; }

  async function api(payload) {
    var res = await window.fetch('/api/studio', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || 'Could not save.');
    return data;
  }

  function splitFrontMatter(text) {
    var m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!m) return { front: '', body: text };
    return { front: m[1], body: text.slice(m[0].length) };
  }

  function quote(value) {
    return /[:#\n]/.test(value) ? JSON.stringify(value) : value;
  }

  function setField(front, key, value) {
    var line = key + ': ' + value;
    var re = new RegExp('^' + key + ':[^\\n]*$', 'm');
    if (re.test(front)) return front.replace(re, line);
    return front ? front + '\n' + line : line;
  }

  function parseTitle(text) {
    var m = text.match(/^title:\s*(.*)$/m);
    return m ? m[1].trim().replace(/^"(.*)"$/, '$1') : '';
  }

  var TEMPLATES = [];
  try {
    TEMPLATES = JSON.parse($('studio-templates').textContent || '[]');
  } catch (e) {
    TEMPLATES = [];
  }

  var current = null;

  function show(view) {
    ['library', 'edit', 'new'].forEach(function (name) {
      $('view-' + name).hidden = name !== view;
    });
    document.querySelectorAll('.studio-bar [data-view]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-view') === view ? 'true' : 'false');
    });
    clearNotice();
  }

  function row(page) {
    var item = document.createElement('div');
    item.setAttribute('class', 'page-row');
    var left = document.createElement('div');
    var h = document.createElement('h2');
    h.textContent = page.title;
    var p = document.createElement('p');
    p.textContent = page.path;
    left.appendChild(h);
    left.appendChild(p);
    var meta = document.createElement('div');
    meta.setAttribute('class', 'meta');
    var kind = document.createElement('span');
    kind.setAttribute('class', 'pill');
    kind.textContent = page.kind;
    var state = document.createElement('span');
    if (page.locked) {
      state.setAttribute('class', 'pill');
      state.textContent = 'Preview';
    } else {
      state.setAttribute('class', 'pill' + (page.published ? '' : ' pill--draft'));
      state.textContent = page.published ? 'Published' : 'Draft';
    }
    var preview = document.createElement('a');
    preview.href = page.studio ? page.url : page.url;
    preview.textContent = 'Preview';
    var edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Edit';
    edit.addEventListener('click', function () { openEditor(page); });
    meta.appendChild(kind);
    meta.appendChild(state);
    meta.appendChild(preview);
    meta.appendChild(edit);
    item.appendChild(left);
    item.appendChild(meta);
    return item;
  }

  async function loadLibrary() {
    var box = $('library');
    box.innerHTML = '<p class="studio-hint">Loading…</p>';
    try {
      var res = await window.fetch('/editor/pages.json');
      var pages = await res.json();
      var drafts = [];
      try {
        var extra = await api({ action: 'list' });
        drafts = extra.pages || [];
      } catch (e) {
        drafts = [];
      }
      var seen = {};
      drafts.forEach(function (page) { seen[page.path] = true; });
      box.innerHTML = '';
      drafts.forEach(function (page) { box.appendChild(row(page)); });
      pages.forEach(function (page) {
        if (seen[page.path]) return;
        box.appendChild(row(page));
      });
      if (!box.children.length) box.innerHTML = '<p class="studio-hint">Nothing here yet.</p>';
    } catch (e) {
      box.innerHTML = '<p class="studio-hint">Could not load the library.</p>';
    }
  }

  function fillEditor(page, text) {
    current = { path: page.path, url: page.url || ('/editor/draft/?path=' + encodeURIComponent(page.path)) };
    $('edit-kicker').textContent = (page.kind || 'page') + (page.demo ? ' · template preview' : '');
    $('edit-title').textContent = page.title || page.path;
    $('edit-heading').value = parseTitle(text) || page.title || '';
    $('edit-body').value = text;
    show('edit');
  }

  async function openEditor(page) {
    clearNotice();
    try {
      if (page.text) {
        fillEditor(page, page.text);
        return;
      }
      var data = await api({ action: 'read', path: page.path });
      fillEditor(page, data.text);
    } catch (e) {
      notice(e.message, true);
    }
  }

  async function save(published, verb) {
    if (!current) return;
    var title = $('edit-heading').value.trim();
    if (!title) {
      notice('Give the page a title first.', true);
      return;
    }
    try {
      var parts = splitFrontMatter($('edit-body').value);
      var front = setField(parts.front, 'title', quote(title));
      front = setField(front, 'published', published ? 'true' : 'false');
      var text = '---\n' + front + '\n---\n' + parts.body.replace(/^\n+/, '\n');
      var data = await api({ action: 'write', path: current.path, text: text, verb: verb });
      $('edit-body').value = data.text;
      var message = data.committed
        ? 'Saved. The public site rebuilds in about a minute.'
        : 'Draft saved. Preview it here. It joins the public site on the next build.';
      notice(message, false, { url: '/editor/draft/?path=' + encodeURIComponent(current.path), label: 'Preview' });
      loadLibrary();
    } catch (e) {
      notice(e.message, true);
    }
  }

  function fillKinds() {
    var select = $('new-kind');
    TEMPLATES.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.title + (t.advanced ? ' (advanced)' : '');
      select.appendChild(opt);
    });
    updateKindHint();
  }

  function updateKindHint() {
    var t = TEMPLATES.find(function (x) { return x.id === $('new-kind').value; });
    $('new-kind-when').textContent = t ? t.when : '';
  }

  async function createDraft() {
    var t = TEMPLATES.find(function (x) { return x.id === $('new-kind').value; });
    var title = $('new-title').value.trim();
    if (!t || !title) {
      notice('Pick a template and a title.', true);
      return;
    }
    try {
      var data = await api({ action: 'create', kind: t.id, title: title });
      $('new-title').value = '';
      fillEditor({ path: data.path, title: data.title, kind: data.kind, url: data.url }, data.text);
      var message = data.committed
        ? 'Draft created. The public site rebuilds in about a minute.'
        : 'Draft created. Preview it here.';
      notice(message, false, { url: data.url, label: 'Preview' });
      loadLibrary();
    } catch (e) {
      notice(e.message, true);
    }
  }

  function init() {
    if (!$('studio')) return;

    if (unlocked()) {
      $('app').hidden = false;
    } else {
      $('gate-screen').hidden = false;
    }

    $('gate-form').addEventListener('submit', function (event) {
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

    $('forget').addEventListener('click', function () {
      forget();
      $('app').hidden = true;
      $('gate-screen').hidden = false;
    });

    document.querySelectorAll('.studio-bar [data-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        show(btn.getAttribute('data-view'));
        if (btn.getAttribute('data-view') === 'library') loadLibrary();
      });
    });

    fillKinds();
    if (unlocked()) loadLibrary();

    $('new-kind').addEventListener('change', updateKindHint);
    $('open-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var path = $('open-path').value.trim().replace(/^\/+/, '');
      if (!path) return;
      openEditor({ path: path, title: path, kind: 'file' });
    });
    $('create-draft').addEventListener('click', createDraft);
    $('save-draft').addEventListener('click', function () { save(false, 'update'); });
    $('publish').addEventListener('click', function () { save(true, 'publish'); });
    $('unpublish').addEventListener('click', function () { save(false, 'unpublish'); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
