// ═══════════════════════════════════════════════════════════════
// SHARE CODEC — a whole map folded into a URL hash (#v=…), so a
// published map needs no backend at all. decode returns a fresh
// state doc; the guest page never touches the projects store.
// ═══════════════════════════════════════════════════════════════
import { defaultState } from './state.js';
import { GUEST_PAGE } from '../config.js';

function b64e(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function b64d(s) { s = s.replace(/-/g,'+').replace(/_/g,'/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }

export function encodeShare(state) {
  const payload = {
    t: state.title, d: state.desc, pal: state.paletteName, a: state.accent, k: state.ink,
    c: state.colors, pt: state.patterns, sy: state.styles || {}, ly: state.layers || [],
    p: state.places.map(p => [p.name, p.note, +p.lng.toFixed(5), +p.lat.toFixed(5), p.icon, p.color || '']),
    cam: [+state.camera.center[0].toFixed(4), +state.camera.center[1].toFixed(4), +state.camera.zoom.toFixed(2)],
  };
  return b64e(JSON.stringify(payload));
}

export function decodeShare(hash) {
  const payload = JSON.parse(b64d(hash));
  const st = defaultState();
  st.title = payload.t || 'Untitled map';
  st.desc = payload.d || '';
  st.paletteName = payload.pal || st.paletteName;
  st.accent = payload.a || st.accent;
  st.ink = payload.k || st.ink;
  st.colors = payload.c || st.colors;
  st.patterns = payload.pt || st.patterns;
  st.styles = payload.sy || {};
  // a link published before the stack existed decodes to the default order
  if (Array.isArray(payload.ly) && payload.ly.length) st.layers = payload.ly;
  st.places = (payload.p || []).map((arr, i) => ({
    id: i + 1, name: arr[0], note: arr[1], lng: arr[2], lat: arr[3], icon: arr[4] || 'heart', color: arr[5] || '',
  }));
  if (payload.cam) st.camera = { center: [payload.cam[0], payload.cam[1]], zoom: payload.cam[2] };
  return st;
}

// A share link always points at the guest page, whichever page built it.
// Resolved against the current directory so the app stays portable to a
// subfolder deploy.
export function buildShareURL(state) {
  return new URL(GUEST_PAGE, location.href).href + '#v=' + encodeShare(state);
}
