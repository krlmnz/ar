/* Site search — a command-palette dialog over the build-time /api/search.json.
   No dependencies on purpose: the index is a few dozen items, so a hand-rolled
   scorer costs nothing and lets us fold in facet synonyms ("cheap" counts as
   cost_level budget) and a boost for whatever region/tag/audience page the
   reader is already on. */
(function () {
  'use strict';

  var dialog = document.querySelector('dialog.search');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  var input = dialog.querySelector('.search__input');
  var list = dialog.querySelector('.search__results');
  var live = dialog.querySelector('.search__status');

  var indexPromise = null;
  var indexLoaded = false;
  var items = [];
  var regionLookup = []; // [{needle, slug}] — real region slugs + labels only
  var selected = -1;

  /* Fold accents, then lowercase. Chile is full of them — Pucón, Valparaíso,
     Villarrica's neighbours, Huerquehue — and nobody types the accent into a
     search box. Without this, "pucon" scored 0 against "Adventure in Pucón"
     and the palette said "No matches" while three pages talked about it.
     Folding is applied to BOTH sides, so "Pucón" finds it too.

     NFD splits "ó" into "o" + combining acute; stripping the combining marks
     leaves plain ASCII. Precomposed input keeps the same length afterwards,
     which is what lets highlighting map offsets straight back onto the
     original string. */
  function fold(s) {
    return String(s == null ? '' : s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  }

  /* A query word on the left counts as the facet on the right, so "cheap
     wine" surfaces budget savor places even when neither word is in the
     text. Only facets that exist in front matter — no free association. */
  var FACETS = {
    cheap: ['cost_level', 'budget'],
    budget: ['cost_level', 'budget'],
    expensive: ['cost_level', 'expensive'],
    fancy: ['cost_level', 'expensive'],
    splurge: ['cost_level', 'expensive'],
    family: ['audience', 'family'],
    kids: ['audience', 'family'],
    adventure: ['audience', 'thrill'],
    adrenaline: ['audience', 'thrill'],
    food: ['audience', 'savor'],
    wine: ['audience', 'savor'],
    eat: ['audience', 'savor']
  };

  var KIND_LABELS = { place: 'Places', guide: 'Guides', practical: 'Practical' };

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch('/api/search.json')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          items = data.map(function (d) {
            return {
              raw: d,
              title: fold(d.title),
              sub: fold(d.sub),
              text: fold(d.text),
              tags: (d.tags || []).map(fold)
            };
          });
          // Region synonyms come from the index itself, so only real region
          // slugs/labels ever boost — "pucon" is a place, not a region.
          var seen = {};
          data.forEach(function (d) {
            if (d.region && !seen[d.region]) {
              seen[d.region] = true;
              regionLookup.push({ needle: fold(d.region), slug: d.region });
              if (d.region_label) {
                regionLookup.push({ needle: fold(d.region_label), slug: d.region });
              }
            }
          });
          indexLoaded = true;
        })
        .catch(function () {
          indexPromise = null; // allow a retry — next open OR next keystroke
          list.innerHTML = '<li class="search__empty" role="presentation">Search is unavailable right now.</li>';
          live.textContent = 'Search is unavailable right now.';
        });
    }
    return indexPromise;
  }

  /* Region slugs a query might mean: whole query against each needle both
     ways, plus per-token containment (3+ chars, so "a" boosts nothing). */
  function regionsFor(q, tokens) {
    var out = {};
    regionLookup.forEach(function (r) {
      var hit = r.needle.indexOf(q) !== -1 || q.indexOf(r.needle) !== -1;
      if (!hit) {
        hit = tokens.some(function (tok) {
          return tok.length > 2 && r.needle.indexOf(tok) !== -1;
        });
      }
      if (hit) out[r.slug] = true;
    });
    return out;
  }

  function contextMatch(it) {
    var ctx = (document.body.dataset.searchContext || '').split(':');
    if (ctx.length !== 2) return false;
    if (ctx[0] === 'region') return it.raw.region === ctx[1];
    if (ctx[0] === 'tag') return it.tags.indexOf(ctx[1]) !== -1;
    if (ctx[0] === 'audience') return (it.raw.audience || []).indexOf(ctx[1]) !== -1;
    return false;
  }

  function scoreItem(it, tokens, boostRegions) {
    var s = 0;
    tokens.forEach(function (tok) {
      if (it.title.indexOf(tok) === 0) s += 50;
      else if (it.title.indexOf(' ' + tok) !== -1) s += 35;
      else if (it.title.indexOf(tok) !== -1) s += 15;
      if (it.tags.some(function (t) { return t.indexOf(tok) === 0; })) s += 20;
      if (it.sub.indexOf(tok) !== -1) s += 10;
      if (it.text.indexOf(tok) !== -1) s += 4;
      var f = FACETS[tok];
      // indexOf covers both shapes: cost_level string, audience array.
      if (f && (it.raw[f[0]] || '').indexOf(f[1]) !== -1) s += 25;
    });
    if (boostRegions[it.raw.region]) s += 30;
    return s;
  }

  function runSearch(q) {
    // Until the index has actually arrived, a search would render the "No
    // matches" empty state over content that very much exists (or clobber the
    // failure notice). Defer instead — and since a failed fetch resets
    // indexPromise, every keystroke doubles as a retry on flaky connections.
    if (!indexLoaded) {
      loadIndex().then(function () { if (indexLoaded) runSearch(input.value); });
      return;
    }
    q = fold(q).trim();
    if (!q) { render([], ''); return; }
    var tokens = q.split(/\s+/);
    var boost = regionsFor(q, tokens);
    var results = [];
    items.forEach(function (it) {
      var s = scoreItem(it, tokens, boost);
      if (s > 0 && contextMatch(it)) s *= 1.3; // "you're browsing X" nudge
      if (s > 0) results.push({ it: it, s: s });
    });
    results.sort(function (a, b) { return b.s - a.s; });
    render(results.slice(0, 20), q, tokens);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* Locate a query hit inside `original`, comparing on folded text so an
     unaccented query still lands on the accented word. Offsets map straight
     back only while folding preserves length; if some exotic input breaks
     that, bail out rather than slice a string at the wrong index. */
  function findHit(original, q, tokens) {
    var hay = fold(original);
    if (hay.length !== String(original).length) return null;
    var at = hay.indexOf(q);
    var len = q.length;
    for (var i = 0; at === -1 && i < tokens.length; i++) {
      at = hay.indexOf(tokens[i]);
      len = tokens[i].length;
    }
    return at === -1 ? null : { at: at, len: len };
  }

  function markTitle(title, q, tokens) {
    var h = findHit(title, q, tokens || []);
    if (!h) return esc(title);
    return esc(title.slice(0, h.at)) +
      '<mark>' + esc(title.slice(h.at, h.at + h.len)) + '</mark>' +
      esc(title.slice(h.at + h.len));
  }

  /* A window of body text around the hit, so a result that matched deep in
     the prose explains itself instead of looking like a mystery. */
  function snippet(text, q, tokens) {
    var h = findHit(text, q, tokens || []);
    if (!h) return '';
    var before = 60, after = 90;
    var start = Math.max(0, h.at - before);
    var end = Math.min(text.length, h.at + h.len + after);
    // Don't cut mid-word at either edge.
    if (start > 0) {
      var sp = text.indexOf(' ', start);
      if (sp !== -1 && sp < h.at) start = sp + 1;
    }
    if (end < text.length) {
      var sp2 = text.lastIndexOf(' ', end);
      if (sp2 > h.at + h.len) end = sp2;
    }
    return (start > 0 ? '…' : '') +
      esc(text.slice(start, h.at)) +
      '<mark>' + esc(text.slice(h.at, h.at + h.len)) + '</mark>' +
      esc(text.slice(h.at + h.len, end)) +
      (end < text.length ? '…' : '');
  }

  /* True when nothing in the title or subtitle matched — i.e. the only
     reason this result is here is the body copy. */
  function bodyOnly(it, q, tokens) {
    var inHead = tokens.some(function (tok) {
      return it.title.indexOf(tok) !== -1 || it.sub.indexOf(tok) !== -1;
    });
    return !inHead && tokens.some(function (tok) { return it.text.indexOf(tok) !== -1; });
  }

  function render(results, q, tokens) {
    var html = '';
    var n = 0;
    /* Group by kind, but order the GROUPS by their best hit — not by a fixed
       place/guide/practical sequence. With a fixed order, "pucon" put four
       body-only place matches (score 4-14) above "Adventure in Pucón"
       (score 39), which is the one page with the word in its title. Since
       Enter opens the first option, the best match wasn't even reachable
       without arrowing past four worse ones. */
    var order = ['place', 'guide', 'practical'].map(function (kind) {
      var group = results.filter(function (r) { return r.it.raw.kind === kind; });
      return { kind: kind, group: group, best: group.length ? group[0].s : -1 };
    }).sort(function (a, b) { return b.best - a.best; });

    order.forEach(function (entry) {
      var kind = entry.kind;
      var group = entry.group;
      if (!group.length) return;
      html += '<li class="search__group" role="presentation">' + KIND_LABELS[kind] + '</li>';
      group.forEach(function (r) {
        var d = r.it.raw;
        var meta = [d.region_label, d.cost_level].filter(Boolean).join(' · ');
        // Matched only in the prose? Show that line instead of the subtitle,
        // so the reader can see what they actually hit.
        var snip = bodyOnly(r.it, q, tokens || []) ? snippet(d.text || '', q, tokens || []) : '';
        html += '<li class="search__option" role="option" aria-selected="false"' +
          ' id="search-opt-' + n + '" data-url="' + esc(d.url) + '">' +
          '<span class="search__option-title">' + markTitle(d.title, q, tokens || []) + '</span>' +
          (snip
            ? '<span class="search__option-sub search__option-snippet">' + snip + '</span>'
            : (d.sub ? '<span class="search__option-sub">' + esc(d.sub) + '</span>' : '')) +
          (meta ? '<span class="search__option-meta">' + esc(meta) + '</span>' : '') +
          '</li>';
        n++;
      });
    });
    if (q && !n) {
      html = '<li class="search__empty" role="presentation">No matches — try a place, a region, or a tag.</li>';
    }
    list.innerHTML = html;
    selected = -1;
    input.setAttribute('aria-expanded', n > 0 ? 'true' : 'false');
    input.removeAttribute('aria-activedescendant');
    live.textContent = q ? (n === 1 ? '1 result' : n + ' results') : '';
    if (n) select(0); // Enter always opens the top hit
  }

  function options() { return list.querySelectorAll('[role="option"]'); }

  function select(i) {
    var opts = options();
    if (!opts.length) return;
    if (selected >= 0 && opts[selected]) opts[selected].setAttribute('aria-selected', 'false');
    selected = (i + opts.length) % opts.length;
    opts[selected].setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', opts[selected].id);
    opts[selected].scrollIntoView({ block: 'nearest' });
  }

  function openSearch() {
    // Re-run the pending query once the index lands, so typing before the
    // first fetch resolves doesn't strand an empty result list.
    loadIndex().then(function () { if (input.value) runSearch(input.value); });
    if (!dialog.open) dialog.showModal();
    input.select();
  }

  var debounceTimer;
  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { runSearch(input.value); }, 80);
  });

  dialog.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); select(selected + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); select(selected - 1); }
    else if (e.key === 'Enter') {
      var opts = options();
      if (selected >= 0 && opts[selected]) {
        e.preventDefault();
        window.location.href = opts[selected].getAttribute('data-url');
      }
    }
  });

  list.addEventListener('click', function (e) {
    var opt = e.target.closest('[role="option"]');
    if (opt) window.location.href = opt.getAttribute('data-url');
  });

  // A click that lands on the dialog element itself is the ::backdrop.
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-search-open]')) { e.preventDefault(); openSearch(); }
  });

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (dialog.open) dialog.close(); else openSearch();
      return;
    }
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !dialog.open) {
      var a = document.activeElement;
      var typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' ||
        a.tagName === 'SELECT' || a.isContentEditable);
      if (!typing) { e.preventDefault(); openSearch(); }
    }
  });
})();
