// Template previews. They live behind the studio gate at
// /editor/templates/<kind>/ — visible for trying things out, but unpublished
// so they stay out of listings, maps, and the sitemap.
module.exports = {
  permalink: '/editor/templates/{{ page.fileSlug }}/',
  demo: true,
  gate: true,
  eleventyComputed: {
    crumbs: (data) => [
      { label: 'Studio', url: '/editor/' },
      { label: 'Templates', url: '/editor/templates/' },
      { label: data.title }
    ],
    seo: (data) => ({
      title: `${data.title} — Andean Road`,
      description: data.summary || data.subtitle || ''
    })
  }
};
