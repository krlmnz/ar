// Mapbox credentials.
//
// The token is NOT committed. It is a public `pk.` token — it ships to the
// browser on every map page by design — but an unrestricted one can be lifted
// and billed to this account, and GitHub push protection blocks it besides.
//
// Provide it one of two ways:
//   1. MAPBOX_TOKEN in the environment (Netlify: Site settings → Environment)
//   2. _data/mapbox.local.json — gitignored, for local development
//
// With neither, the site still builds: map pages render their content and the
// engine bails cleanly, hiding the empty canvas rather than showing a dead box.
const fs = require('fs');
const path = require('path');

function localToken() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'mapbox.local.json'), 'utf8')).token;
  } catch (e) {
    return '';
  }
}

const token = process.env.MAPBOX_TOKEN || localToken();

if (!token && process.env.ELEVENTY_RUN_MODE !== 'build') {
  console.warn('[andean-road] No Mapbox token — map pages will render without a map.');
}

module.exports = {
  token,
  style: 'mapbox://styles/kmunoz/cmpndx2y700jc01sc8vm610ld',
  version: 'v3.9.0'
};
