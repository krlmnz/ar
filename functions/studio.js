/* Studio saves. The browser never holds a GitHub token.
 *
 * Drafts are stored in Netlify Blobs, so Create draft works with the studio
 * cookie alone. When GITHUB_TOKEN is set on the site, the same save is also
 * committed and Netlify rebuilds the public page.
 */
"use strict";

const { connectLambda, getStore } = require("@netlify/blobs");
const TEMPLATES = require("../_data/templates");

const CODE = "042986";
const OWNER = "krlmnz";
const REPO = "ar";
const BRANCH = "main";

const slugify = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

function safePath(value) {
  const path = String(value || "").replace(/^\/+/, "");
  if (!path.startsWith("content/") || path.includes("..") || !path.endsWith(".md")) {
    throw new Error("That path is not a page.");
  }
  return path;
}

function json(status, body) {
  return {
    statusCode: status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body)
  };
}

function unlocked(event) {
  const cookie = event.headers.cookie || event.headers.Cookie || "";
  return cookie.split("; ").indexOf("ar_editor=" + CODE) !== -1;
}

function titleOf(text, fallback) {
  const match = String(text || "").match(/^title:\s*(.*)$/m);
  if (!match) return fallback || "Untitled";
  return match[1].trim().replace(/^"(.*)"$/, "$1");
}

function kindOf(text) {
  const match = String(text || "").match(/^layout:\s*layouts\/([a-z0-9-]+)\.njk/m);
  return match ? match[1] : "page";
}

async function starterText(template, title, slug) {
  const url = "https://raw.githubusercontent.com/" + OWNER + "/" + REPO + "/" + BRANCH + "/_starters/" + template.starter;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not read the " + template.title + " starter.");
  const today = new Date().toISOString().slice(0, 10);
  return (await res.text())
    .replace(/__TITLE__/g, title.replace(/"/g, '\\"'))
    .replace(/__SLUG__/g, slug)
    .replace(/__DATE__/g, today);
}

async function githubFile(path) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  const res = await fetch(
    "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + path + "?ref=" + BRANCH,
    { headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "User-Agent": "andean-studio" } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("GitHub could not read that file.");
  const data = await res.json();
  return { sha: data.sha, text: Buffer.from(data.content || "", "base64").toString("utf8") };
}

async function githubWrite(path, text, message, sha) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;
  const payload = {
    message: message,
    content: Buffer.from(text, "utf8").toString("base64"),
    branch: BRANCH
  };
  if (sha) payload.sha = sha;
  const res = await fetch(
    "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + path,
    {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "User-Agent": "andean-studio"
      },
      body: JSON.stringify(payload)
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "GitHub could not save that file.");
  }
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* Eventual reads. Strong consistency needs an uncachedEdgeURL this
 * function environment does not have, and requesting it fails the read.
 * A new blob can take several seconds to show up, so callers that just
 * wrote may pass a wait budget. */
async function readBlob(store, key, waitMs) {
  const deadline = Date.now() + (waitMs || 0);
  let text = await store.get(key, { type: "text" });
  while (text == null && Date.now() < deadline) {
    await sleep(400);
    text = await store.get(key, { type: "text" });
  }
  return text;
}

function noteUrl(path, text) {
  if (!/^published:\s*true\s*$/m.test(text || "")) return "";
  const match = String(path).match(/^content\/([a-z0-9-]+)\.md$/);
  return match ? "/notes/" + match[1] + "/" : "";
}

async function rawFile(path) {
  const res = await fetch(
    "https://raw.githubusercontent.com/" + OWNER + "/" + REPO + "/" + BRANCH + "/" + path
  );
  if (!res.ok) return null;
  return res.text();
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "POST") return json(405, { error: "POST only." });
  if (!unlocked(event)) return json(401, { error: "Enter the studio code first." });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { error: "Could not read that request." });
  }

  let store;
  try {
    if (event.blobs) connectLambda(event);
    store = getStore("studio");
  } catch (e) {
    return json(500, { error: "The studio store is not available on this server. " + (e.message || "") });
  }

  try {
    if (body.action === "list") {
      const listed = await store.list();
      const pages = [];
      for (const blob of listed.blobs || []) {
        if (!String(blob.key).startsWith("content/") || !String(blob.key).endsWith(".md")) continue;
        const text = await readBlob(store, blob.key, 800);
        if (text == null) continue;
        pages.push({
          path: blob.key,
          title: titleOf(text),
          kind: kindOf(text),
          text: text,
          url: "/editor/draft/?path=" + encodeURIComponent(blob.key),
          publicUrl: noteUrl(blob.key, text),
          published: /^published:\s*true\s*$/m.test(text || ""),
          studio: true
        });
      }
      return json(200, { pages: pages });
    }

    if (body.action === "create") {
      const template = TEMPLATES.find((item) => item.id === body.kind);
      const title = String(body.title || "").trim();
      if (!template) return json(400, { error: "Pick a template." });
      if (!title) return json(400, { error: "Give the page a title." });
      const slug = slugify(title);
      if (!slug) return json(400, { error: "That title makes an empty slug. Try plainer characters." });
      const path = template.dir ? template.out + "/" + slug + "/index.md" : template.out + "/" + slug + ".md";
      safePath(path);
      const existing = await readBlob(store, path, 0);
      if (existing) return json(409, { error: "A draft with that title already exists." });
      if (await rawFile(path)) return json(409, { error: "A page with that title already exists." });
      const text = await starterText(template, title, slug);
      await store.set(path, text);
      const committed = await githubWrite(path, text, "content: update " + title, null);
      return json(200, {
        path: path,
        title: title,
        kind: template.id,
        text: text,
        committed: committed,
        url: "/editor/draft/?path=" + encodeURIComponent(path)
      });
    }

    if (body.action === "read") {
      const path = safePath(body.path);
      const blob = await readBlob(store, path, 7000);
      if (blob != null) return json(200, { path: path, text: blob, source: "studio" });
      const remote = await githubFile(path);
      if (remote) return json(200, { path: path, text: remote.text, sha: remote.sha, source: "github" });
      const raw = await rawFile(path);
      if (raw != null) return json(200, { path: path, text: raw, source: "repo" });
      return json(404, { error: "That file is not in the studio yet." });
    }

    if (body.action === "write") {
      const path = safePath(body.path);
      const text = String(body.text || "");
      if (!text.startsWith("---")) return json(400, { error: "The page needs its front matter." });
      const title = titleOf(text);
      await store.set(path, text);
      let sha = null;
      if (process.env.GITHUB_TOKEN) {
        const remote = await githubFile(path);
        sha = remote && remote.sha;
      }
      const verb = body.verb || "update";
      const committed = await githubWrite(path, text, "content: " + verb + " " + title, sha);
      return json(200, { path: path, text: text, committed: committed, title: title });
    }

    return json(400, { error: "Unknown action." });
  } catch (error) {
    return json(400, { error: error.message || "Could not save." });
  }
};
