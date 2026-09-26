const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const markdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const explicitHeadingIds = require('./lib/headings');
const prose = require('./lib/prose');

module.exports = function(eleventyConfig) {
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

  eleventyConfig.setLibrary('md', markdownIt({ html: true })
    .use(markdownItAnchor, {
      level: [2, 3, 4],
      slugify,
      permalink: markdownItAnchor.permalink.ariaHidden({
        placement: 'after',
        class: 'heading-anchor',
        symbol: '#'
      })
    })
    .use(explicitHeadingIds));

  // Turn place collection items into the feature shape the map engine reads.
  eleventyConfig.addFilter('toFeatures', (items) => (items || [])
    .filter(i => {
      const c = i && i.data && i.data.coordinates;
      if (!c || c.lat == null || c.lng == null) return false;
      // An unedited starter sits at 0,0. Leave it off every map.
      return !(Number(c.lat) === 0 && Number(c.lng) === 0);
    })
    .map(i => ({
      id: i.data.slug,
      title: i.data.title,
      type: i.data.type || '',
      category: i.data.region || '',
      subtitle: i.data.subtitle || '',
      url: `/places/${i.data.slug}/`,
      lng: i.data.coordinates.lng,
      lat: i.data.coordinates.lat,
      sample: !!i.data.sample
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

  eleventyConfig.addCollection('demos', collection => {
    return collection
      .getFilteredByGlob('content/demos/*.md')
      .filter(item => item.data.published !== false)
      .sort((a, b) => (a.data.order || 99) - (b.data.order || 99));
  });

  // The template previews behind the studio gate. Demos stay published so
  // they keep building; `gate: true` keeps them noindexed and off the
  // sitemap, and nothing public lists them anymore.
  eleventyConfig.addCollection('previews', collection => {
    return collection
      .getFilteredByGlob('content/demos/*.md')
      .filter(item => item.fileSlug === 'guide' || item.fileSlug === 'center')
      .sort((a, b) => (a.data.order || 99) - (b.data.order || 99));
  });

  eleventyConfig.addCollection('posts', collection => {
    return collection
      .getFilteredByGlob('content/*.md')
      .filter(item => item.data.published !== false)
      .filter(item => item.data.layout === 'layouts/guide.njk' || item.data.layout === 'layouts/center.njk')
      .sort((a, b) => String(b.data.updated || '').localeCompare(String(a.data.updated || '')));
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

  eleventyConfig.addFilter('lessons', prose.lessons);
  eleventyConfig.addFilter('faq', prose.asFaq);
  eleventyConfig.addFilter('days', prose.asDays);
  eleventyConfig.addFilter('gallery', prose.asGallery);
  eleventyConfig.addFilter('pad2', (n) => String(n).padStart(2, '0'));
  eleventyConfig.addFilter('h2s', (items) => (items || []).filter((h) => h.level === 2));
  eleventyConfig.addFilter('countPlaces', (days, places) => {
    const slugs = new Set((places || []).map((p) => p.data.slug));
    return (days || []).filter((d) => d.place && slugs.has(d.place)).length;
  });
  eleventyConfig.addFilter('striptags', (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  eleventyConfig.addFilter('json', (value) => JSON.stringify(value));

  // Icons are inlined at build time, so re-read them when they change
  eleventyConfig.addWatchTarget('assets/icons/');
  eleventyConfig.on('eleventy.beforeWatch', () => iconCache.clear());

  // Passthrough copy
  eleventyConfig.addPassthroughCopy('content/**/*.{jpg,jpeg,png,webp,svg,gif}');
  eleventyConfig.addPassthroughCopy('assets/');
  eleventyConfig.addPassthroughCopy('robots.txt');

  // Internal docs and scaffolds. Input is the repo root, so a markdown file
  // here would otherwise publish (this is how /WRITING/ and /_starters/ leaked).
  eleventyConfig.ignores.add('DESIGN-SYSTEM.md');
  eleventyConfig.ignores.add('README.md');
  eleventyConfig.ignores.add('WRITING.md');
  eleventyConfig.ignores.add('_starters/**');
  eleventyConfig.ignores.add('lib/**');

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
