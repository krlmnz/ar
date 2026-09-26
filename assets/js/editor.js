/* Studio app for /editor/. Passcode gate plus a library, editor, and page
 * creator that read and write markdown through the GitHub contents API.
 * The token lives in localStorage on this browser only.
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

  function ls(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key) || '';
      window.localStorage.setItem(key, value);
      return value;
    } catch (e) {
      return value === undefined ? '' : value;
    }
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

  function repo() {
    return {
      owner: ls('ar_owner') || 'krlmnz',
      repo: ls('ar_repo') || 'ar',
      branch: ls('ar_branch') || 'main',
      token: ls('ar_token') || ''
    };
  }

  function encode(text) {
    return window.btoa(window.unescape(window.encodeURIComponent(text)));
  }

  function decode(b64) {
    return window.decodeURIComponent(window.escape(window.atob(b64.replace(/\s/g, ''))));
  }

  async function gh(path, method, payload) {
    var r = repo();
    if (!r.token) throw new Error('Add a GitHub token in Settings first.');
    var res = await window.fetch(
      'https://api.github.com/repos/' + r.owner + '/' + r.repo + '/contents/' + path,
      {
        method: method || 'GET',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': 'Bearer ' + r.token,
          'Content-Type': 'application/json'
        },
        body: payload ? JSON.stringify(payload) : undefined
      }
    );
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error((data && data.message) || ('GitHub: ' + res.status));
    return { data: data, branch: r.branch };
  }

  async function readFile(path) {
    var r = repo();
    var out = await gh(path + '?ref=' + window.encodeURIComponent(r.branch));
    return { sha: out.data.sha, text: decode(out.data.content || '') };
  }

  async function writeFile(path, text, message, sha) {
    var r = repo();
    var payload = { message: message, content: encode(text), branch: r.branch };
    if (sha) payload.sha = sha;
    await gh(path, 'PUT', payload);
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

  function slugify(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^\w\s-]/g, '').trim()
      .replace(/\s+/g, '-').replace(/-+/g, '-');
  }

  var TEMPLATES = [];
  try {
    TEMPLATES = JSON.parse($('studio-templates').textContent || '[]');
  } catch (e) {
    TEMPLATES = [];
  }

  var current = null;

  function show(view) {
    ['library', 'edit', 'new', 'settings'].forEach(function (name) {
      $('view-' + name).hidden = name !== view;
    });
    document.querySelectorAll('.studio-bar [data-view]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-view') === view ? 'true' : 'false');
    });
    clearNotice();
  }

  async function loadLibrary() {
    var box = $('library');
    box.innerHTML = '<p class="studio-hint">Loading…</p>';
    try {
      var res = await window.fetch('/editor/pages.json');
      var pages = await res.json();
      box.innerHTML = '';
      if (!pages.length) {
        box.innerHTML = '<p class="studio-hint">Nothing here yet.</p>';
        return;
      }
      pages.forEach(function (page) {
        var row = document.createElement('div');
        row.setAttribute('class', 'page-row');
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
        preview.href = page.url;
        preview.textContent = 'Preview';
        var edit = document.createElement('button');
        edit.type = 'button';
        edit.textContent = 'Edit';
        edit.addEventListener('click', function () { openEditor(page); });
        meta.appendChild(kind);
        meta.appendChild(state);
        meta.appendChild(preview);
        meta.appendChild(edit);
        row.appendChild(left);
        row.appendChild(meta);
        box.appendChild(row);
      });
    } catch (e) {
      box.innerHTML = '<p class="studio-hint">Could not load the library.</p>';
    }
  }

  async function openEditor(page) {
    clearNotice();
    try {
      var file = await readFile(page.path);
      current = { path: page.path, url: page.url || guessUrl(page.path), sha: file.sha };
      $('edit-kicker').textContent = (page.kind || 'file') + (page.demo ? ' · template preview' : '');
      $('edit-title').textContent = page.title || page.path;
      $('edit-heading').value = parseTitle(file.text) || page.title || '';
      $('edit-body').value = file.text;
      show('edit');
    } catch (e) {
      notice(e.message, true);
    }
  }

  function guessUrl(path) {
    var m = path.match(/^content\/places\/([^/]+)\/index\.md$/);
    if (m) return '/places/' + m[1] + '/';
    m = path.match(/^content\/(.+)\.md$/);
    if (m) return '/' + m[1].split('/').pop() + '/';
    return '/';
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
      await writeFile(current.path, text, 'content: ' + verb + ' ' + title, current.sha);
      var file = await readFile(current.path);
      current.sha = file.sha;
      $('edit-body').value = file.text;
      notice('Saved. The site rebuilds in about a minute.', false, { url: current.url, label: 'Preview' });
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
    var slug = slugify(title);
    if (!slug) {
      notice('That title makes an empty slug — try plainer characters.', true);
      return;
    }
    var path = t.dir ? t.out + '/' + slug + '/index.md' : t.out + '/' + slug + '.md';
    try {
      var r = repo();
      var out = await gh('_starters/' + t.starter + '?ref=' + window.encodeURIComponent(r.branch));
      var today = new Date().toISOString().slice(0, 10);
      var text = decode(out.data.content || '')
        .replace(/__TITLE__/g, title.replace(/"/g, '\\"'))
        .replace(/__SLUG__/g, slug)
        .replace(/__DATE__/g, today);
      await writeFile(path, text, 'content: update ' + title, null);
      var url = t.dir ? '/places/' + slug + '/' : '/' + slug + '/';
      notice('Draft created at ' + path + '. The site rebuilds in about a minute.', false, { url: url, label: 'Preview' });
      $('new-title').value = '';
      loadLibrary();
    } catch (e) {
      notice(e.message, true);
    }
  }

  function loadSettings() {
    $('set-token').value = ls('ar_token');
    $('set-owner').value = ls('ar_owner') || 'krlmnz';
    $('set-repo').value = ls('ar_repo') || 'ar';
    $('set-branch').value = ls('ar_branch') || 'main';
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
    loadSettings();
    loadLibrary();

    $('new-kind').addEventListener('change', updateKindHint);
    $('open-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var path = $('open-path').value.trim().replace(/^\/+/, '');
      if (!path) return;
      openEditor({ path: path, url: guessUrl(path), title: path, kind: 'file' });
    });
    $('create-draft').addEventListener('click', createDraft);
    $('save-draft').addEventListener('click', function () { save(false, 'update'); });
    $('publish').addEventListener('click', function () { save(true, 'publish'); });
    $('unpublish').addEventListener('click', function () { save(false, 'unpublish'); });
    $('save-settings').addEventListener('click', function () {
      ls('ar_token', $('set-token').value.trim());
      ls('ar_owner', $('set-owner').value.trim() || 'krlmnz');
      ls('ar_repo', $('set-repo').value.trim() || 'ar');
      ls('ar_branch', $('set-branch').value.trim() || 'main');
      notice('Settings saved in this browser.');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
