"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { StudioShell } from "@/components/studio/shell"
import { TEMPLATES } from "@/lib/templates"
import type { PageSummary } from "@/lib/markdown-file"

export function Library() {
  const [pages, setPages] = useState<PageSummary[]>([])
  const [mode, setMode] = useState<"github" | "local" | "">("")
  const [error, setError] = useState("")
  const [kind, setKind] = useState("all")
  const [status, setStatus] = useState("all")
  const [demos, setDemos] = useState(true)

  useEffect(() => {
    fetch("/api/pages")
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Could not load the library")
        setPages(data.pages || [])
        setMode(data.mode || "")
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  const visible = useMemo(
    () =>
      pages.filter((page) => {
        if (!demos && page.demo) return false
        if (kind !== "all" && page.kind !== kind) return false
        if (status === "draft" && page.published) return false
        if (status === "published" && !page.published) return false
        return true
      }),
    [pages, kind, status, demos]
  )

  return (
    <StudioShell step="library">
      <div className="page-pad">
        <div className="page-head">
          <div>
            <p className="eyebrow">Library</p>
            <h1>Pages</h1>
            <p className="lede">
              Pick a page to keep writing, or start a new one from a template.
              {mode === "local" ? " This studio is reading the files on this machine." : ""}
              {mode === "github" ? " Saving commits to the GitHub repository." : ""}
            </p>
          </div>
          <Link className="btn btn-primary" href="/new">New page</Link>
        </div>
        <div className="filters" role="toolbar" aria-label="Filter pages">
          <button type="button" className="chip" aria-pressed={kind === "all"} onClick={() => setKind("all")}>All kinds</button>
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              className="chip"
              aria-pressed={kind === template.id}
              onClick={() => setKind(template.id)}
            >
              {template.title}
            </button>
          ))}
          <button type="button" className="chip" aria-pressed={status === "draft"} onClick={() => setStatus(status === "draft" ? "all" : "draft")}>Drafts</button>
          <button type="button" className="chip" aria-pressed={status === "published"} onClick={() => setStatus(status === "published" ? "all" : "published")}>Published</button>
          <button type="button" className="chip" aria-pressed={demos} onClick={() => setDemos((value) => !value)}>Demos</button>
        </div>
        {error ? <div className="banner error">{error}</div> : null}
        {visible.length === 0 && !error ? (
          <div className="empty">
            <p>No pages in this view yet.</p>
            <Link className="btn btn-primary" href="/new">New page</Link>
          </div>
        ) : (
          <div className="library">
            {visible.map((page) => (
              <Link key={page.path} className="page-row" href={`/write?path=${encodeURIComponent(page.path)}`}>
                <div>
                  <h2>{page.title}</h2>
                  <p>{page.path}{page.description ? ` — ${page.description}` : ""}</p>
                </div>
                <div className="meta">
                  <span className="kind-pill">{page.kind}</span>
                  {page.theme ? <span className="theme-pill">{page.theme}</span> : null}
                  {page.demo ? <span className="theme-pill">demo</span> : null}
                  <span className="status" data-state={page.published ? "published" : "draft"}>
                    {page.published ? "Published" : "Draft"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StudioShell>
  )
}
