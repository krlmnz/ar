import "server-only"
import fs from "fs/promises"
import path from "path"
import { createHash } from "crypto"
import { Octokit } from "@octokit/rest"
import {
  applyAction,
  commitMessage,
  fillStarter,
  isContentMarkdown,
  pagePath,
  slugify,
  summarize,
  titleFromMarkdown,
  type PageSummary,
  type SaveAction,
} from "@/lib/markdown-file"
import { templateById } from "@/lib/templates"

export class ContentError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export type WriteResult = {
  path: string
  sha: string
  markdown: string
  publicUrl: string
  commitUrl: string | null
  mode: "github" | "local"
  message: string
}

function mode(): "github" | "local" {
  const source = process.env.CONTENT_SOURCE
  if (source === "local") return "local"
  if (source === "github" || process.env.GITHUB_TOKEN) {
    if (!process.env.GITHUB_TOKEN) {
      throw new ContentError("GITHUB_TOKEN is required when CONTENT_SOURCE=github", 500)
    }
    return "github"
  }
  if (process.env.NODE_ENV !== "production") return "local"
  throw new ContentError("Set GITHUB_TOKEN so the editor can commit to the repository", 500)
}

function repoCoords() {
  const full = process.env.GITHUB_REPO || "krlmnz/ar"
  const [owner, repo] = full.split("/")
  if (!owner || !repo) throw new ContentError("GITHUB_REPO must look like owner/name", 500)
  return { owner, repo, branch: process.env.GITHUB_BRANCH || "main" }
}

function localRoot() {
  return path.resolve(process.env.CONTENT_ROOT || path.join(process.cwd(), ".."))
}

function assertPath(filePath: string) {
  if (!isContentMarkdown(filePath)) {
    throw new ContentError("That path is not a content page")
  }
}

function localFile(filePath: string) {
  assertPath(filePath)
  const root = localRoot()
  const abs = path.resolve(root, filePath)
  if (!abs.startsWith(root + path.sep)) throw new ContentError("That path is not allowed")
  return abs
}

function hash(text: string) {
  return createHash("sha1").update(text).digest("hex")
}

function siteBase() {
  return (process.env.PUBLIC_SITE_URL || "https://andean-road.com").replace(/\/$/, "")
}

function requirePublic(filePath: string, slug: string) {
  if (filePath.startsWith("content/places/")) return `/places/${slug}/`
  if (filePath.startsWith("content/demos/")) return `/demo/${slug}/`
  return `/${slug}/`
}

async function walkMarkdown(dir: string, root: string, out: string[]) {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) await walkMarkdown(abs, root, out)
    else if (entry.name.endsWith(".md")) {
      const rel = path.relative(root, abs).split(path.sep).join("/")
      if (isContentMarkdown(rel)) out.push(rel)
    }
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const result = new Array<R>(items.length)
  let index = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++
      result[current] = await fn(items[current])
    }
  })
  await Promise.all(workers)
  return result
}

function octokit() {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new ContentError("GITHUB_TOKEN is not set", 500)
  return new Octokit({ auth: token })
}

async function readGithub(filePath: string): Promise<{ markdown: string; sha: string }> {
  assertPath(filePath)
  const { owner, repo, branch } = repoCoords()
  const res = await octokit().rest.repos.getContent({ owner, repo, path: filePath, ref: branch })
  if (Array.isArray(res.data) || res.data.type !== "file" || !("content" in res.data)) {
    throw new ContentError("That GitHub path is not a file", 404)
  }
  const markdown = Buffer.from(res.data.content, "base64").toString("utf8")
  return { markdown, sha: res.data.sha }
}

async function writeGithub(filePath: string, markdown: string, message: string, sha: string | null) {
  assertPath(filePath)
  const { owner, repo, branch } = repoCoords()
  try {
    const res = await octokit().rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message,
      content: Buffer.from(markdown, "utf8").toString("base64"),
      branch,
      sha: sha || undefined,
    })
    return {
      sha: res.data.content?.sha || "",
      commitUrl: res.data.commit.html_url ?? null,
    }
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 500
    if (status === 409 || status === 422) {
      throw new ContentError("This file changed on GitHub. Reload it, then save again.", 409)
    }
    const detail = error instanceof Error ? error.message : "GitHub write failed"
    throw new ContentError(detail, status || 500)
  }
}

async function listGithubPaths(): Promise<string[]> {
  const { owner, repo, branch } = repoCoords()
  const client = octokit()
  const ref = await client.rest.git.getRef({ owner, repo, ref: `heads/${branch}` })
  const commit = await client.rest.git.getCommit({ owner, repo, commit_sha: ref.data.object.sha })
  const tree = await client.rest.git.getTree({
    owner,
    repo,
    tree_sha: commit.data.tree.sha,
    recursive: "true",
  })
  return tree.data.tree
    .map((item) => item.path || "")
    .filter((item) => item && isContentMarkdown(item))
}

