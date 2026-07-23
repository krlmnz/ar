// ═══════════════════════════════════════════════════════════════
// APP BOOT — the one place that knows which features make a map.
//
// editor.html, preview.html and guest.html are three faces of the
// same application. Rather than each page repeating the feature
// manifest, they await boot() and then do only their own routing.
//
// The imports are dynamic on purpose. features/map.js constructs the
// Mapbox instance at module scope against `#mapbox`, and that element
// arrives with the shared stage — so the stage has to be in the
// document before any feature module is evaluated. Static imports
// hoist above mountStage() and would hand Mapbox a missing container.
// ═══════════════════════════════════════════════════════════════
import { mountStage } from './stage.js';

// The viewer set is what it takes to *render* a map. The editor adds the
// three features that only make sense with a rail to hang them off:
// places, new-map creation and publishing. Keeping the split here rather
// than as element-presence guards inside each feature means preview.html
// and guest.html simply never load editor wiring.
const VIEWER = [
  '../features/map.js',
  '../features/patterns-engine.js',
  '../features/markers.js',
  '../features/design.js',
  '../features/color-library.js',
  '../features/chrome.js',
  '../features/guest.js',
  '../features/legend.js',
];
const EDITOR_ONLY = [
  '../features/places.js',
  '../features/start.js',
  '../features/share.js',
];

export async function boot({ editor = false } = {}) {
  mountStage();
  const paths = editor ? [...VIEWER, ...EDITOR_ONLY] : VIEWER;

  // Load in sequence: features are order-independent once initialized, but
  // map.js must evaluate first so the rest can import its `map` binding.
  const modules = [];
  for (const p of paths) modules.push(await import(p));

  modules.forEach(m => m.init());
  return { mapFeature: modules[0] };
}
