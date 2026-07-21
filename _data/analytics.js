// Analytics configuration.
//
// Off by default. Set ANALYTICS_PROVIDER (and its site id) in the environment —
// Netlify: Site configuration → Environment variables — and it switches on at
// the next build. Nothing is committed, and local dev stays clean.
//
//   ANALYTICS_PROVIDER=goatcounter   ANALYTICS_ID=andean-road
//   ANALYTICS_PROVIDER=plausible     ANALYTICS_ID=andean-road.com
//   ANALYTICS_PROVIDER=cloudflare    ANALYTICS_ID=<beacon token>
//   ANALYTICS_PROVIDER=umami         ANALYTICS_ID=<website id>  ANALYTICS_HOST=<your host>
//
// All four are cookieless and store no personal data, so the site needs no
// consent banner. Deliberately NOT supported: Google Analytics — it sets
// cookies, requires a consent banner in the EU/UK, and ships ~50KB to a site
// whose entire point is that it ships almost nothing.
const PROVIDERS = ['plausible', 'goatcounter', 'cloudflare', 'umami'];

const provider = (process.env.ANALYTICS_PROVIDER || '').toLowerCase().trim();
const id = (process.env.ANALYTICS_ID || '').trim();
const host = (process.env.ANALYTICS_HOST || '').trim();

let enabled = Boolean(provider) && Boolean(id);

if (provider && !PROVIDERS.includes(provider)) {
  console.warn(`[andean-road] Unknown ANALYTICS_PROVIDER "${provider}". ` +
    `Expected one of: ${PROVIDERS.join(', ')}. Analytics disabled.`);
  enabled = false;
} else if (provider && !id) {
  console.warn(`[andean-road] ANALYTICS_PROVIDER is set but ANALYTICS_ID is empty. Analytics disabled.`);
} else if (provider === 'umami' && !host) {
  console.warn(`[andean-road] umami needs ANALYTICS_HOST as well. Analytics disabled.`);
  enabled = false;
}

module.exports = { enabled, provider, id, host };
