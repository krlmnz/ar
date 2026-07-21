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

  // Turn place collection items into the feature shape the map engine reads.
  eleventyConfig.addFilter('toFeatures', (items) => (items || [])
    .filter(i => i && i.data && i.data.coordinates)
    .map(i => ({
      id: i.data.slug,
      title: i.data.title,
      type: i.data.type || '',
      category: i.data.region || '',
      subtitle: i.data.subtitle || '',
      url: `/places/${i.data.slug}/`,
      lng: i.data.coordinates.lng,
      lat: i.data.coordinates.lat
    })));

  // Resolve a list of place slugs to full collection items, dropping misses.
  eleventyConfig.addFilter('bySlugs', (collection, slugs) => (slugs || [])
    .map(s => (collection || []).find(i => i.data.slug === s))
    .filter(Boolean));

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

  // Create collections
  eleventyConfig.addCollection('places', collection => {
    return collection
      .getFilteredByGlob('content/places/*/index.md')
      .filter(item => item.data.published !== false)
      .sort((a, b) => a.data.title.localeCompare(b.data.title));
  });

  eleventyConfig.addCollection('guides', collection => {
    return collection
      .getFilteredByGlob('content/guides/*.md')
      .filter(item => item.data.published !== false)
      .sort((a, b) => (a.data.title || '').localeCompare(b.data.title || ''));
  });

  eleventyConfig.addCollection('practical', collection => {
    return collection
      .getFilteredByGlob('content/practical/*.md')
      .filter(item => item.data.published !== false)
      .sort((a, b) => (a.data.title || '').localeCompare(b.data.title || ''));
  });

  eleventyConfig.addCollection('templates', collection => {
    return collection
      .getFilteredByGlob('content/templates/*.md')
      .sort((a, b) => (a.data.order || 99) - (b.data.order || 99));
  });

  // Group places by region
  eleventyConfig.addCollection('byRegion', collection => {
    const places = collection.getFilteredByGlob('content/places/*/index.md')
      .filter(item => item.data.published !== false);

    const grouped = {};
    places.forEach(place => {
      const region = place.data.region || 'Uncategorized';
      if (!grouped[region]) {
        grouped[region] = [];
      }
      grouped[region].push(place);
    });
    return grouped;
  });

  // Group places by audience
  eleventyConfig.addCollection('byAudience', collection => {
    const places = collection.getFilteredByGlob('content/places/*/index.md')
      .filter(item => item.data.published !== false);

    const grouped = {};
    places.forEach(place => {
      const audiences = place.data.audience || [];
      audiences.forEach(aud => {
        if (!grouped[aud]) {
          grouped[aud] = [];
        }
        grouped[aud].push(place);
      });
    });
    return grouped;
  });

  // Group places by tag
  eleventyConfig.addCollection('byTag', collection => {
    const places = collection.getFilteredByGlob('content/places/*/index.md')
      .filter(item => item.data.published !== false);

    const grouped = {};
    places.forEach(place => {
      const tags = Array.isArray(place.data.tags) ? place.data.tags : (place.data.tags ? [place.data.tags] : []);
      tags.forEach(tag => {
        if (!grouped[tag]) {
          grouped[tag] = [];
        }
        grouped[tag].push(place);
      });
    });
    return grouped;
  });

  // Filters
  eleventyConfig.addFilter('findBySlug', (collection, slug) => {
    return collection.find(item => item.data.slug === slug);
  });

  eleventyConfig.addFilter('excerpt', (content) => {
    const match = content.match(/^([\s\S]*?)##\s/m);
    return match ? match[1].trim() : content;
  });

  eleventyConfig.addFilter('truncate', (str, limit = 150) => {
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

  // Passthrough copy
  eleventyConfig.addPassthroughCopy('content/places/**/*.{jpg,jpeg,png,webp,svg}');
  eleventyConfig.addPassthroughCopy('assets/');
  eleventyConfig.addPassthroughCopy('robots.txt');

  // Exclude internal docs from build
  eleventyConfig.ignores.add('DESIGN-SYSTEM.md');
  eleventyConfig.ignores.add('README.md');

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
