import { NextResponse } from "next/server"
import { cookieOptions, OAUTH_COOKIE, safeNextPath } from "@/lib/session"

export const dynamic = "force-dynamic"

function originOf(request: Request) {
  if (process.env.EDITOR_URL) return process.env.EDITOR_URL.replace(/\/$/, "")
  const url = new URL(request.url)
  const host = request.headers.get("x-forwarded-host") || url.host
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "")
  return `${proto}://${host}`
}

export async function GET(request: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
    return NextResponse.json({ error: "GitHub OAuth is not configured" }, { status: 400 })
  }
  const next = safeNextPath(new URL(request.url).searchParams.get("next"))
  const state = crypto.randomUUID()
  const redirectUri = `${originOf(request)}/api/auth/callback`
  const authorize = new URL("https://github.com/login/oauth/authorize")
  authorize.searchParams.set("client_id", clientId)
  authorize.searchParams.set("redirect_uri", redirectUri)
  authorize.searchParams.set("scope", "read:user")
  authorize.searchParams.set("state", state)
  const response = NextResponse.redirect(authorize)
  response.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, next }), {
    ...cookieOptions(),
    maxAge: 60 * 10,
  })
  return response
}
