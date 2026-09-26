/* Drafts stay buildable (so you can preview the URL) but leave every
 * collection, listing, map, and the sitemap. `published: false` is the switch.
 * Pages that already opt out — the sitemap itself — stay opted out.
 */
module.exports = {
  eleventyExcludeFromCollections(data) {
    return data.published === false || data.eleventyExcludeFromCollections === true;
  }
};
