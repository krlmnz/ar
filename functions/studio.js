/* Studio saves. The browser never holds a GitHub token.
 *
 * Drafts are stored in Netlify Blobs, so Create draft works with the studio
 * cookie alone. When GITHUB_TOKEN is set on the site, the same save is also
 * committed and Netlify rebuilds the public page.
 *
 * Images use the same store under media/studio/<id>.<ext>. Markdown points at
 * /media/studio/<id>, which this function serves until a build copies the blob
 * into the static site. The id is unguessable. Page markdown stays behind the
 * studio cookie; image bytes are public so a published article can show them.
 *
 * Deferred: map blocks, chart blocks, tag admin, duplicate/archive CMS.
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

function fieldOf(text, key) {
  const match = String(text || "").match(new RegExp("^" + key + ":\\s*(.*)$", "m"));
  return match ? match[1].trim().replace(/^"(.*)"$/, "$1") : "";
}

const IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg"
};

const EXT_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif"
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_EDGE = 4096;

function pngSize(buf) {
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  let animated = false;
  let i = 8;
  while (i + 8 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString("ascii", i + 4, i + 8);
    if (type === "acTL") animated = true;
    if (type === "IDAT" || type === "IEND") break;
    if (len > buf.length) break;
    i += 12 + len;
  }
  return { width: width, height: height, animated: animated };
}

function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 1 < buf.length) {
    if (buf[i] !== 0xff) return null;
    while (i < buf.length && buf[i] === 0xff) i += 1;
    if (i >= buf.length) return null;
    const marker = buf[i];
    i += 1;
    if (marker === 0x00 || marker === 0x01 || marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (i + 2 > buf.length) return null;
    const len = buf.readUInt16BE(i);
    if (len < 2 || i + len > buf.length) return null;
    const sof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (sof) {
      if (i + 7 > buf.length) return null;
      return { width: buf.readUInt16BE(i + 5), height: buf.readUInt16BE(i + 3), animated: false };
    }
    if (marker === 0xda) return null;
    i += len;
  }
  return null;
}

function webpSize(buf) {
  if (buf.length < 25 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X" && buf.length >= 30) {
    return {
      width: 1 + buf.readUIntLE(24, 3),
      height: 1 + buf.readUIntLE(27, 3),
      animated: (buf[20] & 0x20) !== 0
    };
  }
  if (chunk === "VP8L" && buf[20] === 0x2f) {
    const bits = buf.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff), animated: false };
  }
  if (chunk === "VP8 ") {
    const start = buf.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
    if (start < 0 || start + 7 > buf.length) return null;
    return {
      width: buf.readUInt16LE(start + 3) & 0x3fff,
      height: buf.readUInt16LE(start + 5) & 0x3fff,
      animated: false
    };
  }
  return null;
}

function rasterSize(buf, ext) {
  if (ext === "png") return pngSize(buf);
  if (ext === "jpg") return jpegSize(buf);
  if (ext === "webp") return webpSize(buf);
  return null;
}

function imageProblem(bytes, ext) {
  if (bytes.length > MAX_IMAGE_BYTES) return "That image is over 5 MB.";
  if (ext === "svg") return "";
  const size = rasterSize(bytes, ext);
  if (!size || !size.width || !size.height) return "Could not read that image.";
  if (size.animated) return "Animated images are not supported.";
  if (Math.max(size.width, size.height) > MAX_IMAGE_EDGE) return "That image is over 4096px on the long edge.";
  return "";
}

function sanitizeSvg(text) {
  const cleaned = String(text)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
  if (!/<svg[\s>]/i.test(cleaned)) throw new Error("That SVG could not be read.");
  return cleaned;
}

function mediaName(value) {
  const name = String(value || "");
  if (!/^[a-z0-9][a-z0-9.-]{0,120}$/.test(name) || name.includes("..")) return "";
  return name;
}

function blankText(template, title, slug) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    "---",
    "layout: " + template.layout,
    "permalink: /notes/" + slug + "/",
    "published: false",
    'title: "' + title.replace(/"/g, '\\"') + '"',
    "subtitle: \"\"",
    "updated: " + today
  ];
  if (template.id === "guide") lines.push("series: Field guide");
  lines.push("---", "", "");
  return lines.join("\n");
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

async function githubWriteBytes(filePath, bytes, message) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;
  const remote = await githubFile(filePath);
  const payload = {
    message: message,
    content: Buffer.from(bytes).toString("base64"),
    branch: BRANCH
  };
  if (remote && remote.sha) payload.sha = remote.sha;
  const res = await fetch(
    "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + filePath,
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
  if (!res.ok) return false;
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

async function openStore(event) {
  if (event.blobs) connectLambda(event);
  return getStore("studio");
}

async function serveMedia(event) {
  const name = mediaName(event.queryStringParameters && event.queryStringParameters.media);
  if (!name) return json(404, { error: "Not found." });
  let store;
  try {
    store = await openStore(event);
  } catch (e) {
    return json(404, { error: "Not found." });
  }
  try {
    const found = await store.getWithMetadata("media/studio/" + name, { type: "arrayBuffer" });
    if (!found || found.data == null) return json(404, { error: "Not found." });
    const ext = (name.split(".").pop() || "").toLowerCase();
    const type = (found.metadata && found.metadata.contentType) || EXT_TYPES[ext] || "application/octet-stream";
    return {
      statusCode: 200,
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=31536000, immutable"
      },
      isBase64Encoded: true,
      body: Buffer.from(found.data).toString("base64")
    };
  } catch (e) {
    return json(404, { error: "Not found." });
  }
}

function headerValue(event, name) {
  const headers = event.headers || {};
  const found = Object.keys(headers).find((key) => key.toLowerCase() === name);
  return found ? String(headers[found]) : "";
}

function bodyBuffer(event) {
  const raw = event.body == null ? "" : String(event.body);
  if (event.isBase64Encoded) return Buffer.from(raw, "base64");
  return Buffer.from(raw, "latin1");
}

function bodyText(event) {
  const raw = event.body == null ? "" : String(event.body);
  if (event.isBase64Encoded) return Buffer.from(raw, "base64").toString("utf8");
  return raw;
}

function isImagePost(event) {
  const type = headerValue(event, "content-type").split(";")[0].trim().toLowerCase();
  return type.startsWith("image/");
}

/* A 5 MB file base64-wrapped in JSON is about 6.7 MB. Netlify rejects
 * synchronous payloads over 6 MB before this function runs, and the
 * editor used to show that as "Could not save." An image Content-Type
 * means the body is the file itself, so a full-size JPEG still fits. */
