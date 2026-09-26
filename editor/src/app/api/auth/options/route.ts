import { NextResponse } from "next/server"
import { sessionSecret } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function GET() {
  const password = Boolean(process.env.EDITOR_PASSWORD)
  const github = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
  return NextResponse.json({
    password,
    github,
    configured: Boolean(sessionSecret()) && (password || github),
  })
}
