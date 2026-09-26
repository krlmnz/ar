/* GL adapter. Pages talk to this, not to mapboxgl or maplibregl directly.
 *
 * The two libraries still share the surface this site uses (Map, Marker,
 * Popup, LngLatBounds, GeoJSON sources, paint/layout). What they do not
 * share — accessToken, the mapbox:// protocol, the CSS prefix, the tile
 * probe — stays in here.
 */
(function (global) {
  "use strict";

  function gl(vendor) {
    if (vendor === "maplibre") return global.maplibregl || null;
    if (vendor === "mapbox") return global.mapboxgl || null;
    return null;
  }

  function createSession(vendor, token) {
    var ns = gl(vendor);
    if (!ns) return null;
    if (vendor === "mapbox" && token) ns.accessToken = token;
    return {
      vendor: vendor,
      gl: ns,
      prefix: vendor === "maplibre" ? "maplibregl" : "mapboxgl",
      bounds: function () { return new ns.LngLatBounds(); },
      popup: function (opts) { return new ns.Popup(opts); },
      marker: function (opts) { return new ns.Marker(opts); },
      map: function (opts) { return new ns.Map(opts); },
      attribution: function (opts) { return new ns.AttributionControl(opts || {}); }
    };
  }

  function styleReady(map) {
    try {
      return !!map.getStyle();
    } catch (e) {
      return false;
    }
  }

  function readSource(map, id) {
    try { return map.getSource(id); } catch (e) { return null; }
  }

  function readLayer(map, id) {
    try { return map.getLayer(id); } catch (e) { return null; }
  }

  /**
   * Upsert one GeoJSON line overlay from a catalog spec.
   * state.paint[layerId] overrides spec paint keys (css tokens, then the bench).
   * state.hidden[layerId] sets layout visibility to "none".
   * Returns false when the style is not ready so the caller can retry.
   */
  function syncLineOverlay(map, overlay, coordinates, state) {
    if (!map || !overlay || !overlay.sourceId || !overlay.layers || !overlay.layers.length) {
      return false;
    }
    if (!styleReady(map)) return false;

    var data = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: coordinates || [] }
    };

    var source = readSource(map, overlay.sourceId);
    if (!source) {
      try {
        map.addSource(overlay.sourceId, { type: "geojson", data: data });
      } catch (e) {
        return false;
      }
    } else if (typeof source.setData === "function") {
      source.setData(data);
    }

    var paintState = (state && state.paint) || {};
    var hidden = (state && state.hidden) || {};
    var ready = true;

    overlay.layers.forEach(function (layer) {
      var paint = Object.assign({}, layer.paint, paintState[layer.id] || {});
      var layout = Object.assign({}, layer.layout, {
        visibility: hidden[layer.id] ? "none" : "visible"
      });
      var existing = readLayer(map, layer.id);

      if (!existing) {
        try {
          map.addLayer({
            id: layer.id,
            type: layer.type,
            source: overlay.sourceId,
            layout: layout,
            paint: paint
          });
        } catch (e) {
          ready = false;
          return;
        }
      } else {
        Object.keys(paint).forEach(function (key) {
          try { map.setPaintProperty(layer.id, key, paint[key]); }
          catch (e) { ready = false; }
        });
        try { map.setLayoutProperty(layer.id, "visibility", layout.visibility); }
        catch (e) { ready = false; }
      }

      if (!readLayer(map, layer.id)) ready = false;
    });

    return ready && !!readSource(map, overlay.sourceId);
  }

  // A URL-restricted Mapbox token used off its allow-list never fires a map
  // "error" event; the canvas just stays blank. Probe one tile. MapLibre
  // styles in the catalog do not use this.
  function probeMapboxToken(token, onReject) {
    if (!token || typeof global.fetch !== "function") return;
    global.fetch(
      "https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/1/0/0.vector.pbf?access_token=" +
        encodeURIComponent(token),
      { method: "GET" }
    ).then(function (response) {
      if (response.status === 401 || response.status === 403) onReject(response.status);
    }).catch(function () { /* offline or blocked: leave the map as-is */ });
  }

  var api = {
    gl: gl,
    createSession: createSession,
    syncLineOverlay: syncLineOverlay,
    probeMapboxToken: probeMapboxToken
  };

  global.AndeanMapRuntime = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