export async function listPages(): Promise<{ pages: PageSummary[]; mode: "github" | "local" }> {
  const current = mode()
  if (current === "local") {
    const root = localRoot()
    const paths: string[] = []
    await walkMarkdown(path.join(root, "content"), root, paths)
    const pages = await mapPool(paths.sort(), 8, async (filePath) => {
      const markdown = await fs.readFile(localFile(filePath), "utf8")
      return summarize(filePath, markdown)
    })
    return { pages, mode: current }
  }
  const paths = await listGithubPaths()
  const pages = await mapPool(paths.sort(), 6, async (filePath) => {
    const { markdown } = await readGithub(filePath)
    return summarize(filePath, markdown)
  })
  return { pages, mode: current }
}

export async function readPage(filePath: string) {
  assertPath(filePath)
  const current = mode()
  if (current === "local") {
    const abs = localFile(filePath)
    try {
      const markdown = await fs.readFile(abs, "utf8")
      return { markdown, sha: hash(markdown), mode: current, summary: summarize(filePath, markdown) }
    } catch {
      throw new ContentError("That page was not found", 404)
    }
  }
  try {
    const file = await readGithub(filePath)
    return { ...file, mode: current, summary: summarize(filePath, file.markdown) }
  } catch (error) {
    if (error instanceof ContentError) throw error
    const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0
    if (status === 404) throw new ContentError("That page was not found", 404)
    throw new ContentError(error instanceof Error ? error.message : "Could not read the page", 500)
  }
}

async function starterFor(kind: string) {
  const spec = templateById(kind)
  if (!spec) throw new ContentError(`Unknown kind "${kind}"`)
  const file = path.join(process.cwd(), "starters", spec.starter)
  try {
    return await fs.readFile(file, "utf8")
  } catch {
    throw new ContentError(`Missing starter ${spec.starter}`, 500)
  }
}

export async function createPage(kind: string, title: string): Promise<WriteResult> {
  const cleanTitle = title.trim()
  if (!cleanTitle) throw new ContentError("Give the page a title")
  const slug = slugify(cleanTitle)
  if (!slug) throw new ContentError("That title produces an empty slug — try plainer characters")
  const filePath = pagePath(kind, slug)
  const today = new Date().toISOString().slice(0, 10)
  const starter = await starterFor(kind)
  const markdown = applyAction(fillStarter(starter, cleanTitle, slug, today), "create", today)
  return writePage(filePath, markdown, "create", null)
}

export async function writePage(
  filePath: string,
  markdown: string,
  action: SaveAction,
  sha: string | null
): Promise<WriteResult> {
  assertPath(filePath)
  const today = new Date().toISOString().slice(0, 10)
  const next = applyAction(markdown, action === "create" ? "create" : action, today)
  const message = commitMessage(action, titleFromMarkdown(next))
  const current = mode()
  const summary = summarize(filePath, next)
  const publicUrl = `${siteBase()}${requirePublic(filePath, summary.slug)}`

  if (current === "local") {
    const abs = localFile(filePath)
    let existing: string | null = null
    try {
      existing = await fs.readFile(abs, "utf8")
    } catch {
      existing = null
    }
    if (action === "create" && existing !== null) {
      throw new ContentError(`Already exists: ${filePath}`, 409)
    }
    if (action !== "create" && existing === null) {
      throw new ContentError("That page was not found", 404)
    }
    if (existing !== null && sha && hash(existing) !== sha) {
      throw new ContentError("This file changed since you opened it. Reload, then save again.", 409)
    }
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, next)
    return {
      path: filePath,
      sha: hash(next),
      markdown: next,
      publicUrl,
      commitUrl: null,
      mode: "local",
      message,
    }
  }

  if (action === "create") {
    try {
      await readGithub(filePath)
      throw new ContentError(`Already exists: ${filePath}`, 409)
    } catch (error) {
      if (error instanceof ContentError && error.status !== 404) throw error
    }
  }
  const written = await writeGithub(filePath, next, message, action === "create" ? null : sha)
  return {
    path: filePath,
    sha: written.sha,
    markdown: next,
    publicUrl,
    commitUrl: written.commitUrl,
    mode: "github",
    message,
  }
}

export async function writeMedia(filename: string, bytes: Buffer): Promise<{ url: string; mode: "github" | "local" }> {
  const safe = filename.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "")
  if (!/^[a-z0-9.-]+\.(png|jpe?g|gif|webp|svg|avif)$/.test(safe)) {
    throw new ContentError("Use a png, jpg, gif, webp, svg, or avif image")
  }
  const filePath = `assets/uploads/${Date.now()}-${safe}`
  const current = mode()
  if (current === "local") {
    const root = localRoot()
    const abs = path.resolve(root, filePath)
    const uploads = path.resolve(root, "assets", "uploads")
    if (!abs.startsWith(uploads + path.sep)) {
      throw new ContentError("That upload path is not allowed")
    }
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, bytes)
    return { url: `/${filePath}`, mode: current }
  }
  const { owner, repo, branch } = repoCoords()
  await octokit().rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `content: add image ${safe}`,
    content: bytes.toString("base64"),
    branch,
  })
  return { url: `/${filePath}`, mode: current }
}
