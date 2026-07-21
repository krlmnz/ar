// Default for anything directly under content/. Without this, a new file at
// content/my-page.md would publish to /content/my-page/ — the folder name leaks
// into the URL. Subfolders (places, guides, practical, templates) set their own
// permalink in their own directory data file, which takes precedence.
module.exports = {
  permalink: '/{{ page.fileSlug }}/'
};
