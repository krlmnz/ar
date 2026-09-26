import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeShare, decodeShare, embedSnippet, guestURL } from '../assets/atelier/js/codec.mjs';
import { applyGeocodedName, placeLabel } from '../assets/atelier/js/names.mjs';
import { normalizePhotonFeature } from '../assets/atelier/js/geocode.mjs';
import { isDark, darken, luminance } from '../assets/atelier/js/color.mjs';
import { PALETTES } from '../assets/atelier/js/palettes.mjs';

function sample() {
  const pal = PALETTES[1];
  return {
    title: 'Santiago to the sea',
    desc: 'A note about Reñaca',
    paletteName: pal.name,
    colors: { ...pal.colors },
    ink: pal.ink,
    places: [
      { id: 1, name: 'La Chascona', note: 'Go early', lng: -70.63444, lat: -33.43112 },
      { id: 2, name: 'Isla Negra', note: '', lng: -71.69501, lat: -33.4095 },
    ],
    camera: { center: [-71.05, -33.42], zoom: 8.4 },
  };
}

test('share codec round-trips unicode, palette, and places', () => {
  const state = sample();
  const hash = encodeShare(state);
  assert.match(hash, /^[A-Za-z0-9_-]+$/);
  const back = decodeShare(hash);
  assert.equal(back.title, state.title);
  assert.equal(back.desc, state.desc);
  assert.equal(back.paletteName, 'Coastal');
  assert.equal(back.colors.water, state.colors.water);
  assert.equal(back.places.length, 2);
  assert.equal(back.places[0].name, 'La Chascona');
  assert.equal(back.places[0].note, 'Go early');
  assert.equal(back.places[1].pendingName, false);
  assert.ok(Math.abs(back.camera.center[0] + 71.05) < 0.001);
  assert.equal(back.camera.zoom, 8.4);
});

test('guest url and embed snippet point at the read-only page', () => {
  const state = sample();
  const url = guestURL(state, 'https://andean-road.com');
  assert.ok(url.startsWith('https://andean-road.com/atelier/guest/#v='));
  const snippet = embedSnippet(state, 'https://andean-road.com');
  assert.match(snippet, /^<iframe /);
  assert.match(snippet, /src="https:\/\/andean-road.com\/atelier\/guest\/#v=/);
  assert.match(snippet, /title="Santiago to the sea"/);
});

test('click-added places accept a reverse-geocoded name', () => {
  // The old editor stored "New place" and then only wrote the lookup
  // when the name was still "A special place", so click-added pins
  // never received a geocoded name.
  const stale = { name: 'New place', pendingName: false };
  assert.equal(applyGeocodedName(stale, 'Parque Forestal'), false);
  assert.equal(stale.name, 'New place');

  const clicked = { name: '', pendingName: true };
  assert.equal(placeLabel(clicked), 'Locating…');
  assert.equal(applyGeocodedName(clicked, 'Parque Forestal'), true);
  assert.equal(clicked.name, 'Parque Forestal');
  assert.equal(clicked.pendingName, false);

  const typed = { name: 'My spot', pendingName: false };
  assert.equal(applyGeocodedName(typed, 'Parque Forestal'), false);
  assert.equal(typed.name, 'My spot');

  const missed = { name: '', pendingName: true };
  assert.equal(applyGeocodedName(missed, ''), true);
  assert.equal(missed.name, 'Unnamed place');
});

test('photon features become name, context, and coordinates', () => {
  const hit = normalizePhotonFeature({
    geometry: { coordinates: [-70.6413884, -33.4402618] },
    properties: {
      name: 'Lastarria',
      street: 'Pasaje Lastarria 70',
      city: 'Santiago',
      country: 'Chile',
    },
  });
  assert.equal(hit.name, 'Lastarria');
  assert.match(hit.context, /Santiago/);
  assert.equal(hit.lng, -70.6413884);
  assert.equal(normalizePhotonFeature({ geometry: { coordinates: [] } }), null);
});

test('night land is dark and outlines darken', () => {
  assert.equal(isDark(PALETTES.find((p) => p.name === 'Night').colors.land), true);
  assert.equal(isDark(PALETTES[0].colors.land), false);
  assert.equal(darken('#ffffff', 0), '#ffffff');
  assert.ok(luminance(darken('#4F84C4', 0.2)) < luminance('#4F84C4'));
});
