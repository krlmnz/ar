// Share codec. A map is a URL hash (#v=…) on the guest page. No backend.
// Payload is JSON, UTF-8, base64url. Colors travel with the link so a
// renamed palette still paints the map that was shared.

import { GUEST_PATH } from './config.mjs';
import { paletteByName } from './palettes.mjs';

function bytesToB64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlToBytes(s) {
  let pad = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  while (pad.length % 4) pad += '=';
  const bin = atob(pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeShare(state) {
  const center = state.camera.center;
  const payload = {
    v: 1,
    t: state.title || '',
    d: state.desc || '',
    pal: state.paletteName,
    c: state.colors,
    ink: state.ink,
    p: (state.places || []).map((p) => [
      p.name || '',
      p.note || '',
      +Number(p.lng).toFixed(5),
      +Number(p.lat).toFixed(5),
    ]),
    cam: [+Number(center[0]).toFixed(4), +Number(center[1]).toFixed(4), +Number(state.camera.zoom).toFixed(2)],
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return bytesToB64url(bytes);
}

export function decodeShare(hash) {
  const json = new TextDecoder().decode(b64urlToBytes(hash));
  const payload = JSON.parse(json);
  const known = paletteByName(payload.pal);
  const named = payload.pal && known.name === payload.pal;
  const colors = payload.c && payload.c.land ? payload.c : known.colors;
  const places = (payload.p || []).map((row, i) => ({
    id: i + 1,
    name: String(row[0] || ''),
    note: String(row[1] || ''),
    lng: Number(row[2]),
    lat: Number(row[3]),
    pendingName: false,
  })).filter((p) => Number.isFinite(p.lng) && Number.isFinite(p.lat));
  const cam = payload.cam;
  const center = cam && [Number(cam[0]), Number(cam[1])];
  const zoom = cam && Number(cam[2]);
  const camera = center && center.every(Number.isFinite) && Number.isFinite(zoom)
    ? { center, zoom }
    : null;
  return {
    title: payload.t || '',
    desc: payload.d || '',
    paletteName: named ? known.name : (payload.pal || known.name),
    colors: { ...colors },
    ink: payload.ink || known.ink,
    places,
    camera,
  };
}

export function guestURL(state, origin) {
  const url = new URL(GUEST_PATH, origin || 'https://andean-road.com');
  url.hash = 'v=' + encodeShare(state);
  return url.href;
}

export function embedSnippet(state, origin) {
  const src = guestURL(state, origin);
  const title = String(state.title || 'Map').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return '<iframe title="' + title + '" src="' + src + '" style="width:100%;height:480px;border:0;" loading="lazy"></iframe>';
}
