"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { StudioShell } from "@/components/studio/shell"
import { Wireframe } from "@/components/studio/wireframe"
import { TEMPLATES } from "@/lib/templates"

export function TemplatePicker() {
  const router = useRouter()
  const [kind, setKind] = useState("guide")
  const [title, setTitle] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const selected = TEMPLATES.find((template) => template.id === kind) ?? TEMPLATES[0]

  async function createPage() {
    setPending(true)
    setError("")
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, title }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not create the page")
      router.push(`/write?path=${encodeURIComponent(data.path)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the page")
      setPending(false)
    }
  }

  return (
    <StudioShell step="template">
      <div className="page-pad">
        <div className="page-head">
          <div>
            <p className="eyebrow">Template</p>
            <h1>What kind of page?</h1>
            <p className="lede">Twelve layouts. Pick the structure, name it, and the draft opens in the editor with the starter already filled in.</p>
          </div>
        </div>
        <div className="template-grid">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              className="template-card"
              aria-pressed={kind === template.id}
              onClick={() => setKind(template.id)}
            >
              <div className="wire"><Wireframe kind={template.id} /></div>
              <div>
                {template.advanced ? <div className="advanced-tag">Advanced</div> : null}
                <h2>{template.title}</h2>
                <p>{template.when}</p>
              </div>
            </button>
          ))}
        </div>
        <form
          className="create-dock"
          onSubmit={(event) => {
            event.preventDefault()
            void createPage()
          }}
        >
          <label>
            New {selected.title.toLowerCase()}
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title"
              aria-label="Page title"
              required
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={pending || !title.trim()}>
            {pending ? "Creating…" : "Create draft"}
          </button>
        </form>
        {error ? <div className="banner error">{error}</div> : null}
      </div>
    </StudioShell>
  )
}
