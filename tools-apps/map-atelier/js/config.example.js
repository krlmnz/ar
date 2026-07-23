// ═══════════════════════════════════════════════════════════════
// CONFIG — environment-ish constants. The only file to touch when
// the Mapbox account, style, or default city changes.
//
// Copy this file to config.js and fill in the token. config.js is
// gitignored for the same reason _data/mapbox.local.json is: the
// token is a public `pk.` one that ships to the browser by design,
// but an unrestricted token sitting in a public repo can be lifted
// and billed to this account. See the note at the top of
// _data/mapbox.js.
// ═══════════════════════════════════════════════════════════════
export const MAPBOX_TOKEN = 'pk.your-token-here';
export const MAP_STYLE = 'mapbox://styles/kmunoz/cmpndx2y700jc01sc8vm610ld';

export const DEFAULT_CENTER = [-70.6400, -33.4369]; // Santiago
export const DEFAULT_ZOOM = 12.4;

// The three faces of the app. Each is a real page; they share their
// markup through js/views/stage.js and their wiring through js/views/app.js.
export const EDITOR_PAGE = 'editor.html';
export const PREVIEW_PAGE = 'preview.html';
export const GUEST_PAGE = 'guest.html';
