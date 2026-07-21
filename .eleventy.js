const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const markdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');

module.exports = function(eleventyConfig) {
  // --serve honours PORT so a preview harness can hand us a free port.
  // Without this, Eleventy ignores the environment and pins itself to 8080.
  if (process.env.PORT) {
    eleventyConfig.setServerOptions({ port: Number(process.env.PORT) });
  }

  // Inline SVG icons, resolved from the @phosphor-icons/core package.
  // Nothing to download — every Phosphor icon is already available by name.
  //
  //   {% icon "moon" %}                          → 24px, regular weight
  //   {% icon "map-pin", weight="fill" %}        → thin|light|regular|bold|fill|duotone
  //   {% icon "compass", size=32 %}
  //   {% icon "mountains", class="place-icon" %}
  //   {% icon "sun", label="Light mode" %}       → exposed to screen readers
  //
  // Custom (non-Phosphor) icons: drop an SVG in assets/icons/ using
  // fill="currentColor" — a local file of the same name takes precedence.
  const PHOSPHOR = path.join(__dirname, 'node_modules/@phosphor-icons/core/assets');
  const iconCache = new Map();

  eleventyConfig.addShortcode('icon', function(name, opts = {}) {
    const { size = 24, weight = 'regular', class: className = '', label = '' } = opts;
    const key = `${weight}/${name}`;

    if (!iconCache.has(key)) {
      // Phosphor suffixes non-regular weights: map-pin-fill.svg
      const phosphorName = weight === 'regular' ? name : `${name}-${weight}`;
      const local = path.join(__dirname, 'assets/icons', `${name}.svg`);
      const vendor = path.join(PHOSPHOR, weight, `${phosphorName}.svg`);
      const file = fs.existsSync(local) ? local : vendor;

      if (!fs.existsSync(file)) {
        throw new Error(
          `Icon "${name}" (weight: ${weight}) not found. ` +
          `Check the name at phosphoricons.com, or add assets/icons/${name}.svg`
        );
      }
      // Strip the wrapper's own sizing so `size` always wins.
      iconCache.set(key, fs.readFileSync(file, 'utf8')
        .replace(/<\?xml[\s\S]*?\?>/, '')
        .replace(/\s(width|height)="[^"]*"/g, '')
        .trim());
    }

    const a11y = label
      ? `role="img" aria-label="${label}"`
      : 'aria-hidden="true" focusable="false"';

    return iconCache.get(key).replace(
      '<svg',
      `<svg class="icon${className ? ' ' + className : ''}" width="${size}" height="${size}" ${a11y}`
    );
  });

  // Markdown: give every heading a stable id so long pages can be linked into
  // and a table of contents can be built. markdown-it and markdown-it-anchor
  // were already dependencies but were never actually wired up.
  //
  // Options mirror Eleventy's defaults (html: true only) on purpose — enabling
  // typographer or linkify here would silently re-render every existing page.
  const slugify = (s) => s
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // Pucón -> Pucon
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  eleventyConfig.setLibrary('md', markdownIt({ html: true }).use(markdownItAnchor, {
    level: [2, 3, 4],
    slugify,
    permalink: markdownItAnchor.permalink.ariaHidden({
      placement: 'after',
      class: 'heading-anchor',
      symbol: '#'
    })
  }));

  /* ---- map features --------------------------------------------------- */

  // Turn place collection items into the feature shape the map engine reads.
  //
  //   category: '' (default)  — neutral pins; use on layouts with no legend,
  //             'type'        — colour by place type (needs a type legend),
  //             any string    — literal category key (map-area's area key).
  //   zoom: optional per-feature zoom the camera uses when a pin is selected.
  eleventyConfig.addFilter('toFeatures', (items, category = '', zoom) => (items || [])
    .filter(i => i && i.data && i.data.coordinates)
    .map(i => {
      const f = {
        id: i.data.slug,
        title: i.data.title,
        type: i.data.type || '',
        category: category === 'type' ? (i.data.type || '') : category,
        subtitle: i.data.subtitle || '',
        url: `/places/${i.data.slug}/`,
        lng: i.data.coordinates.lng,
        lat: i.data.coordinates.lat,
        meta: [i.data.cost_level, i.data.duration && String(i.data.duration).replace(/-/g, ' ')]
          .filter(Boolean)
      };
      if (zoom) f.zoom = zoom;
      return f;
    }));

  // Resolve story steps / route stops to map features. A step may reference a
  // place by slug, carry its own lng/lat, or both — explicit coordinates win.
  // A step that resolves to no coordinates is dropped with a warning instead
  // of crashing the build or emitting `undefined` into the map config.
  eleventyConfig.addFilter('stepFeatures', (steps, places, mode = 'story') => (steps || [])
    .map((s, i) => {
      const p = s.place ? (places || []).find(x => x.data.slug === s.place) : null;
      const coords = (s.lng != null && s.lat != null)
        ? { lng: s.lng, lat: s.lat }
        : (p && p.data.coordinates) || null;
      if (!coords) {
        console.warn(`[andean-road] ${mode} step "${s.title || s.place || i + 1}" has no coordinates — skipped`);
        return null;
      }
      const f = {
        id: mode === 'route'
          ? (s.place || `stop-${i + 1}`)
          : (s.id || `step-${i + 1}`),
        title: mode === 'route' ? (p ? p.data.title : s.title) : s.title,
        type: (p ? p.data.type : s.type) || '',
        subtitle: (mode === 'route'
          ? (s.note || (p ? p.data.subtitle : ''))
          : s.subtitle) || '',
        url: p ? `/places/${p.data.slug}/` : '',
        lng: coords.lng,
        lat: coords.lat
      };
      if (mode === 'route') f.day = s.day || '';
      if (mode === 'story') {
        f.zoom = s.zoom || 12;
        f.pitch = s.pitch || 0;
        f.bearing = s.bearing || 0;
      }
      return f;
    })
    .filter(Boolean));

  // Resolve a list of place slugs to full collection items, dropping misses.
  eleventyConfig.addFilter('bySlugs', (collection, slugs) => (slugs || [])
    .map(s => (collection || []).find(i => i.data.slug === s))
    .filter(Boolean));

  // Straight-line distance neighbours for "while you're here" blocks.
  // Returns [{item, km}] nearest-first. Haversine is plenty at guide scale —
  // the reader wants "20 minutes away", not survey-grade geodesy.
  const havKm = (a, b) => {
    const rad = (d) => d * Math.PI / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
  };

  // km is a display string: neighbours in the same block round to "0 km" as an
  // integer, which reads like a bug — so under 1 km say so, under 10 keep one
  // decimal, beyond that whole kilometres are honest enough.
  const kmLabel = (d) => (d < 1 ? '<1' : d < 10 ? d.toFixed(1) : String(Math.round(d)));

  eleventyConfig.addFilter('nearby', (places, slug, limit = 3) => {
    const me = (places || []).find(i => i.data.slug === slug);
    if (!me || !me.data.coordinates) return [];
    return places
      .filter(i => i.data.slug !== slug && i.data.coordinates)
      .map(i => {
        const d = havKm(me.data.coordinates, i.data.coordinates);
        return { item: i, distance: d, km: kmLabel(d) };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  });

  // Front-matter `cover:` is a filename next to the content file (or an
  // absolute /assets/... path). Resolve it to the URL it is actually served
  // from — passthrough copy preserves the content/ prefix — and only if the
  // file exists, so a missing cover never becomes a 404 og:image.
  eleventyConfig.addFilter('resolveCover', (cover, pg) => {
    if (!cover || !pg || !pg.inputPath) return '';
    if (cover.startsWith('/')) {
      return fs.existsSync(path.join(__dirname, '.' + cover)) ? cover : '';
    }
    const dir = path.dirname(pg.inputPath).replace(/^\.\//, '');
    return fs.existsSync(path.join(__dirname, dir, cover))
      ? '/' + dir.split(path.sep).join('/') + '/' + cover
      : '';
  });

  // Build a table of contents from already-rendered HTML — no extra dependency.
  eleventyConfig.addFilter('toc', (html) => {
    if (!html) return [];
    const items = [];
    const re = /<h([23])[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      items.push({
        level: Number(m[1]),
        id: m[2],
        // Drop the permalink anchor entirely — stripping tags alone would leave
        // its "#" glyph stranded in the contents list.
        text: m[3]
          .replace(/<a\b[^>]*class="[^"]*heading-anchor[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')
          .replace(/<[^>]+>/g, '')
          .trim()
      });
    }
    return items;
  });

  // Add YAML data file support
  eleventyConfig.addDataExtension('yaml', contents => yaml.load(contents));
  eleventyConfig.addDataExtension('yml', contents => yaml.load(contents));

  /* ---- collections ----------------------------------------------------- */

  const published = (item) => item.data.published !== false;

  const placesOf = (collection) => collection
    .getFilteredByGlob('content/places/*/index.md')
    .filter(published);

  eleventyConfig.addCollection('places', collection => placesOf(collection)
    .sort((a, b) => a.data.title.localeCompare(b.data.title)));

  eleventyConfig.addCollection('guides', collection => collection
    .getFilteredByGlob('content/guides/*.md')
    .filter(published)
    .sort((a, b) => (a.data.title || '').localeCompare(b.data.title || '')));

  eleventyConfig.addCollection('practical', collection => collection
    .getFilteredByGlob('content/practical/*.md')
    .filter(published)
    .sort((a, b) => (a.data.title || '').localeCompare(b.data.title || '')));

  eleventyConfig.addCollection('templates', collection => collection
    .getFilteredByGlob('content/templates/*.md')
    .sort((a, b) => (a.data.order || 99) - (b.data.order || 99)));

  // Places grouped by a front-matter key that may hold several values.
  const groupPlacesBy = (keysOf) => (collection) => {
    const grouped = {};
    placesOf(collection).forEach(place => {
      keysOf(place).forEach(key => (grouped[key] = grouped[key] || []).push(place));
    });
    return grouped;
  };

  eleventyConfig.addCollection('byAudience', groupPlacesBy(p => p.data.audience || []));
  eleventyConfig.addCollection('byTag', groupPlacesBy(p =>
    Array.isArray(p.data.tags) ? p.data.tags : (p.data.tags ? [p.data.tags] : [])));

  /* ---- filters ---------------------------------------------------------- */

  eleventyConfig.addFilter('findBySlug', (collection, slug) => {
    return collection.find(item => item.data.slug === slug);
  });

  // Everything before the first ## — the paragraph that answers "why go".
  eleventyConfig.addFilter('excerpt', (content) => {
    if (!content) return '';
    const match = content.match(/^([\s\S]*?)##\s/m);
    return match ? match[1].trim() : content;
  });

  // Rendered HTML → plain text, for feeds, search indexes and llms.txt.
  eleventyConfig.addFilter('stripHtml', (html) => String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());

  eleventyConfig.addFilter('truncate', (str, limit = 150) => {
    if (!str) return '';
    if (str.length <= limit) return str;
    return str.substring(0, limit).trim() + '...';
  });

  // YAML gives an unquoted 2026-07-21 as a Date but a quoted "2026-07-21" as a
  // string, so both filters coerce. Without this, quoting a date in front matter
  // crashes the build with "date.toLocaleDateString is not a function".
  //
  // timeZone: 'UTC' is required, not cosmetic: YAML parses a bare date as UTC
  // midnight, and formatting that in a negative-offset locale renders the
  // previous day — so the visible date disagreed with the <time datetime="">.
  const toDate = (value) => (value instanceof Date ? value : new Date(value));

  eleventyConfig.addFilter('dateFormat', (date) => {
    const d = toDate(date);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });
  });

  eleventyConfig.addFilter('isoDate', (date) => {
    const d = toDate(date);
    if (isNaN(d)) return '';
    return d.toISOString().split('T')[0];
  });

  // Icons are inlined at build time, so re-read them when they change
  eleventyConfig.addWatchTarget('assets/icons/');
  eleventyConfig.on('eleventy.beforeWatch', () => iconCache.clear());

  // Passthrough copy. assets/ is copied per-subfolder so that a stray
  // .DS_Store at the top level never ships.
  // All of content/, not just places/ — resolveCover promises that an image
  // next to ANY content file is served; a places-only glob made every other
  // cover a guaranteed 404 the moment an author added one.
  eleventyConfig.addPassthroughCopy('content/**/*.{jpg,jpeg,png,webp,svg}');
  eleventyConfig.addPassthroughCopy('assets/css');
  eleventyConfig.addPassthroughCopy('assets/fonts');
  eleventyConfig.addPassthroughCopy('assets/img');
  eleventyConfig.addPassthroughCopy('assets/js');
  eleventyConfig.addPassthroughCopy('robots.txt');

  // Internal docs and scaffolding never reach _site — _starters/ especially,
  // which used to publish every blank starter as a real page.
  eleventyConfig.ignores.add('DESIGN-SYSTEM.md');
  eleventyConfig.ignores.add('README.md');
  eleventyConfig.ignores.add('WRITING.md');
  eleventyConfig.ignores.add('_starters/**');

  // Template options
  return {
    dir: {
      input: '.',
      includes: '_includes',
      data: '_data',
      output: '_site'
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk'
  };
};
