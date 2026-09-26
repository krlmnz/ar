"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

const STEPS = [
  { id: "library", label: "Library" },
  { id: "template", label: "Template" },
  { id: "write", label: "Write" },
  { id: "preview", label: "Preview" },
  { id: "publish", label: "Publish" },
] as const

export type StudioStep = (typeof STEPS)[number]["id"]

export function StudioShell({
  step,
  published = false,
  onWrite,
  onPreview,
  children,
}: {
  step: StudioStep
  published?: boolean
  onWrite?: () => void
  onPreview?: () => void
  children: React.ReactNode
}) {
  const [login, setLogin] = useState("")
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setLogin(data?.login || ""))
      .catch(() => setLogin(""))
  }, [])

  const order = STEPS.findIndex((item) => item.id === step)

  return (
    <div className="studio">
      <header className="studio-header">
        <Link href="/" className="brand" aria-label="Andean Road studio">
          <svg width="32" height="32" viewBox="0 0 41 40" aria-hidden="true">
            <path d="M20.2 8.5 6 28.7h28.4L20.2 8.5Z" fill="#161918" />
            <path d="M4 30.5h33v4.2H4z" fill="#7c7c7c" />
          </svg>
          <span>
            <strong>Andean Road</strong>
            <span>Studio</span>
          </span>
        </Link>
        <nav className="way" aria-label="Publishing steps">
          {STEPS.map((item, index) => {
            const state = index < order ? "done" : index === order ? "now" : "next"
            const label = item.id === "publish" && published ? "Published" : item.label
            const inner = (
              <>
                <span className="way-num">{index < order ? "✓" : index + 1}</span>
                {label}
              </>
            )
            return (
              <span key={item.id} style={{ display: "contents" }}>
                {index > 0 ? <span className="way-line" /> : null}
                {item.id === "library" ? (
                  <Link className="way-step" data-state={state} href="/" aria-current={state === "now" ? "step" : undefined}>
                    {inner}
                  </Link>
                ) : item.id === "template" ? (
                  <Link className="way-step" data-state={state} href="/new" aria-current={state === "now" ? "step" : undefined}>
                    {inner}
                  </Link>
                ) : item.id === "write" && onWrite ? (
                  <button type="button" className="way-step" data-state={state} onClick={onWrite} aria-current={state === "now" ? "step" : undefined}>
                    {inner}
                  </button>
                ) : item.id === "preview" && onPreview ? (
                  <button type="button" className="way-step" data-state={state} onClick={onPreview} aria-current={state === "now" ? "step" : undefined}>
                    {inner}
                  </button>
                ) : (
                  <button type="button" className="way-step" data-state={item.id === "publish" && published ? "done" : state} disabled>
                    {inner}
                  </button>
                )}
              </span>
            )
          })}
        </nav>
        <div className="header-actions">
          <Link className="btn btn-primary" href="/new">New page</Link>
          {login ? <span className="who">{login === "krlmnz" ? "Karol" : login}</span> : null}
          <button
            type="button"
            className="btn btn-quiet"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" })
              window.location.href = "/login"
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="studio-main">{children}</div>
    </div>
  )
}
