import { parseDocument, type Document } from "yaml"
import { kindFromLayout, templateById } from "./templates"

export type PageSummary = {
  path: string
  slug: string
  title: string
  description: string
  kind: string
  published: boolean
  theme: string
  updated: string
  demo: boolean
}

export type SaveAction = "create" | "save" | "publish" | "unpublish"

/** Same slug rules as scripts/new.js. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export function isContentMarkdown(filePath: string): boolean {
  if (filePath.includes("..") || filePath.includes("\\")) return false
  return /^content\/(?:places\/[a-z0-9-]+\/index|[a-z0-9-]+\/[a-z0-9-]+|[a-z0-9-]+)\.md$/.test(
    filePath
  )
}

export function pagePath(kind: string, slug: string): string {
  const spec = templateById(kind)
  if (!spec) throw new Error(`Unknown kind "${kind}"`)
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("That slug is not usable")
  return spec.dir ? `content/places/${slug}/index.md` : `content/${slug}.md`
}

export function slugFromPath(filePath: string): string {
  const place = filePath.match(/^content\/places\/([a-z0-9-]+)\/index\.md$/)
  if (place) return place[1]
  const file = filePath.match(/^content\/(?:[a-z0-9-]+\/)?([a-z0-9-]+)\.md$/)
  return file?.[1] ?? ""
}

export function publicPath(filePath: string, slug: string): string {
  if (filePath.startsWith("content/places/")) return `/places/${slug}/`
  if (filePath.startsWith("content/demos/")) return `/demo/${slug}/`
  return `/${slug}/`
}

export function splitMarkdown(raw: string): { fm: string; body: string } {
  const text = raw.replace(/^\uFEFF/, "")
  if (!text.startsWith("---")) return { fm: "", body: text }
  const end = text.indexOf("\n---", 3)
  if (end === -1) return { fm: "", body: text }
  let fm = text.slice(4, end)
  if (fm.startsWith("\n")) fm = fm.slice(1)
  let body = text.slice(end + 4)
  if (body.startsWith("\n")) body = body.slice(1)
  return { fm, body }
}

export function joinMarkdown(fm: string, body: string): string {
  const front = fm.replace(/\s+$/, "")
  const prose = body.replace(/^\n+/, "").replace(/\s+$/, "")
  if (!front) return `${prose}\n`
  return `---\n${front}\n---\n\n${prose}\n`
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function dateStamp(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === "string") return value.slice(0, 10)
  return ""
}

export function summarize(filePath: string, raw: string): PageSummary {
  const { fm } = splitMarkdown(raw)
  let data: Record<string, unknown> = {}
  try {
    data = asRecord(parseDocument(fm).toJS())
  } catch {
    data = {}
  }
  const slug = typeof data.slug === "string" && data.slug ? data.slug : slugFromPath(filePath)
  const kind =
    kindFromLayout(data.layout) ??
    (filePath.startsWith("content/places/") ? "place" : "center")
  const description =
    (typeof data.description === "string" && data.description) ||
    (typeof data.subtitle === "string" && data.subtitle) ||
    ""
  return {
    path: filePath,
    slug,
    title: typeof data.title === "string" && data.title ? data.title : slug || "Untitled",
    description,
    kind,
    published: data.published !== false,
    theme: typeof data.theme === "string" ? data.theme : "",
    updated: dateStamp(data.updated),
    demo: filePath.startsWith("content/demos/"),
  }
}

export function titleFromMarkdown(raw: string): string {
  return summarize("content/untitled.md", raw).title
}

export function applyAction(raw: string, action: SaveAction, today = new Date().toISOString().slice(0, 10)): string {
  const { fm, body } = splitMarkdown(raw)
  const doc = parseDocument(fm || "")
  doc.set("published", action === "publish")
  doc.set("updated", today)
  return joinMarkdown(doc.toString(), body)
}

export function commitMessage(action: SaveAction, title: string): string {
  const clean = title.replace(/\s+/g, " ").trim().slice(0, 80) || "untitled"
  if (action === "publish") return `content: publish ${clean}`
  if (action === "unpublish") return `content: unpublish ${clean}`
  if (action === "create") return `content: create ${clean}`
  return `content: update ${clean}`
}

export function fillStarter(starter: string, title: string, slug: string, today: string): string {
  return starter
    .replace(/__TITLE__/g, title.replace(/"/g, '\\"'))
    .replace(/__SLUG__/g, slug)
    .replace(/__DATE__/g, today)
}

export function setInDocument(doc: Document, key: string, value: unknown) {
  const path = key.split(".")
  const empty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  if (empty) {
    doc.deleteIn(path)
    return
  }
  doc.setIn(path, value as never)
}
