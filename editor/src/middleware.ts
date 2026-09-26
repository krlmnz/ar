import { NextResponse, type NextRequest } from "next/server"
import { readSession, safeNextPath, SESSION_COOKIE } from "@/lib/session"

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (pathname.startsWith("/api/auth")) return NextResponse.next()

  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session) {
    if (pathname === "/login") return NextResponse.next()
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    url.searchParams.set("next", pathname + search)
    return NextResponse.redirect(url)
  }

  if (pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = safeNextPath(url.searchParams.get("next"))
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
