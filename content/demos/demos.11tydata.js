// One demo per template. URLs are /demo/<kind>/, never /demos/<kind>/.
module.exports = {
  permalink: '/demo/{{ page.fileSlug }}/',
  demo: true,
  published: true,
  eleventyComputed: {
    crumbs: (data) => [
      { label: 'Templates', url: '/templates/' },
      { label: data.title }
    ],
    seo: (data) => ({
      title: `${data.title} — Andean Road`,
      description: data.summary || data.subtitle || ''
    })
  }
};
