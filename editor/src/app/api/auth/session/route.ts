import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { readSession, SESSION_COOKIE } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function GET() {
  const jar = await cookies()
  const session = await readSession(jar.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  return NextResponse.json({ login: session.login })
}
