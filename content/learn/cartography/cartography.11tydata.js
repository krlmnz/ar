// Shared data for every topic under content/learn/cartography/.
// See content/learn/editor/editor.11tydata.js for why the permalink override
// and the section/track pair are here rather than in front matter.
module.exports = {
  layout: 'layouts/article.njk',
  permalink: '/learn/cartography/{{ page.fileSlug }}/',
  section: 'learn',
  track: 'cartography',
  eleventyComputed: {
    crumbs: data => [
      { label: 'Learn', url: '/learn/' },
      { label: data.title }
    ]
  }
};
