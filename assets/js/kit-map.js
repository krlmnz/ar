/* Quiet MapLibre embed. The script itself is tiny and always available.
   MapLibre and kit-map-style.js load only after a .map-viewport exists.
   Camera is the shared quiet field. Map Editor owns anything behind mapId. */
(function () {
  var MAPLIBRE = 'https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.js';
  var MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.css';
  var STYLE = '/assets/js/kit-map-style.js';
  var CENTER = [-71.939, -39.42];
  var ZOOM = 11;
  var loading = null;
  var maps = [];

  function ensure() {
    if (window.maplibregl && window.KitMapStyle) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      if (!document.querySelector('link[data-kit-maplibre]')) {
        var css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = MAPLIBRE_CSS;
        css.setAttribute('data-kit-maplibre', '');
        document.head.appendChild(css);
      }
      function afterLibre() {
        if (window.KitMapStyle) {
          resolve();
          return;
        }
        var style = document.createElement('script');
        style.src = STYLE;
        style.onload = function () { resolve(); };
        style.onerror = function () { reject(new Error('Could not load the map style.')); };
        document.head.appendChild(style);
      }
      if (window.maplibregl) afterLibre();
      else {
        var loader = document.createElement('script');
        loader.src = MAPLIBRE;
        loader.onload = afterLibre;
        loader.onerror = function () { reject(new Error('Could not load MapLibre.')); };
        document.head.appendChild(loader);
      }
    });
    return loading;
  }

  function paint(map) {
    if (!window.KitMapStyle) return;
    if (!map.isStyleLoaded()) {
      map.once('idle', function () { paint(map); });
      return;
    }
    window.KitMapStyle.paint(map);
  }

  function mount(canvas) {
    if (!canvas || canvas.dataset.mapMounted === 'true') return;
    canvas.dataset.mapMounted = 'pending';
    ensure().then(function () {
      if (canvas.dataset.mapMounted === 'true') return;
      var map = new window.maplibregl.Map({
        container: canvas,
        style: window.KitMapStyle.build(),
        center: CENTER,
        zoom: ZOOM,
        attributionControl: { compact: false },
        cooperativeGestures: true
      });
      canvas.dataset.mapMounted = 'true';
      maps.push({ canvas: canvas, map: map });
      map.on('load', function () { paint(map); });
    }).catch(function () {
      canvas.dataset.mapMounted = '';
    });
  }

  function unmount(canvas) {
    maps = maps.filter(function (entry) {
      if (entry.canvas !== canvas) return true;
      entry.map.remove();
      return false;
    });
    if (canvas) delete canvas.dataset.mapMounted;
  }

  function resize(canvas) {
    maps.forEach(function (entry) {
      if (entry.canvas === canvas) entry.map.resize();
    });
  }

  function scan(root) {
    var scope = root || document;
    if (!scope.querySelector('.map-viewport')) return;
    scope.querySelectorAll('.map-viewport__canvas').forEach(mount);
  }

  new MutationObserver(function () {
    maps.forEach(function (entry) { paint(entry.map); });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  window.AndeanKitMap = { mount: mount, unmount: unmount, resize: resize, scan: scan };
  scan(document);
})();
