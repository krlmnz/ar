export const SESSION_COOKIE = "ar_studio"
export const OAUTH_COOKIE = "ar_oauth"
const MAX_AGE = 60 * 60 * 24 * 14

export type Session = { login: string; exp: number }

export function sessionSecret(): string | null {
  return (
    process.env.AUTH_SECRET ||
    process.env.EDITOR_SESSION_SECRET ||
    process.env.EDITOR_PASSWORD ||
    process.env.GITHUB_CLIENT_SECRET ||
    null
  )
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  }
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = ""
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function b64urlToBytes(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4))
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))
  return bytesToB64url(new Uint8Array(sig))
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function signSession(login: string): Promise<string> {
  const secret = sessionSecret()
  if (!secret) throw new Error("Set AUTH_SECRET or EDITOR_PASSWORD before signing in")
  const payload: Session = {
    login,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  }
  const body = bytesToB64url(new TextEncoder().encode(JSON.stringify(payload)))
  const sig = await hmac(body, secret)
  return `${body}.${sig}`
}

export async function readSession(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null
  const secret = sessionSecret()
  if (!secret) return null
  const [body, sig] = token.split(".")
  if (!body || !sig) return null
  const expected = await hmac(body, secret)
  if (!safeEqual(expected, sig)) return null
  try {
    const json = JSON.parse(new TextDecoder().decode(b64urlToBytes(body))) as Session
    if (!json?.login || !json.exp || json.exp < Date.now() / 1000) return null
    return json
  } catch {
    return null
  }
}

export async function passwordsMatch(given: string, expected: string): Promise<boolean> {
  const digest = async (value: string) => {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
    return bytesToB64url(new Uint8Array(buf))
  }
  return safeEqual(await digest(given), await digest(expected))
}

export function githubAllowlist(): string[] {
  const raw = process.env.EDITOR_GITHUB_LOGIN || process.env.CONTENT_OWNER || "krlmnz"
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/"
  return value
}
