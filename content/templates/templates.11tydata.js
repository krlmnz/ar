// Shared data for every page under content/templates/.
module.exports = {
  permalink: '/templates/{{ page.fileSlug }}/',
  eleventyComputed: {
    // Breadcrumbs are Home / Templates / <this page>
    crumbs: data => [
      { label: 'Templates', url: '/templates/' },
      { label: data.title }
    ],
    seo: data => ({
      title: `${data.title} — Page templates — Andean Road`,
      description: data.summary || data.subtitle || ''
    })
  }
};
