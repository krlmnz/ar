import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import {
  cookieOptions,
  githubAllowlist,
  OAUTH_COOKIE,
  SESSION_COOKIE,
  signSession,
} from "@/lib/session"

export const dynamic = "force-dynamic"

function originOf(request: Request) {
  if (process.env.EDITOR_URL) return process.env.EDITOR_URL.replace(/\/$/, "")
  const url = new URL(request.url)
  const host = request.headers.get("x-forwarded-host") || url.host
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "")
  return `${proto}://${host}`
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const jar = await cookies()
  const raw = jar.get(OAUTH_COOKIE)?.value
  let pending: { state?: string; next?: string } = {}
  try {
    pending = raw ? JSON.parse(raw) : {}
  } catch {
    pending = {}
  }
  const fail = (message: string) => {
    const back = NextResponse.redirect(`${originOf(request)}/login?error=${encodeURIComponent(message)}`)
    back.cookies.set(OAUTH_COOKIE, "", { path: "/", maxAge: 0 })
    return back
  }
  if (!code || !state || !pending.state || pending.state !== state) return fail("GitHub sign-in expired. Try again.")
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) return fail("GitHub OAuth is not configured")

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${originOf(request)}/api/auth/callback`,
      state,
    }),
  })
  const tokenJson = (await tokenRes.json().catch(() => ({}))) as { access_token?: string }
  if (!tokenJson.access_token) return fail("GitHub did not return a token")

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "andean-road-editor",
    },
  })
  const user = (await userRes.json().catch(() => ({}))) as { login?: string }
  const login = (user.login || "").toLowerCase()
  if (!githubAllowlist().includes(login)) {
    return fail(`GitHub account @${user.login || "unknown"} is not allowed to open this studio`)
  }

  const session = await signSession(login)
  const next = pending.next && pending.next.startsWith("/") && !pending.next.startsWith("//") ? pending.next : "/"
  const response = NextResponse.redirect(`${originOf(request)}${next}`)
  response.cookies.set(SESSION_COOKIE, session, cookieOptions())
  response.cookies.set(OAUTH_COOKIE, "", { path: "/", maxAge: 0 })
  return response
}
