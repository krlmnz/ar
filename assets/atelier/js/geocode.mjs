// One search path: Photon. Requests share a lane so a burst of clicks
// and keystrokes stays under about two calls a second.

import { GEOCODER } from './config.mjs';

export function normalizePhotonFeature(feature) {
  if (!feature || !feature.geometry) return null;
  const coords = feature.geometry.coordinates || [];
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  const p = feature.properties || {};
  const name = String(p.name || p.street || p.city || '').trim();
  if (!name) return null;
  const bits = [];
  if (p.street && p.street !== name) bits.push(p.street);
  if (p.city && p.city !== name) bits.push(p.city);
  else if (p.state) bits.push(p.state);
  if (p.country) bits.push(p.country);
  return { name, context: bits.join(' · '), lng, lat };
}

let lane = Promise.resolve();
let lastAt = 0;

function enqueue(task) {
  const run = lane.then(async () => {
    const wait = Math.max(0, lastAt + GEOCODER.minGapMs - Date.now());
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastAt = Date.now();
    return task();
  });
  lane = run.then(() => {}, () => {});
  return run;
}

async function readFeatures(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Geocoder responded ' + res.status);
  const data = await res.json();
  return (data.features || []).map(normalizePhotonFeature).filter(Boolean);
}

export function searchPlaces(query, proximity) {
  const q = String(query || '').trim();
  if (q.length < 2) return Promise.resolve([]);
  const url = new URL(GEOCODER.search);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '6');
  if (proximity && Number.isFinite(proximity.lat) && Number.isFinite(proximity.lng)) {
    url.searchParams.set('lat', String(proximity.lat));
    url.searchParams.set('lon', String(proximity.lng));
  }
  return enqueue(() => readFeatures(url));
}

export function reversePlace(lng, lat) {
  const url = new URL(GEOCODER.reverse);
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('lat', String(lat));
  return enqueue(() => readFeatures(url).then((items) => items[0] || null));
}
