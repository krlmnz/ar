import { NextResponse } from "next/server"
import { OAUTH_COOKIE, SESSION_COOKIE } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, "", { ...{ httpOnly: true, path: "/", maxAge: 0 } })
  response.cookies.set(OAUTH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
  return response
}
