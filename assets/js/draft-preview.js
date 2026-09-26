/* Renders a studio draft with the site's type, before the next full build. */
(function () {
  "use strict";

  var root = document.getElementById("draft-root");
  if (!root) return;

  function text(tag, value, className) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = value;
    return el;
  }

  function escape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function inline(value) {
    return escape(value)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  function render(markdown) {
    var html = [];
    var list = null;
    String(markdown || "").split(/\n/).forEach(function (line) {
      var heading = line.match(/^(#{1,3})\s+(.*)$/);
      if (heading) {
        if (list) { html.push("</" + list + ">"); list = null; }
        var level = heading[1].length + 1;
        var label = heading[2].replace(/\s+\(#([a-z0-9-]+)\)$/i, "");
        html.push("<h" + level + ">" + inline(label) + "</h" + level + ">");
        return;
      }
      if (/^\s*[-*]\s+/.test(line)) {
        if (list !== "ul") { if (list) html.push("</" + list + ">"); html.push("<ul>"); list = "ul"; }
        html.push("<li>" + inline(line.replace(/^\s*[-*]\s+/, "")) + "</li>");
        return;
      }
      if (/^\s*\d+\.\s+/.test(line)) {
        if (list !== "ol") { if (list) html.push("</" + list + ">"); html.push("<ol>"); list = "ol"; }
        html.push("<li>" + inline(line.replace(/^\s*\d+\.\s+/, "")) + "</li>");
        return;
      }
      if (list) { html.push("</" + list + ">"); list = null; }
      if (line.trim() === "") return;
      if (/^>\s?/.test(line)) {
        html.push("<blockquote><p>" + inline(line.replace(/^>\s?/, "")) + "</p></blockquote>");
        return;
      }
      html.push("<p>" + inline(line) + "</p>");
    });
    if (list) html.push("</" + list + ">");
    return html.join("");
  }

  function field(front, key) {
    var match = front.match(new RegExp("^" + key + ":\\s*(.*)$", "m"));
    return match ? match[1].trim().replace(/^"(.*)"$/, "$1") : "";
  }

  var params = new URLSearchParams(window.location.search);
  var path = params.get("path");
  if (!path) {
    root.textContent = "This preview needs a page.";
    return;
  }

  window.fetch("/api/studio", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "read", path: path })
  }).then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) throw new Error(data.error || "Could not open the draft.");
      return data;
    });
  }).then(function (data) {
    var parts = String(data.text || "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    var front = parts ? parts[1] : "";
    var body = parts ? parts[2] : data.text;
    var title = field(front, "title") || "Draft";
    var kind = (field(front, "layout").match(/layouts\/([a-z0-9-]+)/) || [])[1] || "page";
    document.title = title + " — Studio";
    root.innerHTML = "";
    var header = document.createElement("header");
    header.className = "page-header";
    if (field(front, "overline")) header.appendChild(text("div", field(front, "overline"), "page-header__type"));
    header.appendChild(text("h1", title, "page-header__title"));
    if (field(front, "subtitle")) header.appendChild(text("p", field(front, "subtitle"), "page-header__subtitle"));
    var prose = document.createElement("div");
    prose.className = kind === "guide" ? "prose guide-body" : "prose";
    prose.innerHTML = render(body);
    if (kind === "guide") {
      var layout = document.createElement("div");
      layout.className = "layout";
      var nav = document.createElement("nav");
      nav.className = "toc";
      nav.appendChild(text("h2", "Contents"));
      prose.querySelectorAll("h2").forEach(function (heading, index) {
        var id = "s" + (index + 1);
        heading.id = id;
        var link = document.createElement("a");
        link.href = "#" + id;
        link.textContent = String(index + 1).padStart(2, "0") + " " + heading.textContent;
        nav.appendChild(link);
      });
      var main = document.createElement("div");
      main.appendChild(header);
      main.appendChild(prose);
      layout.appendChild(nav);
      layout.appendChild(main);
      root.appendChild(layout);
    } else {
      root.appendChild(header);
      root.appendChild(prose);
    }
  }).catch(function (error) {
    root.textContent = error.message;
  });
})();
