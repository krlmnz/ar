/* Public published posts. Drafts stay in the studio.
 *
 * GET /api/posts            → { posts: [...] }
 * GET /api/posts?slug=name  → one published post
 *
 * Reads are eventual. Strong consistency needs an uncachedEdgeURL this
 * function environment does not have.
 */
"use strict";

const { connectLambda, getStore } = require("@netlify/blobs");

function json(status, body) {
  return {
    statusCode: status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body)
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readBlob(store, key, waitMs) {
  const deadline = Date.now() + (waitMs || 0);
  let text = await store.get(key, { type: "text" });
  while (text == null && Date.now() < deadline) {
    await sleep(400);
    text = await store.get(key, { type: "text" });
  }
  return text;
}

function parseDoc(text) {
  const match = String(text || "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  const front = {};
  match[1].split(/\n/).forEach((line) => {
    if (!line || /^\s*#/.test(line)) return;
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) return;
    let value = kv[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    front[kv[1]] = value;
  });
  return { front: front, body: match[2] };
}

function kindOf(front) {
  if (front.layout === "layouts/guide.njk") return "guide";
  if (front.layout === "layouts/center.njk") return "center";
  return "";
}

function slugOf(key) {
  const match = String(key).match(/^content\/([a-z0-9-]+)\.md$/);
  return match ? match[1] : "";
}

async function publishedPosts(store) {
  const listed = await store.list();
  const posts = [];
  for (const blob of listed.blobs || []) {
    const slug = slugOf(blob.key);
    if (!slug) continue;
    const text = await readBlob(store, blob.key, 0);
    const doc = parseDoc(text);
    if (!doc) continue;
    const kind = kindOf(doc.front);
    if (!kind || doc.front.published !== "true") continue;
    posts.push({
      slug: slug,
      path: blob.key,
      title: doc.front.title || "Untitled",
      kind: kind,
      subtitle: doc.front.subtitle || doc.front.summary || "",
      series: doc.front.series || "",
      cover: doc.front.cover === "true",
      cover_meta: doc.front.cover_meta || "",
      markdown: doc.body || "",
      url: "/notes/" + slug + "/"
    });
  }
  posts.sort((a, b) => a.title.localeCompare(b.title));
  return posts;
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "GET") return json(405, { error: "GET only." });

  let store;
  try {
    if (event.blobs) connectLambda(event);
    store = getStore("studio");
  } catch (e) {
    return json(500, { error: "Published posts are not available on this server." });
  }

  try {
    const slug = String((event.queryStringParameters || {}).slug || "")
      .replace(/^\/+|\/+$/g, "");
    if (!slug) {
      const posts = await publishedPosts(store);
      return json(200, {
        posts: posts.map((post) => ({
          slug: post.slug,
          title: post.title,
          kind: post.kind,
          subtitle: post.subtitle,
          url: post.url
        }))
      });
    }
    if (!/^[a-z0-9-]+$/.test(slug)) return json(400, { error: "Unknown post." });
    const text = await readBlob(store, "content/" + slug + ".md", 7000);
    const doc = parseDoc(text);
    const kind = doc && kindOf(doc.front);
    if (!doc || !kind || doc.front.published !== "true") {
      return json(404, { error: "That post is not published." });
    }
    return json(200, {
      slug: slug,
      title: doc.front.title || "Untitled",
      kind: kind,
      subtitle: doc.front.subtitle || doc.front.summary || "",
      series: doc.front.series || "",
      cover: doc.front.cover === "true",
      cover_meta: doc.front.cover_meta || "",
      markdown: doc.body || "",
      url: "/notes/" + slug + "/"
    });
  } catch (error) {
    return json(500, { error: "Could not read published posts." });
  }
};
