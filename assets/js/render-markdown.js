/* Small markdown renderer for studio previews and published notes.
 * Authors still write ordinary markdown. HTML lines pass through so a
 * callout, plain-language box, or card can sit in the page. */
(function (root) {
  "use strict";

  var COVER_ART = '<svg class="cover-mark" viewBox="0 0 300 380" role="img" aria-hidden="true"><rect x="2" y="2" width="296" height="376" fill="none" stroke="var(--line)" stroke-width="3"/><path d="M40 250 L150 90 L260 250" fill="none" stroke="var(--ink)" stroke-width="3"/><path d="M78 250 L150 150 L222 250" fill="var(--panel)" stroke="var(--line)" stroke-width="3"/><path d="M48 268 H252" stroke="var(--accent)" stroke-width="4"/><g fill="var(--panel)" stroke="var(--line)" stroke-width="3"><circle cx="70" cy="268" r="7"/><circle cx="150" cy="268" r="7"/><circle cx="230" cy="268" r="7"/></g></svg>';

  function escape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function inline(value) {
    return escape(value)
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  function render(markdown) {
    var html = [];
    var list = null;
    var fence = false;
    var quote = [];
    var ids = {};

    function closeList() {
      if (!list) return;
      html.push("</" + list + ">");
      list = null;
    }

    function closeQuote() {
      if (!quote.length) return;
      html.push('<blockquote class="callout"><p>' + quote.map(inline).join("<br>") + "</p></blockquote>");
      quote = [];
    }

    String(markdown || "").replace(/\r\n/g, "\n").split("\n").forEach(function (line) {
      if (fence) {
        if (/^```/.test(line)) {
          html.push("</code></pre>");
          fence = false;
          return;
        }
        html.push(escape(line) + "\n");
        return;
      }
      if (/^```/.test(line)) {
        closeList();
        closeQuote();
        html.push("<pre><code>");
        fence = true;
        return;
      }
      if (/^>\s?/.test(line)) {
        closeList();
        quote.push(line.replace(/^>\s?/, ""));
        return;
      }
      closeQuote();

      var heading = line.match(/^(#{1,3})\s+(.*)$/);
      if (heading) {
        closeList();
        var level = heading[1].length;
        if (level < 2) level = 2;
        var raw = heading[2];
        var explicit = raw.match(/\s+\(#([A-Za-z0-9-]+)\)$/);
        var label = explicit ? raw.replace(/\s+\(#[A-Za-z0-9-]+\)$/, "") : raw;
        var id = explicit ? explicit[1] : (slugify(label) || "section");
        if (ids[id]) {
          ids[id] += 1;
          id = id + "-" + ids[id];
        } else {
          ids[id] = 1;
        }
        html.push("<h" + level + ' id="' + id + '">' + inline(label) + "</h" + level + ">");
        return;
      }
      if (/^\s*[-*]\s+/.test(line)) {
        if (list !== "ul") {
          closeList();
          html.push("<ul>");
          list = "ul";
        }
        html.push("<li>" + inline(line.replace(/^\s*[-*]\s+/, "")) + "</li>");
        return;
      }
      if (/^\s*\d+\.\s+/.test(line)) {
        if (list !== "ol") {
          closeList();
          html.push("<ol>");
          list = "ol";
        }
        html.push("<li>" + inline(line.replace(/^\s*\d+\.\s+/, "")) + "</li>");
        return;
      }
      if (line.trim() === "") {
        closeList();
        return;
      }
      closeList();
      if (/^\s*</.test(line)) {
        html.push(line);
        return;
      }
      html.push("<p>" + inline(line) + "</p>");
    });

    if (fence) html.push("</code></pre>");
    closeQuote();
    closeList();
    return html.join("");
  }

  function lessons(html) {
    if (!/<h2[\s>]/i.test(html || "")) return html || "";
    var parts = html.split(/(?=<h2[\s>])/i);
    return parts[0] + parts.slice(1).map(function (part) {
      return '<section class="lesson">' + part + "</section>";
    }).join("");
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function mount(rootEl, doc) {
    var kind = doc.kind === "guide" ? "guide" : "center";
    var shell = document.querySelector(".shell");
    if (shell) shell.classList.toggle("field-guide", kind === "guide");
    var title = doc.title || "Untitled";
    document.title = title + " — Andean Road";
    rootEl.innerHTML = "";
    var rendered = render(doc.markdown || "");
    var body = kind === "guide" ? lessons(rendered) : rendered;

    if (kind === "guide") {
      if (doc.cover) {
        var cover = document.createElement("header");
        cover.className = "cover";
        cover.setAttribute("aria-labelledby", "title");
        var copy = document.createElement("div");
        copy.className = "cover-copy";
        var top = document.createElement("div");
        if (doc.series) top.appendChild(el("div", "series", doc.series));
        var h1 = el("h1", "", title);
        h1.id = "title";
        top.appendChild(h1);
        if (doc.subtitle) top.appendChild(el("p", "", doc.subtitle));
        copy.appendChild(top);
        if (doc.cover_meta) {
          var meta = document.createElement("div");
          meta.className = "cover-meta";
          meta.appendChild(el("span", "", doc.cover_meta));
          copy.appendChild(meta);
        }
        var art = document.createElement("div");
        art.className = "cover-art";
        art.setAttribute("aria-hidden", "true");
        art.innerHTML = COVER_ART;
        cover.appendChild(copy);
        cover.appendChild(art);
        rootEl.appendChild(cover);
      }

      var layout = document.createElement("div");
      layout.className = "layout";
      var nav = document.createElement("nav");
      nav.className = "toc";
      nav.setAttribute("aria-label", "Contents");
      nav.appendChild(el("h2", "", "Contents"));
      var main = document.createElement("main");
      main.id = "main-content";
      main.className = "prose guide-body";
      if (!doc.cover) {
        var header = document.createElement("header");
        header.className = "page-header";
        if (doc.series) header.appendChild(el("div", "page-header__type", doc.series));
        var titleEl = el("h1", "page-header__title", title);
        titleEl.id = "title";
        header.appendChild(titleEl);
        if (doc.subtitle) header.appendChild(el("p", "page-header__subtitle", doc.subtitle));
        main.appendChild(header);
      }
      var holder = document.createElement("div");
      holder.innerHTML = body;
      while (holder.firstChild) main.appendChild(holder.firstChild);
      main.querySelectorAll("h2").forEach(function (heading, index) {
        if (!heading.id) heading.id = "s" + (index + 1);
        var link = document.createElement("a");
        link.href = "#" + heading.id;
        link.textContent = String(index + 1).padStart(2, "0") + " " + heading.textContent;
        nav.appendChild(link);
      });
      layout.appendChild(nav);
      layout.appendChild(main);
      rootEl.appendChild(layout);
    } else {
      var article = document.createElement("article");
      article.className = "tpl tpl--center";
      article.id = "main-content";
      var header2 = document.createElement("header");
      header2.className = "page-header";
      var h = el("h1", "page-header__title", title);
      h.id = "title";
      header2.appendChild(h);
      if (doc.subtitle) header2.appendChild(el("p", "page-header__subtitle", doc.subtitle));
      var prose = document.createElement("div");
      prose.className = "prose";
      prose.innerHTML = body;
      article.appendChild(header2);
      article.appendChild(prose);
      rootEl.appendChild(article);
    }

    document.dispatchEvent(new CustomEvent("andean:ready"));
  }

  root.AndeanPost = { render: render, mount: mount };
})(typeof window !== "undefined" ? window : globalThis);
