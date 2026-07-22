// Shared data for every build story under content/learn/notes/.
// See content/learn/editor/editor.11tydata.js for why the permalink override
// and the section/track pair are here rather than in front matter.
module.exports = {
  layout: 'layouts/article.njk',
  permalink: '/learn/notes/{{ page.fileSlug }}/',
  section: 'learn',
  track: 'notes',
  eleventyComputed: {
    crumbs: data => [
      { label: 'Learn', url: '/learn/' },
      { label: data.title }
    ]
  }
};
