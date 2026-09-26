import { NextResponse } from "next/server"
import { ContentError, writeMedia } from "@/lib/server/content"

export const dynamic = "force-dynamic"

const MAX = 5 * 1024 * 1024

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file" }, { status: 400 })
  }
  if (file.size > MAX) {
    return NextResponse.json({ error: "Images must be 5MB or smaller" }, { status: 400 })
  }
  try {
    const bytes = Buffer.from(await file.arrayBuffer())
    const saved = await writeMedia(file.name || "image.png", bytes)
    return NextResponse.json(saved)
  } catch (error) {
    if (error instanceof ContentError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    )
  }
}
