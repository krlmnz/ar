import { NextResponse } from "next/server"
import { cookieOptions, passwordsMatch, SESSION_COOKIE, signSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const expected = process.env.EDITOR_PASSWORD
  if (!expected) {
    return NextResponse.json({ error: "Password sign-in is not configured" }, { status: 400 })
  }
  const body = (await request.json().catch(() => ({}))) as { password?: string }
  const given = String(body.password ?? "")
  if (!(await passwordsMatch(given, expected))) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 })
  }
  const login = (process.env.CONTENT_OWNER || "krlmnz").split(",")[0].trim() || "krlmnz"
  const token = await signSession(login)
  const response = NextResponse.json({ ok: true, login })
  response.cookies.set(SESSION_COOKIE, token, cookieOptions())
  return response
}
