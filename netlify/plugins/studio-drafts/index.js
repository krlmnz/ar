/* Copy studio drafts into content/ before Eleventy runs, so a later build
 * publishes them as real pages. A missing store must not fail the deploy.
 */
const fs = require("fs");
const path = require("path");

module.exports = {
  async onPreBuild({ utils }) {
    try {
      const { getStore } = require("@netlify/blobs");
      const store = getStore("studio");
      const listed = await store.list();
      const root = path.resolve(process.cwd(), "content");
      let count = 0;
      for (const blob of listed.blobs || []) {
        const key = String(blob.key || "");
        if (!key.startsWith("content/") || key.includes("..") || !key.endsWith(".md")) continue;
        const dest = path.resolve(process.cwd(), key);
        if (dest !== root && !dest.startsWith(root + path.sep)) continue;
        const text = await store.get(key, { type: "text" });
        if (text == null) continue;
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, text);
        count += 1;
      }
      utils.status.show({ title: "Studio drafts", summary: count + " page" + (count === 1 ? "" : "s") });
    } catch (error) {
      utils.status.show({ title: "Studio drafts", summary: "No drafts to copy." });
    }
  }
};