function imageUpload(event) {
  const type = headerValue(event, "content-type").split(";")[0].trim().toLowerCase();
  if (!type.startsWith("image/")) return null;
  const ext = IMAGE_TYPES[type];
  if (!ext) return { error: "Use a JPEG, PNG, WebP, or an SVG diagram." };
  const bytes = bodyBuffer(event);
  if (!bytes.length) return { error: "That image was empty." };
  const problem = imageProblem(bytes, ext);
  if (problem) return { error: problem };
  if (ext === "svg") {
    return { ext: ext, bytes: Buffer.from(sanitizeSvg(bytes.toString("utf8")), "utf8"), contentType: EXT_TYPES[ext] };
  }
  return { ext: ext, bytes: bytes, contentType: EXT_TYPES[ext] };
}

async function putImage(store, bytes, ext, contentType) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const name = id + "." + ext;
  const key = "media/studio/" + name;
  await store.set(key, bytes, { metadata: { contentType: contentType } });
  try {
    await githubWriteBytes(key, bytes, "content: add image " + name);
  } catch (e) { /* blob is enough until the next build copies it */ }
  return { url: "/media/studio/" + name, path: key };
}

exports.imageProblem = imageProblem;
exports.imageUpload = imageUpload;

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod === "GET") return serveMedia(event);
  if (event.httpMethod !== "POST") return json(405, { error: "POST only." });
  if (!unlocked(event)) return json(401, { error: "Enter the studio code first." });

  let body = null;
  if (!isImagePost(event)) {
    try {
      body = JSON.parse(bodyText(event) || "{}");
    } catch (e) {
      return json(400, { error: "Could not read that request." });
    }
  }

  let store;
  try {
    store = await openStore(event);
  } catch (e) {
    return json(500, { error: "The studio store is not available on this server. " + (e.message || "") });
  }

  try {
    if (isImagePost(event)) {
      const upload = imageUpload(event);
      if (upload.error) return json(400, { error: upload.error });
      return json(200, await putImage(store, upload.bytes, upload.ext, upload.contentType));
    }

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
          updated: fieldOf(text, "updated"),
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
      const text = body.blank ? blankText(template, title, slug) : await starterText(template, title, slug);
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

    if (body.action === "upload") {
      const type = String(body.contentType || "").toLowerCase();
      const ext = IMAGE_TYPES[type];
      if (!ext) return json(400, { error: "Use a JPEG, PNG, WebP, or an SVG diagram." });
      let bytes;
      try {
        bytes = Buffer.from(String(body.data || ""), "base64");
      } catch (e) {
        return json(400, { error: "Could not read that image." });
      }
      if (!bytes.length) return json(400, { error: "That image was empty." });
      const problem = imageProblem(bytes, ext);
      if (problem) return json(400, { error: problem });
      if (ext === "svg") bytes = Buffer.from(sanitizeSvg(bytes.toString("utf8")), "utf8");
      return json(200, await putImage(store, bytes, ext, EXT_TYPES[ext]));
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
