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

  async function load(slug) {
    var lastError = "That post is not published.";
    for (var i = 0; i < 5; i++) {
      try {
        var res = await window.fetch("/api/posts?slug=" + encodeURIComponent(slug));
        var data = await res.json();
        if (res.ok) return data;
        lastError = data.error || lastError;
        if (res.status !== 404) break;
      } catch (error) {
        lastError = error.message || lastError;
        break;
      }
      await sleep(400);
    }
    var cached = fromCache(slug);
    if (cached && cached.markdown) return cached;
    throw new Error(lastError);
  }

  var slug = currentSlug();
  if (!slug) {
    root.textContent = "This page needs a published post.";
    return;
  }

  load(slug).then(function (doc) {
    window.AndeanPost.mount(root, doc);
  }).catch(function (error) {
    root.textContent = error.message;
  });
})();
