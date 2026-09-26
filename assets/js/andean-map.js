/* Andean Road — shared map engine.
 *
 * One implementation behind every map layout. Layouts emit a
 * <script type="application/json" id="map-config"> block and call nothing;
 * this file reads it on load and builds the map.
 *
 * The GL library (Mapbox or MapLibre) is chosen by cfg.vendor and reached
 * only through AndeanMapRuntime. Overlay layers come from cfg.overlays,
 * which the build copies out of lib/map-stack.js.
 *
 * Config shape:
 *   { vendor, token, style, styleId, requiresToken, mapId, mode,
 *     features[], route[], fit, zoom, center, overlays, attributionCompact }
 *   mode: "pins" | "route" | "story"
 *   feature: { id, title, type, category, lng, lat, url, subtitle, meta }
 */
(function () {
  "use strict";

  var cfgEl = document.getElementById("map-config");
  if (!cfgEl || !window.AndeanMapRuntime) return;

  var cfg;
  try {
    cfg = JSON.parse(cfgEl.textContent);
  } catch (e) {
    return; // malformed config: leave the page as static content
  }
  if (!cfg.features || !cfg.features.length) return;

  var root = document.getElementById(cfg.mapId || "map");
  if (!root) return;

  var vendor = cfg.vendor || (String(cfg.style || "").indexOf("mapbox://") === 0 ? "mapbox" : "maplibre");
  var needsToken = cfg.requiresToken != null ? !!cfg.requiresToken : vendor !== "maplibre";

  // No token (env var missing on the build host) — collapse the map surface
  // rather than leaving a dead grey box. The page's text and its list of places
  // are unaffected; every card link works without JS. MapLibre styles in the
  // catalog do not require a token, so they skip this.
  if (needsToken && !cfg.token) {
    var shell = root.closest(".mapshell") || root;
    shell.setAttribute("hidden", "");
    document.documentElement.classList.add("no-map");
    return;
  }

  var session = AndeanMapRuntime.createSession(vendor, cfg.token);
  if (!session) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sprites = document.querySelector("[data-map-sprites]");
  var status = document.getElementById("map-status");

  var bounds = session.bounds();
  cfg.features.forEach(function (f) { bounds.extend([f.lng, f.lat]); });

  var opts = {
    container: cfg.mapId || "map",
    style: cfg.style,
    cooperativeGestures: cfg.mode !== "story", // a story map owns its scroll
    attributionControl: false
  };
  if (cfg.mode === "story") {
    opts.center = [cfg.features[0].lng, cfg.features[0].lat];
    opts.zoom = cfg.features[0].zoom || cfg.zoom || 12;
  } else {
    opts.bounds = bounds;
    opts.fitBoundsOptions = { padding: cfg.fit || 64 };
  }

  var map = session.map(opts);
  var attribOpts = {};
  if (cfg.attributionCompact === false) attribOpts.compact = false;
  map.addControl(session.attribution(attribOpts), "bottom-right");

  // A URL-restricted token used from an origin outside its allow-list — Netlify
  // deploy previews, most often — gets 403 on every tile. mapbox-gl does NOT
  // surface that: no "error" event fires, areTilesLoaded() still reports true,
  // and the canvas just paints nothing. So probe a tile directly and collapse
  // the map ourselves. One small request, only on Mapbox pages.
  function collapseMap(reason) {
    var shell = root.closest(".mapshell") || root;
    shell.setAttribute("hidden", "");
    document.documentElement.classList.add("no-map");
    console.warn("[andean-road] Map hidden: " + reason + ". Add " +
      location.hostname + " to the token's URL restrictions in Mapbox, or set a " +
      "separate MAPBOX_TOKEN for this deploy context.");
  }

  if (vendor === "mapbox" && cfg.token) {
    AndeanMapRuntime.probeMapboxToken(cfg.token, function (statusCode) {
      collapseMap("Mapbox rejected this origin (" + statusCode + ")");
    });
  }

  // Style-level auth failures do raise an error event; keep that path too.
  map.on("error", function (e) {
    var code = e && e.error && e.error.status;
    if (vendor === "mapbox" && (code === 401 || code === 403)) {
      collapseMap("Mapbox returned " + code);
    }
  });

  /* ---- markers ------------------------------------------------------- */

  var markers = {};
  var active = null;
  var popup = session.popup({
    offset: 24,
    closeButton: false,
    closeOnClick: false,
    focusAfterOpen: false,   // never steal focus from the list
    className: "mappopup"
  });

  function sprite(type) {
    if (!sprites) return null;
    var node = sprites.querySelector('[data-sprite="' + type + '"]') ||
               sprites.querySelector('[data-sprite="_default"]');
    return node ? node.firstElementChild.cloneNode(true) : null;
  }

  function buildMarker(f, index) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = "mk";
    if (f.category) el.setAttribute("data-cat", f.category);
    el.setAttribute("aria-label", f.title);

    // On a route the sequence IS the information, so the marker carries the
    // stop number and pairs with the numbered itinerary. A type icon here
    // would say what a stop is while hiding when you get there.
    if (cfg.mode === "route") {
      el.classList.add("mk--seq");
      el.setAttribute("aria-label", "Stop " + (index + 1) + ": " + f.title);
      var n = document.createElement("span");
      n.className = "mk__num";
      n.textContent = String(index + 1);
      el.appendChild(n);
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        select(f.id, { scrollCard: true });
      });
      return el;
    }

    var glyph = sprite(f.type);
    if (glyph) {
      var wrap = document.createElement("span");
      wrap.className = "mk__icon";
      wrap.appendChild(glyph);
      el.appendChild(wrap);
    } else {
      el.classList.add("mk--dot");
    }

    el.addEventListener("click", function (e) {
      e.stopPropagation();          // don't let the map clear the selection
      select(f.id, { scrollCard: true });
    });
    return el;
  }

  function announce(text) {
    if (status) status.textContent = text;
  }

  function select(id, o) {
    o = o || {};
    if (active === id) return;

    var f = cfg.features.filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    active = id;

    Object.keys(markers).forEach(function (k) {
      markers[k].getElement().classList.toggle("mk--active", k === id);
    });

    var prev = document.querySelector(".is-active[data-feature]");
    if (prev) prev.classList.remove("is-active");
    var card = document.querySelector('[data-feature="' + id + '"]');
    if (card) {
      card.classList.add("is-active");
      if (o.scrollCard) {
        card.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "nearest",
          inline: "center"
        });
      }
    }
    document.querySelectorAll("[data-goto]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-goto") === id ? "true" : "false");
    });

    if (o.fly !== false) {
      var cam = { center: [f.lng, f.lat], zoom: Math.max(map.getZoom(), f.zoom || 13) };
      if (reduceMotion) map.jumpTo(cam);
      else map.flyTo({ center: cam.center, zoom: cam.zoom, duration: 900 });
    }

    // Built as DOM, never as an HTML string — titles are author-supplied.
    var body = document.createElement("div");
    if (f.type) {
      var o1 = document.createElement("span");
      o1.className = "map-popup__overline";
      o1.textContent = String(f.type).replace(/-/g, " ");
      body.appendChild(o1);
    }
    var t = document.createElement(f.url ? "a" : "span");
    t.className = "map-popup__title";
    if (f.url) t.href = f.url;
    t.textContent = f.title;
    body.appendChild(t);
    if (f.subtitle) {
      var s = document.createElement("span");
      s.className = "map-popup__sub";
      s.textContent = f.subtitle;
      body.appendChild(s);
    }
    popup.setLngLat([f.lng, f.lat]).setDOMContent(body).addTo(map);

    announce("Showing " + f.title + " on the map.");
  }

  function clearSelection() {
    active = null;
    popup.remove();
    Object.keys(markers).forEach(function (k) {
      markers[k].getElement().classList.remove("mk--active");
    });
    var prev = document.querySelector(".is-active[data-feature]");
    if (prev) prev.classList.remove("is-active");
    document.querySelectorAll("[data-goto]").forEach(function (b) {
      b.setAttribute("aria-pressed", "false");
    });
  }

  function resetView() {
    clearSelection();
    map.fitBounds(bounds, { padding: cfg.fit || 64, duration: reduceMotion ? 0 : 700 });
    announce("Map reset.");
  }

  cfg.features.forEach(function (f, i) {
    var el = buildMarker(f, i);
    markers[f.id] = session.marker({ element: el, anchor: "center" })
      .setLngLat([f.lng, f.lat])
      .addTo(map);
    // Both GL libraries stamp role="img" on the element they take over, which
    // turns every marker from a control into an image for assistive tech.
    el.setAttribute("role", "button");
  });

  map.on("click", clearSelection);

  document.querySelectorAll("[data-goto]").forEach(function (b) {
    b.addEventListener("click", function () { select(b.getAttribute("data-goto")); });
  });
  document.querySelectorAll("[data-map-reset]").forEach(function (b) {
    b.addEventListener("click", resetView);
  });
  document.querySelectorAll("[data-map-zoom]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.getAttribute("data-map-zoom") === "in") map.zoomIn();
      else map.zoomOut();
    });
  });

  /* ---- route line ----------------------------------------------------- */

  // User paint/visibility from the atelier bench. CSS tokens are applied at
  // draw time and do not stick here, so a bench override wins over --route-line
  // without becoming the new default for the next page.
  var userOverlay = { paint: {}, hidden: {} };
  var appliedRev = -1;
  var overlayRev = 0;

  function cssPaint() {
    var paint = {};
    var overlay = cfg.overlays && cfg.overlays.route;
    if (!overlay || !overlay.layers) return paint;
    var css = getComputedStyle(document.documentElement);
    var casing = (css.getPropertyValue("--route-casing") || "").trim();
    var stroke = (css.getPropertyValue("--route-line") || "").trim();
    overlay.layers.forEach(function (layer) {
      var fromCss = {};
      if (layer.role === "casing" && casing) fromCss["line-color"] = casing;
      if (layer.role === "stroke" && stroke) fromCss["line-color"] = stroke;
      var user = userOverlay.paint[layer.id] || {};
      if (Object.keys(fromCss).length || Object.keys(user).length) {
        paint[layer.id] = Object.assign(fromCss, user);
      }
    });
    return paint;
  }

  function drawRoute() {
    if (cfg.mode !== "route") return;
    var overlay = cfg.overlays && cfg.overlays.route;
    if (!overlay) return;

    // setStyle() drops sources. A successful earlier draw must not block the
    // redraw, and isStyleLoaded() flickers while tiles are pending — gate on
    // the source actually existing. The runtime returns false until the
    // style JSON is parsed; the next event retries.
    var sourceThere = false;
    try { sourceThere = !!map.getSource(overlay.sourceId); } catch (e) { return; }
    if (appliedRev === overlayRev && sourceThere) return;

    var line = (cfg.route && cfg.route.length)
      ? cfg.route
      : cfg.features.map(function (f) { return [f.lng, f.lat]; });

    var ok = AndeanMapRuntime.syncLineOverlay(map, overlay, line, {
      paint: cssPaint(),
      hidden: userOverlay.hidden
    });
    if (!ok) return;
    try {
      if (map.getSource(overlay.sourceId)) appliedRev = overlayRev;
    } catch (e) { /* next event retries */ }
  }

  function invalidateOverlay() {
    overlayRev += 1;
    appliedRev = -1;
    drawRoute();
  }

  function setOverlayPaint(layerId, prop, value) {
    if (!layerId || !prop) return;
    userOverlay.paint[layerId] = userOverlay.paint[layerId] || {};
    userOverlay.paint[layerId][prop] = value;
    invalidateOverlay();
  }

  function setOverlayVisible(layerId, visible) {
    if (!layerId) return;
    if (visible) delete userOverlay.hidden[layerId];
    else userOverlay.hidden[layerId] = true;
    invalidateOverlay();
  }

  function setBasemap(styleUrl) {
    if (!styleUrl) return;
    if (vendor === "maplibre" && String(styleUrl).indexOf("mapbox://") === 0) {
      console.warn("[andean-road] MapLibre cannot load a mapbox:// style.");
      return;
    }
    appliedRev = -1;
    map.setStyle(styleUrl);
  }

  if (cfg.mode === "route") {
    drawRoute();
    map.on("style.load", drawRoute);
    map.on("styledata", drawRoute);
    map.on("sourcedata", drawRoute);
    map.on("idle", drawRoute);
  }

  /* ---- scrollytelling -------------------------------------------------- */

  if (cfg.mode === "story") {
    var steps = Array.prototype.slice.call(document.querySelectorAll("[data-story-step]"));

    if (steps.length) {
      var goTo = function (id) {
        var f = cfg.features.filter(function (x) { return x.id === id; })[0];
        if (!f) return;
        Object.keys(markers).forEach(function (k) {
          markers[k].getElement().classList.toggle("mk--active", k === id);
        });
        var cam = {
          center: [f.lng, f.lat],
          zoom: f.zoom || 12,
          pitch: f.pitch || 0,
          bearing: f.bearing || 0
        };
        if (reduceMotion) {
          map.jumpTo(cam);
        } else {
          // The step card occupies the left of the stage, so push the target
          // right or the active marker sits underneath its own card.
          var dx = window.innerWidth >= 900 ? Math.min(280, window.innerWidth * 0.22) : 0;
          map.flyTo(Object.assign({ duration: 1600, offset: [dx, 0] }, cam));
        }
        announce(f.title);
      };

      // rootMargin pins the trigger to the vertical middle of the viewport, so a
      // step activates when it is being read — not when it first peeks in.
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          steps.forEach(function (s) { s.classList.remove("is-active"); });
          entry.target.classList.add("is-active");
          goTo(entry.target.getAttribute("data-story-step"));
        });
      }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });

      // Dimming is opt-in: without JS every card stays fully legible.
      document.documentElement.classList.add("js-story");
      steps.forEach(function (s) { io.observe(s); });
      if (!document.querySelector(".storystep.is-active")) {
        steps[0].classList.add("is-active");
      }

      // Without JS or IO the steps are still readable prose; nothing is hidden
      // by CSS that JS has to reveal.
    }
  }

  window.AndeanMap = {
    map: map,
    select: select,
    reset: resetView,
    setBasemap: setBasemap,
    setOverlayPaint: setOverlayPaint,
    setOverlayVisible: setOverlayVisible
  };
})();
