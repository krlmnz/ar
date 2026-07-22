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
 *
 * mapbox-gl is loaded lazily: the library and its CSS are injected only when
 * the map container comes within ~600px of the viewport, so pages where the
 * map sits below the fold don't pay ~230 KB up front — and a reader who never
 * scrolls to it never pays at all. The config element carries the GL version
 * (data-gl) and an optional dark basemap (data-style-dark).
 */
(function () {
  "use strict";

  var cfgEl = document.getElementById("map-config");
  if (!cfgEl) return;

  var cfg;
  try {
    cfg = JSON.parse(cfgEl.textContent);
  } catch (e) {
    return; // malformed config: leave the page as static content
  }
  if (!cfg.features || !cfg.features.length) return;

  var root = document.getElementById(cfg.mapId || "map");
  if (!root) return;

  function collapseShell() {
    var shell = root.closest(".mapshell") || root;
    shell.setAttribute("hidden", "");
    document.documentElement.classList.add("no-map");
  }

  // No token (env var missing on the build host) — collapse the map surface
  // rather than leaving a dead grey box. The page's text and its list of places
  // are unaffected; every card link works without JS.
  if (!cfg.token) {
    collapseShell();
    return;
  }

  var GL_VERSION = cfgEl.getAttribute("data-gl") || "v3.9.0";
  var STYLE_DARK = cfgEl.getAttribute("data-style-dark") || "";
  var FALLBACK = { light: "mapbox://styles/mapbox/light-v11", dark: "mapbox://styles/mapbox/dark-v11" };

  function pageTheme() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  /* ---- lazy bootstrap -------------------------------------------------- */

  function loadGL(done) {
    if (window.mapboxgl) { done(); return; }
    var base = "https://api.mapbox.com/mapbox-gl-js/" + GL_VERSION + "/";
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = base + "mapbox-gl.css";
    document.head.appendChild(css);
    var js = document.createElement("script");
    js.src = base + "mapbox-gl.js";
    js.onload = done;
    js.onerror = function () {
      collapseShell();
      console.warn("[andean-road] mapbox-gl failed to load — map hidden.");
    };
    document.head.appendChild(js);
  }

  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    loadGL(init);
  }

  // Above-the-fold maps boot straight away — waiting on an observer there
  // only adds a frame of delay, and IO callbacks don't fire at all in some
  // hidden/backgrounded rendering states. The observer is kept for maps that
  // start genuinely below the fold.
  function nearViewport() {
    var r = root.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    return r.bottom > -600 && r.top < vh + 600;
  }

  if ("IntersectionObserver" in window && !nearViewport()) {
    var pre = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        pre.disconnect();
        boot();
      });
    }, { rootMargin: "600px 0px 600px 0px" });
    pre.observe(root);
  } else {
    boot();
  }

  /* ---- the map itself -------------------------------------------------- */

  function init() {

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sprites = document.querySelector("[data-map-sprites]");
  var status = document.getElementById("map-status");

  // The basemap follows the page theme when a dark style exists. Chrome that
  // must match the basemap (markers, popups, legend) keys off data-map-theme,
  // NOT data-theme — the two differ when no dark basemap is configured.
  var mapTheme = STYLE_DARK ? pageTheme() : "light";
  var usedFallback = false;
  document.documentElement.setAttribute("data-map-theme", mapTheme);

  function styleFor(theme) {
    if (usedFallback) return FALLBACK[theme];
    return theme === "dark" && STYLE_DARK ? STYLE_DARK : cfg.style;
  }

  mapboxgl.accessToken = cfg.token;

  var bounds = new mapboxgl.LngLatBounds();
  cfg.features.forEach(function (f) { bounds.extend([f.lng, f.lat]); });

  var opts = {
    container: cfg.mapId || "map",
    style: styleFor(mapTheme),
    cooperativeGestures: cfg.mode !== "story", // a story map owns its scroll
    attributionControl: true
  };
  if (cfg.mode === "story") {
    opts.center = [cfg.features[0].lng, cfg.features[0].lat];
    opts.zoom = cfg.features[0].zoom || cfg.zoom || 12;
  } else if (cfg.center) {
    // An explicit camera. A place page wants "here, at this zoom" — fitting
    // bounds to one marker gives a degenerate box that mapbox-gl resolves to
    // maxZoom, i.e. a page-filling close-up of a single rooftop. `center` was
    // in this file's documented contract from the start and never read.
    opts.center = cfg.center;
    opts.zoom = cfg.zoom || 13;
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
    collapseShell();
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

  // Style-level failures do raise an error event. Auth errors collapse the
  // map; a missing style (deleted in Studio, typo'd id) falls back to a stock
  // Mapbox style instead — a generic basemap still orients the reader. The 404
  // branch only arms until the style first loads: after that, a 404 is some
  // tile or sprite of a style that plainly exists, not a missing style.
  var styleEverLoaded = false;
  map.on("style.load", function () { styleEverLoaded = true; });
  map.on("error", function (e) {
    var st = e && e.error && e.error.status;
    if (st === 401 || st === 403) {
      collapseMap("Mapbox returned " + st);
    } else if (st === 404 && !styleEverLoaded && !usedFallback) {
      usedFallback = true;
      map.setStyle(FALLBACK[mapTheme]);
      console.warn("[andean-road] Style not found — using a stock Mapbox basemap.");
    }
  });

  /* ---- markers ------------------------------------------------------- */

  var markers = {};
  var active = null;
  var popup = new mapboxgl.Popup({
    offset: 24,
    closeButton: false,
    closeOnClick: false,
    focusAfterOpen: false,   // never steal focus from the list
    className: "map-popup"
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

    // Make the selection shareable. replaceState, not a hash assignment: the
    // reader is browsing a map, and every pin they poke should not become a
    // back-button step out of the page.
    if (cfg.mode === "pins" && window.history && history.replaceState) {
      history.replaceState(null, "", "#" + encodeURIComponent(id));
    }

    if (o.fly !== false) {
      var cam = { center: [f.lng, f.lat], zoom: Math.max(map.getZoom(), f.zoom || 13) };
      if (reduceMotion) map.jumpTo(cam);
      else map.flyTo({ center: cam.center, zoom: cam.zoom, duration: 900 });
    }

    // Pages that render their own detail surface set `popup: false` and listen
    // for andean:select instead. A popup AND a panel would say the same thing
    // twice, with the popup covering the map the panel is describing.
    if (cfg.popup === false) {
      document.dispatchEvent(new CustomEvent("andean:select", { detail: { id: id, feature: f } }));
      announce("Showing " + f.title + " on the map.");
      return;
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
    document.dispatchEvent(new CustomEvent("andean:clear"));
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

  /* ---- theme ----------------------------------------------------------- */

  // The header toggle dispatches "themechange". setStyle wipes every source
  // and layer, so the route (if any) re-arms and redraws on the new style —
  // reading its colours from CSS again, which data-map-theme has now flipped.
  window.addEventListener("themechange", function () {
    if (!STYLE_DARK) return;
    var next = pageTheme();
    if (next === mapTheme) return;
    mapTheme = next;
    document.documentElement.setAttribute("data-map-theme", mapTheme);
    map.setStyle(styleFor(mapTheme));
  });

  /* ---- route line ----------------------------------------------------- */

  if (cfg.mode === "route") {
    // Drawing the route proved fiddly to gate correctly:
    //   - "load" waits for tiles as well as the style and, on the deployed
    //     build, never fired even after areTilesLoaded() was true.
    //   - isStyleLoaded() flickers false while any source is pending, so it
    //     rejects perfectly valid moments to add a layer.
    // What actually matters is whether the style JSON is parsed, so gate on
    // getStyle() and let a failed attempt retry on the next event. Once the
    // route is drawn the polling listeners come OFF — sourcedata and idle
    // fire on every tile load forever, and a no-op on each adds up.
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

    function onRouteEvent() {
      drawRoute();
      if (routeDrawn) {
        map.off("styledata", onRouteEvent);
        map.off("sourcedata", onRouteEvent);
        map.off("idle", onRouteEvent);
      }
    }

    function armRoute() {
      map.on("styledata", onRouteEvent);
      map.on("sourcedata", onRouteEvent);
      map.on("idle", onRouteEvent);
      onRouteEvent();
    }

    armRoute();
    // A style swap (theme toggle, 404 fallback) wipes the route — re-arm.
    map.on("style.load", function () {
      routeDrawn = false;
      armRoute();
    });
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

  /* ---- filtering ------------------------------------------------------- */

  // Chips declare what they filter on: data-map-filter="region" plus
  // data-filter-value="santiago" (empty value = show everything). Hiding is
  // done on the marker element and the matching card, then the camera re-fits
  // to what survives — a filter that leaves the view over an empty stretch of
  // ocean reads as a broken map rather than an empty result.
  var chips = document.querySelectorAll("[data-map-filter]");
  if (chips.length) {
    var applyFilter = function (key, value) {
      var visible = new mapboxgl.LngLatBounds();
      var count = 0;

      cfg.features.forEach(function (f) {
        var hit = !value || String(f[key] || "") === value;
        var mk = markers[f.id];
        if (mk) mk.getElement().style.display = hit ? "" : "none";
        var card = document.querySelector('[data-feature="' + f.id + '"]');
        if (card) card.hidden = !hit;
        if (hit) { visible.extend([f.lng, f.lat]); count++; }
      });

      chips.forEach(function (c) {
        var on = c.getAttribute("data-map-filter") === key &&
                 (c.getAttribute("data-filter-value") || "") === value;
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });

      var tally = document.getElementById("map-count");
      if (tally) tally.textContent = count + (count === 1 ? " place" : " places");

      if (count) {
        clearSelection();
        map.fitBounds(visible, { padding: cfg.fit || 64, maxZoom: 14, duration: reduceMotion ? 0 : 700 });
      }
      announce(count ? count + " places shown." : "No places match.");
    };

    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        applyFilter(c.getAttribute("data-map-filter"), c.getAttribute("data-filter-value") || "");
      });
    });
  }

  /* ---- deep link ------------------------------------------------------- */

  // /map/#<slug> opens with that place selected, so a place page can say
  // "see it on the area map" and land the reader on the right pin instead of
  // a country-wide view they have to hunt through. Selecting also writes the
  // hash back, which makes any selection a shareable URL.
  if (cfg.mode === "pins") {
    var fromHash = function () {
      var id = decodeURIComponent((location.hash || "").slice(1));
      if (id && cfg.features.some(function (f) { return f.id === id; })) {
        select(id, { scrollCard: true });
        var f = cfg.features.filter(function (x) { return x.id === id; })[0];
        map.flyTo({ center: [f.lng, f.lat], zoom: 14, duration: reduceMotion ? 0 : 900 });
      }
    };
    map.on("load", fromHash);
    window.addEventListener("hashchange", fromHash);
  }

  window.AndeanMap = { map: map, select: select, reset: resetView };

  } // init
})();
