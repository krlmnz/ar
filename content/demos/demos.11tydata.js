// Only the two post templates are previewed. The other demo files stay in
// the repo but do not publish — their layouts fight the reading column.
const KEEP = ['guide', 'center'];

module.exports = {
  demo: true,
  gate: true,
  eleventyComputed: {
    permalink: (data) => {
      const slug = data.page.fileSlug;
      if (KEEP.indexOf(slug) === -1) return false;
      return `/editor/templates/${slug}/`;
    },
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
