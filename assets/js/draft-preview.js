/* Renders a studio draft with the site's type, before the next full build. */
(function () {
  "use strict";

  var root = document.getElementById("draft-root");
  if (!root || !window.AndeanPost) return;

  function field(front, key) {
    var match = front.match(new RegExp("^" + key + ":\\s*(.*)$", "m"));
    return match ? match[1].trim().replace(/^"(.*)"$/, "$1") : "";
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function fromCache(path) {
    try { return sessionStorage.getItem("ar-draft:" + path); } catch (e) { return null; }
  }

  function cacheIsNewer(path, cached, remote) {
    if (!cached || !remote || cached === remote) return false;
    var at = 0;
    try { at = Number(sessionStorage.getItem("ar-draft-at:" + path) || 0); } catch (e) { at = 0; }
    return at > 0 && Date.now() - at < 20000;
  }

  async function load(path) {
    var lastError = "Could not open the draft.";
    var cached = fromCache(path);
    var remote = null;
    for (var i = 0; i < 6; i++) {
      try {
        var res = await window.fetch("/api/studio", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "read", path: path })
        });
        var data = await res.json();
        if (res.ok && data.text) {
          remote = data.text;
          if (!cacheIsNewer(path, cached, remote)) return remote;
        } else {
          lastError = data.error || lastError;
          if (res.status !== 404) break;
        }
      } catch (error) {
        lastError = error.message || lastError;
        break;
      }
      await sleep(400);
    }
    if (cached && cacheIsNewer(path, cached, remote)) return cached;
    if (remote) return remote;
    if (cached) return cached;
    throw new Error(lastError);
  }

  var params = new URLSearchParams(window.location.search);
  var path = params.get("path");
  if (!path) {
    root.textContent = "This preview needs a page.";
    return;
  }

  function show(text) {
    var parts = String(text || "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    var front = parts ? parts[1] : "";
    var body = parts ? parts[2] : text;
    var kind = (field(front, "layout").match(/layouts\/([a-z0-9-]+)/) || [])[1] || "center";
    window.AndeanPost.mount(root, {
      title: field(front, "title") || "Draft",
      kind: kind === "guide" ? "guide" : "center",
      subtitle: field(front, "subtitle"),
      series: field(front, "series"),
      cover: /^cover:\s*true\s*$/m.test(front),
      cover_meta: field(front, "cover_meta"),
      markdown: body
    });
  }

  var cached = fromCache(path);
  if (cached) show(cached);

  load(path).then(show).catch(function (error) {
    if (!cached) root.textContent = error.message;
  });
})();
