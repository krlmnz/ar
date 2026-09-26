import { NextResponse } from "next/server"
import { ContentError, createPage, listPages, readPage, writePage } from "@/lib/server/content"
import type { SaveAction } from "@/lib/markdown-file"

export const dynamic = "force-dynamic"

function fail(error: unknown) {
  if (error instanceof ContentError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  const message = error instanceof Error ? error.message : "Something went wrong"
  return NextResponse.json({ error: message }, { status: 500 })
}

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path")
  try {
    if (!path) {
      const listed = await listPages()
      return NextResponse.json(listed)
    }
    const page = await readPage(path)
    return NextResponse.json({
      path,
      sha: page.sha,
      markdown: page.markdown,
      mode: page.mode,
      summary: page.summary,
    })
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { kind?: string; title?: string }
  try {
    const result = await createPage(String(body.kind || ""), String(body.title || ""))
    return NextResponse.json(result)
  } catch (error) {
    return fail(error)
  }
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    path?: string
    markdown?: string
    sha?: string | null
    action?: SaveAction
  }
  const action = body.action
  if (action !== "save" && action !== "publish" && action !== "unpublish") {
    return NextResponse.json({ error: "Choose save, publish, or unpublish" }, { status: 400 })
  }
  try {
    const result = await writePage(String(body.path || ""), String(body.markdown || ""), action, body.sha ?? null)
    return NextResponse.json(result)
  } catch (error) {
    return fail(error)
  }
}
