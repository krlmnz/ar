/* Andean Road — shared map engine.
 *
 * One implementation behind every map layout. Layouts emit a
 * <script type="application/json" id="map-config"> block and call nothing;
 * this file reads it on load and builds the map.
 *
 * Config shape:
 *   { token, style, mapId, mode, features[], route[], fit, zoom, center }
 *   mode: "pins" | "route" | "story"
 *   feature: { id, title, type, category, lng, lat, url, subtitle, meta }
 */
(function () {
  "use strict";

  var cfgEl = document.getElementById("map-config");
  if (!cfgEl || !window.mapboxgl) return;

  var cfg;
  try {
    cfg = JSON.parse(cfgEl.textContent);
  } catch (e) {
    return; // malformed config: leave the page as static content
  }
  if (!cfg.features || !cfg.features.length) return;

  var root = document.getElementById(cfg.mapId || "map");
  if (!root) return;

  // No token (env var missing on the build host) — collapse the map surface
  // rather than leaving a dead grey box. The page's text and its list of places
  // are unaffected; every card link works without JS.
  if (!cfg.token) {
    var shell = root.closest(".mapshell") || root;
    shell.setAttribute("hidden", "");
    document.documentElement.classList.add("no-map");
    return;
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sprites = document.querySelector("[data-map-sprites]");
  var status = document.getElementById("map-status");

  mapboxgl.accessToken = cfg.token;

  var bounds = new mapboxgl.LngLatBounds();
  cfg.features.forEach(function (f) { bounds.extend([f.lng, f.lat]); });

  var opts = {
    container: cfg.mapId || "map",
    style: cfg.style,
    cooperativeGestures: cfg.mode !== "story", // a story map owns its scroll
    attributionControl: true
  };
  if (cfg.mode === "story") {
    opts.center = [cfg.features[0].lng, cfg.features[0].lat];
    opts.zoom = cfg.features[0].zoom || cfg.zoom || 12;
  } else {
    opts.bounds = bounds;
    opts.fitBoundsOptions = { padding: cfg.fit || 64 };
  }

  var map = new mapboxgl.Map(opts);

  // A URL-restricted token used from an origin outside its allow-list — Netlify
  // deploy previews, most often — gets 403 on every tile. mapbox-gl does NOT
  // surface that: no "error" event fires, areTilesLoaded() still reports true,
  // and the canvas just paints nothing. So probe a tile directly and collapse
  // the map ourselves. One small request, only on map pages.
  function collapseMap(reason) {
    var shell = root.closest(".mapshell") || root;
    shell.setAttribute("hidden", "");
    document.documentElement.classList.add("no-map");
    console.warn("[andean-road] Map hidden: " + reason + ". Add " +
      location.hostname + " to the token's URL restrictions in Mapbox, or set a " +
      "separate MAPBOX_TOKEN for this deploy context.");
  }

  fetch("https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/1/0/0.vector.pbf?access_token=" +
        encodeURIComponent(cfg.token), { method: "GET" })
    .then(function (r) {
      if (r.status === 401 || r.status === 403) {
        collapseMap("Mapbox rejected this origin (" + r.status + ")");
      }
    })
    .catch(function () { /* offline or blocked: leave the map as-is */ });

  // Style-level auth failures do raise an error event; keep that path too.
  map.on("error", function (e) {
    var status = e && e.error && e.error.status;
    if (status === 401 || status === 403) collapseMap("Mapbox returned " + status);
  });

  /* ---- markers ------------------------------------------------------- */

  var markers = {};
  var active = null;
  var popup = new mapboxgl.Popup({
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
    markers[f.id] = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat([f.lng, f.lat])
      .addTo(map);
    // mapbox-gl stamps role="img" on the element it takes over, which turns
    // every marker from a control into an image for assistive tech.
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

  if (cfg.mode === "route") {
    // Drawing the route proved fiddly to gate correctly:
    //   - "load" waits for tiles as well as the style and, on the deployed
    //     build, never fired even after areTilesLoaded() was true.
    //   - isStyleLoaded() flickers false while any source is pending, so it
    //     rejects perfectly valid moments to add a layer.
    // What actually matters is whether the style JSON is parsed, so gate on
    // getStyle() and let a failed attempt retry on the next event.
    var routeDrawn = false;

    function drawRoute() {
      if (routeDrawn) return;
      var style;
      try { style = map.getStyle(); } catch (e) { return; }
      if (!style) return;
      if (map.getSource("route")) { routeDrawn = true; return; }

      var line = (cfg.route && cfg.route.length)
        ? cfg.route
        : cfg.features.map(function (f) { return [f.lng, f.lat]; });

      try {
        map.addSource("route", {
          type: "geojson",
          data: { type: "Feature", geometry: { type: "LineString", coordinates: line } }
        });
      } catch (e) {
        return; // style not ready for sources yet — the next event retries
      }

      var css = getComputedStyle(document.documentElement);
      // Casing first, then the line — a bare line disappears over dark basemap
      // features and busy road networks.
      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": css.getPropertyValue("--route-casing").trim() || "rgba(24,23,22,.12)",
          "line-width": 7,
          "line-opacity": 0.9
        }
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": css.getPropertyValue("--route-line").trim() || "#D7561D",
          "line-width": 3,
          // Dashed on purpose: these are straight segments between stops, not
          // driving geometry. A solid road-weight line would assert a road
          // that isn't there. Swap to solid only with real Directions output.
          "line-dasharray": [1.5, 1.5]
        }
      });

      routeDrawn = true;
    }

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

  window.AndeanMap = { map: map, select: select, reset: resetView };
})();
