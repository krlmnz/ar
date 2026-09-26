// Default for anything directly under content/. Without this, a new file at
// content/my-page.md would publish to /content/my-page/ — the folder name leaks
// into the URL. Subfolders (places, demos) set their own permalink, which wins.
module.exports = {
  permalink: '/{{ page.fileSlug }}/'
};
