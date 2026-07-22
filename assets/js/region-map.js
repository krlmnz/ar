/* ══════════════════════════════════════════════════════════════════════════
   region-map.js — the two-panel area explorer on /regions/<slug>/.

   The map engine (andean-map.js) owns the map, the markers and the flying.
   This owns the two panels beside it: the region overview, and the detail for
   whichever place is selected. They talk through the engine's andean:select /
   andean:clear events, so this file never touches mapbox-gl.

   Everything it shows is already in the HTML — every place's write-up is
   rendered at build time and hidden. No fetching, and it degrades to a plain
   list of readable sections with JS off.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var root = document.querySelector("[data-regionmap]");
  if (!root) return;

  var overview = root.querySelector("[data-region-overview]");
  var detail = root.querySelector("[data-region-detail]");
  var closeBtn = root.querySelector("[data-region-close]");
  var toggle = root.querySelector("[data-region-toggle]");
  var list = root.querySelector(".regionpanel__list");
  var details = root.querySelectorAll("[data-detail]");

  if (!detail) return;

  // With JS running, the detail sections stop being a plain stack of articles
  // and become one panel showing one place at a time.
  root.classList.add("js-regionmap");

  var lastFocus = null;

  function show(slug) {
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

    // Only steal focus on small screens, where the panel covers the map and a
    // reader who tapped a pin would otherwise be left scrolled somewhere else.
    if (window.matchMedia("(max-width: 900px)").matches) {
      lastFocus = document.activeElement;
      closeBtn.focus();
    }
  }

  function hide() {
    detail.hidden = true;
    root.classList.remove("is-detail");
    details.forEach(function (d) { d.hidden = true; });
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
    // Clear the map's selection too, so the pin stops looking active while its
    // panel is gone. reset() is the engine's own clear-and-refit.
    if (window.AndeanMap && window.AndeanMap.reset) window.AndeanMap.reset();
  }

  document.addEventListener("andean:select", function (e) {
    if (e.detail && e.detail.id) show(e.detail.id);
  });

  // andean:clear fires from resetView() as well, which hide() calls — guarding
  // on the class keeps that from bouncing back and forth.
  document.addEventListener("andean:clear", function () {
    if (root.classList.contains("is-detail")) {
      detail.hidden = true;
      root.classList.remove("is-detail");
      details.forEach(function (d) { d.hidden = true; });
    }
  });

  closeBtn && closeBtn.addEventListener("click", hide);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !detail.hidden) hide();
  });

  // The place list collapses so the map can be seen behind the panel. Starts
  // open, because a list nobody notices is a list nobody uses.
  if (toggle && list) {
    toggle.addEventListener("click", function () {
      var open = list.classList.toggle("is-collapsed") === false;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "Hide the places" : "Show the places";
    });
  }
})();
