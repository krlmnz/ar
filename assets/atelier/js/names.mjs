// Click-added places start unnamed and pending. A reverse-geocode
// result is applied only while that flag is still set, so a name the
// designer has typed is never replaced.
//
// The previous atelier checked `place.name === 'A special place'` after
// it had already stored 'New place', so the lookup result was dropped
// every time.

export function placeLabel(place) {
  if (place && place.pendingName && !String(place.name || '').trim()) return 'Locating…';
  const name = String((place && place.name) || '').trim();
  return name || 'Unnamed place';
}

export function applyGeocodedName(place, name) {
  if (!place || place.pendingName !== true) return false;
  const cleaned = String(name || '').replace(/\s+/g, ' ').trim();
  place.name = cleaned || 'Unnamed place';
  place.pendingName = false;
  return true;
}
