/* Map Atelier bench. Talks to AndeanMap, which talks to the runtime.
   Layer ids are read back off the catalog spec (role: casing | stroke).
   This file does not name Mapbox, mapbox://, or a layer id. */
(function () {
  "use strict";

  var cfgEl = document.getElementById("map-config");
  var status = document.getElementById("map-status");
  var fallback = document.getElementById("atelier-fallback");

  function say(text) {
    if (status) status.textContent = text;
  }

  if (!cfgEl || !window.AndeanMap) {
    if (fallback) fallback.hidden = false;
    say("The map could not start. The stop list is still available.");
    return;
  }

  var cfg;
  try {
    cfg = JSON.parse(cfgEl.textContent);
  } catch (e) {
    if (fallback) fallback.hidden = false;
    return;
  }

  var shell = document.querySelector(".mapshell");
  if (shell) shell.setAttribute("data-tone", cfg.tone || "light");

  function layerByRole(role) {
    var overlay = cfg.overlays && cfg.overlays.route;
    if (!overlay || !overlay.layers) return null;
    var found = overlay.layers.filter(function (layer) { return layer.role === role; })[0];
    return found || null;
  }

  document.querySelectorAll('input[name="basemap"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      var entry = (cfg.styles || []).filter(function (style) {
        return style.id === input.value;
      })[0];
      if (!entry) return;
      var shell = document.querySelector(".mapshell");
      if (shell) shell.setAttribute("data-tone", entry.tone || "light");
      AndeanMap.setBasemap(entry.style);
      say("Basemap is " + entry.label + ".");
    });
  });

  document.querySelectorAll("[data-overlay-role]").forEach(function (input) {
    input.addEventListener("change", function () {
      var layer = layerByRole(input.getAttribute("data-overlay-role"));
      if (!layer) return;
      AndeanMap.setOverlayVisible(layer.id, input.checked);
      var label = input.getAttribute("data-label") || "layer";
      say((input.checked ? "Showing " : "Hiding ") + label + ".");
    });
  });

  document.querySelectorAll('input[name="ink"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      var layer = layerByRole("stroke");
      if (!layer) return;
      AndeanMap.setOverlayPaint(layer.id, "line-color", input.value);
      say("Route ink is " + (input.getAttribute("data-label") || "updated") + ".");
    });
  });

  var weight = document.getElementById("stroke-weight");
  var weightOut = document.getElementById("stroke-weight-value");
  if (weight) {
    var applyWeight = function () {
      if (weightOut) weightOut.textContent = weight.value;
      var layer = layerByRole("stroke");
      if (!layer) return;
      AndeanMap.setOverlayPaint(layer.id, "line-width", Number(weight.value));
    };
    weight.addEventListener("input", applyWeight);
    weight.addEventListener("change", function () {
      applyWeight();
      say("Route weight is " + weight.value + ".");
    });
  }
})();
