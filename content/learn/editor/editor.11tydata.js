// Shared data for every how-to under content/learn/editor/.
//
// The permalink is not optional. content/content.11tydata.js sets
// `/{{ page.fileSlug }}/` for everything under content/, and that cascades
// into subfolders — without the override below a how-to would publish to the
// site root at /my-how-to/ and the build would succeed while doing it.
//
// `section` and `track` are wayfinding structure, not discovery facets: they
// drive breadcrumbs, the Learn hub's two-door fork, and the eventual split of
// that hub into two. They live here rather than in taxonomy.yml so that moving
// a file between tracks is the only edit a re-organisation needs.
module.exports = {
  layout: 'layouts/manual.njk',
  permalink: '/learn/editor/{{ page.fileSlug }}/',
  section: 'learn',
  track: 'editor',
  eleventyComputed: {
    // Breadcrumbs are Home / Learn / <this page>
    crumbs: data => [
      { label: 'Learn', url: '/learn/' },
      { label: data.title }
    ]
  }
};
