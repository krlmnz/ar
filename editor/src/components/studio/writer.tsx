"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { FieldsPanel } from "@/components/studio/fields-panel"
import { StudioShell } from "@/components/studio/shell"
import { joinMarkdown, splitMarkdown, type SaveAction } from "@/lib/markdown-file"
import { kindFromLayout, templateById } from "@/lib/templates"
import { parseDocument } from "yaml"

type Notice = { kind: "ok" | "error"; text: string; href?: string; note?: string }

export function Writer() {
  const params = useSearchParams()
  const path = params.get("path") || ""
  const [fm, setFm] = useState("")
  const [body, setBody] = useState("")
  const [sha, setSha] = useState<string | null>(null)
  const [mode, setMode] = useState<"write" | "preview">("write")
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<SaveAction | "">("")
  const [notice, setNotice] = useState<Notice | null>(null)
  const [source, setSource] = useState<"github" | "local" | "">("")

  useEffect(() => {
    if (!path) {
      setLoading(false)
      return
    }
    let cancel = false
    setLoading(true)
    fetch(`/api/pages?path=${encodeURIComponent(path)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Could not open the page")
        if (cancel) return
        const parts = splitMarkdown(data.markdown || "")
        setFm(parts.fm)
        setBody(parts.body)
        setSha(data.sha || null)
        setSource(data.mode || "")
        setNotice(null)
      })
      .catch((error: Error) => {
        if (!cancel) setNotice({ kind: "error", text: error.message })
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [path])

  const meta = useMemo(() => {
    try {
      const data = parseDocument(fm).toJS() as Record<string, unknown> | null
      return data || {}
    } catch {
      return {}
    }
  }, [fm])

  const kind =
    kindFromLayout(meta.layout) ||
    (path.startsWith("content/places/") ? "place" : "center")
  const spec = templateById(kind)
  const title = typeof meta.title === "string" ? meta.title : "Untitled"
  const published = meta.published !== false
  const theme = typeof meta.theme === "string" ? meta.theme : ""
  const subtitle = typeof meta.subtitle === "string" ? meta.subtitle : ""

  async function commit(action: SaveAction) {
    setPending(action)
    setNotice(null)
    try {
      const res = await fetch("/api/pages", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          path,
          markdown: joinMarkdown(fm, body),
          sha,
          action,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Save failed")
      const parts = splitMarkdown(data.markdown || "")
      setFm(parts.fm)
      setSha(data.sha || null)
      const local = data.mode === "local"
      setNotice({
        kind: "ok",
        text: local
          ? `Saved locally (${data.message}). Set GITHUB_TOKEN to commit this to the repository.`
          : `${data.message}. Netlify may take a minute to rebuild andean-road.com.`,
        href: data.publicUrl,
        note: data.commitUrl || undefined,
      })
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Save failed" })
    } finally {
      setPending("")
    }
  }

  if (!path) {
    return (
      <StudioShell step="write">
        <div className="page-pad">
          <h1>Open a page from the library.</h1>
          <Link className="btn btn-primary" href="/">Library</Link>
        </div>
      </StudioShell>
    )
  }

  return (
    <StudioShell
      step={mode === "preview" ? "preview" : "write"}
      published={published}
      onWrite={() => setMode("write")}
      onPreview={() => setMode("preview")}
    >
      <div className="writer">
        <section className="canvas-col">
          <div className="canvas-toolbar">
            <div className="crumbs">
              <Link href="/">Library</Link>
              <span>/</span>
              <span>{spec?.title || kind}</span>
              <span>/</span>
              <strong>{title}</strong>
            </div>
            <span className="status" data-state={published ? "published" : "draft"}>
              {published ? "Published" : "Draft"}
            </span>
            <button type="button" className="btn" aria-pressed={mode === "write"} onClick={() => setMode("write")}>Write</button>
            <button type="button" className="btn" aria-pressed={mode === "preview"} onClick={() => setMode("preview")}>Preview</button>
          </div>
          <div className="canvas-frame">
            {loading ? <p className="page-pad">Opening the page…</p> : (
              <div className={`page-preview${mode === "preview" ? " is-on" : ""}`} data-theme={theme || undefined}>
                {mode === "preview" ? (
                  <header className="preview-mast">
                    <p className="kicker">{spec?.title || kind}</p>
                    <h1>{title}</h1>
                    {subtitle ? <p className="standfirst">{subtitle}</p> : null}
                  </header>
                ) : null}
                <SimpleEditor
                  key={path}
                  embedded
                  markdown={body}
                  editable={mode === "write"}
                  showChrome={mode === "write"}
                  onChange={setBody}
                />
              </div>
            )}
          </div>
        </section>
        <aside className="side">
          {!loading ? <FieldsPanel key={path} kind={kind} value={fm} onChange={setFm} /> : null}
          <div className="actions">
            <button type="button" className="btn" disabled={!!pending || loading} onClick={() => commit("save")}>
              {pending === "save" ? "Saving…" : "Save draft"}
            </button>
            <button type="button" className="btn btn-primary" disabled={!!pending || loading} onClick={() => commit("publish")}>
              {pending === "publish" ? "Publishing…" : "Publish"}
            </button>
            <button type="button" className="btn" disabled={!!pending || loading || !published} onClick={() => commit("unpublish")}>
              {pending === "unpublish" ? "Updating…" : "Unpublish"}
            </button>
          </div>
          {notice ? (
            <div className={`banner${notice.kind === "error" ? " error" : ""}`}>
              <div>{notice.text}</div>
              {notice.href ? <div><a href={notice.href}>{notice.href}</a></div> : null}
              {notice.note ? <div><a href={notice.note}>View commit</a></div> : null}
            </div>
          ) : (
            <p className="hint">
              Save draft writes <code>published: false</code>. Publish sets it to true and commits
              {source === "github" ? " to the repository." : "."} The public URL is ready once Netlify finishes.
            </p>
          )}
        </aside>
      </div>
    </StudioShell>
  )
}
