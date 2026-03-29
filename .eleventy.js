const yaml = require('js-yaml');
const markdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');

module.exports = function(eleventyConfig) {
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

  eleventyConfig.addFilter('dateFormat', (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  eleventyConfig.addFilter('isoDate', (date) => {
    return new Date(date).toISOString().split('T')[0];
  });

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
