"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export function LoginForm() {
  const params = useSearchParams()
  const next = params.get("next") || "/"
  const [options, setOptions] = useState<{ password: boolean; github: boolean; configured: boolean } | null>(null)
  const [password, setPassword] = useState("")
  const [error, setError] = useState(params.get("error") || "")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    fetch("/api/auth/options")
      .then((res) => res.json())
      .then(setOptions)
      .catch(() => setOptions({ password: false, github: false, configured: false }))
  }, [])

  return (
    <div className="login-wrap">
      <div className="login-card">
        <p className="eyebrow">Andean Road</p>
        <h1>Studio</h1>
        <p className="lede">A private desk for writing the site. Sign in to open the library.</p>
        {error ? <div className="banner error">{error}</div> : null}
        {options?.github ? (
          <p><a className="btn btn-primary" href={`/api/auth/github?next=${encodeURIComponent(next)}`}>Continue with GitHub</a></p>
        ) : null}
        {options?.password ? (
          <form
            onSubmit={async (event) => {
              event.preventDefault()
              setPending(true)
              setError("")
              const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ password }),
              })
              const data = await res.json()
              if (!res.ok) {
                setError(data.error || "Could not sign in")
                setPending(false)
                return
              }
              window.location.href = next
            }}
          >
            <label className="field">
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            </label>
            <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Checking…" : "Enter"}</button>
          </form>
        ) : null}
        {options && !options.password && !options.github ? (
          <div className="banner">
            Set <code>EDITOR_PASSWORD</code>, or <code>GITHUB_CLIENT_ID</code> and <code>GITHUB_CLIENT_SECRET</code>, plus <code>AUTH_SECRET</code>. See the editor README.
          </div>
        ) : null}
      </div>
    </div>
  )
}
