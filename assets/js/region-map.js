/* ══════════════════════════════════════════════════════════════════════════
   region-map.js — the detail panel on /regions/<slug>/.

   The map engine (andean-map.js) owns the map, the markers, the cards and the
   flying — the region directory uses the same .mapsplit/.mapcard machinery as
   /map/, so all of that is already wired. This file adds the one thing a
   region page has that /map/ does not: a panel that shows a place's whole
   write-up without leaving the map.

   It talks to the engine only through the andean:select / andean:clear events
   that `popup: false` turns on, and never touches mapbox-gl.

   Every write-up is already in the HTML, rendered at build time and hidden.
   Nothing is fetched, and with JS off the page is a readable stack of sections.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var root = document.querySelector("[data-regionmap]");
  if (!root) return;

  var detail = root.querySelector("[data-region-detail]");
  if (!detail) return;

  var closeBtn = root.querySelector("[data-region-close]");
  var details = root.querySelectorAll("[data-detail]");

  // Until this class lands, the detail sections are a plain stack under the
  // map. The CSS keys the panel behaviour off it, so no-JS gets prose.
  root.classList.add("js-regionmap");

  var lastFocus = null;
  var narrow = function () { return window.matchMedia("(max-width: 900px)").matches; };

  function open(slug) {
    var found = false;
    details.forEach(function (d) {
      var hit = d.getAttribute("data-detail") === slug;
      d.hidden = !hit;
      if (hit) found = true;
    });
    if (!found) return;

    detail.hidden = false;
    detail.scrollTop = 0;
    root.classList.add("is-detail");

    // On narrow screens the panel covers the page, so it has to take focus or
    // a keyboard reader is left behind it with no way to the close button.
    if (narrow()) {
      lastFocus = document.activeElement;
      if (closeBtn) closeBtn.focus();
    }
  }

  // Just the DOM half — used by both the close button and andean:clear, so
  // neither can bounce off the other.
  function collapse() {
    detail.hidden = true;
    root.classList.remove("is-detail");
    details.forEach(function (d) { d.hidden = true; });
  }

  function close() {
    var wasOpen = !detail.hidden;
    collapse();
    if (wasOpen && lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
    // Closing means "show me the whole region again", which is exactly what
    // the engine's reset does — clear the selection and re-fit the bounds.
    if (window.AndeanMap && window.AndeanMap.reset) window.AndeanMap.reset();
  }

  document.addEventListener("andean:select", function (e) {
    if (e.detail && e.detail.id) open(e.detail.id);
  });

  // Fires when the reader clicks bare map, and from reset() — which close()
  // calls. collapse() is idempotent, so the second pass is a no-op.
  document.addEventListener("andean:clear", collapse);

  if (closeBtn) closeBtn.addEventListener("click", close);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !detail.hidden) close();
  });
})();
