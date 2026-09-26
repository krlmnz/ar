/* Home page list of posts published from the studio. */
(function () {
  "use strict";

  var list = document.getElementById("post-list");
  var empty = document.getElementById("post-empty");
  if (!list) return;

  function label(kind) {
    return kind === "guide" ? "Field guide" : "Essay";
  }

  function cachedTitle(url) {
    var match = String(url || "").match(/\/notes\/([a-z0-9-]+)\/?$/);
    if (!match) return "";
    try {
      var doc = JSON.parse(sessionStorage.getItem("ar-note:" + match[1]) || "null");
      if (!doc || !doc.savedAt || Date.now() - Number(doc.savedAt) > 20000) return "";
      return doc.title || "";
    } catch (e) {
      return "";
    }
  }

  function add(post) {
    if (!post || !post.url) return;
    var titleText = cachedTitle(post.url) || post.title || "Untitled";
    var links = list.querySelectorAll("a.guide-entry");
    for (var i = 0; i < links.length; i++) {
      if (links[i].pathname === post.url || links[i].getAttribute("href") === post.url) {
        var existing = links[i].querySelector(".guide-entry__title");
        if (existing) existing.textContent = titleText;
        return;
      }
    }
    var link = document.createElement("a");
    link.className = "guide-entry";
    link.href = post.url;
    var over = document.createElement("div");
    over.className = "guide-entry__overline";
    over.textContent = label(post.kind);
    var title = document.createElement("div");
    title.className = "guide-entry__title";
    title.textContent = titleText;
    link.appendChild(over);
    link.appendChild(title);
    if (post.subtitle) {
      var desc = document.createElement("div");
      desc.className = "guide-entry__description";
      desc.textContent = post.subtitle;
      link.appendChild(desc);
    }
    list.appendChild(link);
  }

  function show() {
    if (list.children.length) {
      list.hidden = false;
      if (empty) empty.hidden = true;
    }
  }

  function fromCache() {
    try {
      for (var i = 0; i < sessionStorage.length; i++) {
        var key = sessionStorage.key(i);
        if (!key || key.indexOf("ar-note:") !== 0) continue;
        var doc = JSON.parse(sessionStorage.getItem(key) || "null");
        if (doc && doc.published && doc.slug) {
          add({
            url: "/notes/" + doc.slug + "/",
            title: doc.title,
            kind: doc.kind,
            subtitle: doc.subtitle
          });
        }
      }
    } catch (e) { /* private mode */ }
    show();
  }

  fromCache();

  window.fetch("/api/posts")
    .then(function (res) { return res.ok ? res.json() : { posts: [] }; })
    .then(function (data) {
      (data.posts || []).forEach(add);
      show();
    })
    .catch(function () { show(); });
})();
