/* Published note at /notes/<slug>/. The shell is this site; the words come
 * from the studio store. The same browser can show a post it just published
 * even when the store has not caught up. */
(function () {
  "use strict";

  var root = document.getElementById("note-root");
  if (!root || !window.AndeanPost) return;

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function currentSlug() {
    var path = window.location.pathname.replace(/\/+$/, "");
    var fromPath = path.match(/^\/notes\/([a-z0-9-]+)$/);
    if (fromPath && fromPath[1] !== "view") return fromPath[1];
    return String(new URLSearchParams(window.location.search).get("slug") || "")
      .replace(/^\/+|\/+$/g, "");
  }

  function fromCache(slug) {
    try {
      var raw = sessionStorage.getItem("ar-note:" + slug);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function cacheIsNewer(cached, data) {
    if (!cached || !cached.savedAt || !data) return false;
    if (Date.now() - Number(cached.savedAt) > 20000) return false;
    return cached.title !== data.title || String(cached.markdown || "") !== String(data.markdown || "");
  }

  async function load(slug) {
    var cached = fromCache(slug);
    if (cached && cached.markdown) window.AndeanPost.mount(root, cached);
    var lastError = "That post is not published.";
    var remote = null;
    for (var i = 0; i < 6; i++) {
      try {
        var res = await window.fetch("/api/posts?slug=" + encodeURIComponent(slug));
        var data = await res.json();
        if (res.ok) {
          remote = data;
          if (!cacheIsNewer(cached, data)) {
            window.AndeanPost.mount(root, data);
            return;
          }
        } else {
          lastError = data.error || lastError;
          if (res.status !== 404) break;
        }
      } catch (error) {
        lastError = error.message || lastError;
        break;
      }
      await sleep(500);
    }
    if (cached && cached.markdown && cacheIsNewer(cached, remote)) return;
    if (remote) {
      window.AndeanPost.mount(root, remote);
      return;
    }
    if (!(cached && cached.markdown)) root.textContent = lastError;
  }

  var slug = currentSlug();
  if (!slug) {
    root.textContent = "This page needs a published post.";
    return;
  }

  load(slug);
})();
