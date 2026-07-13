import { NextResponse, type NextRequest } from "next/server";

// Edge twin of lib/auth.ts verifySessionCookie: cookie is
// base64url(email|expiresMs) + "." + HMAC-SHA256(SESSION_SECRET, payload).
const SESSION_COOKIE = "tfa_session";

let cachedKey: { secret: string; key: CryptoKey } | null = null;

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (cachedKey?.secret === secret) return cachedKey.key;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  cachedKey = { secret, key };
  return key;
}

function b64urlDecode(s: string): string | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    return atob(b64);
  } catch {
    return null;
  }
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function validSession(cookie: string, secret: string): Promise<boolean> {
  const dot = cookie.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = b64urlDecode(cookie.slice(0, dot));
  if (!payload) return false;
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    new TextEncoder().encode(payload),
  );
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (!safeEqual(cookie.slice(dot + 1), expected)) return false;
  const sep = payload.lastIndexOf("|");
  if (sep <= 0) return false;
  const expiresMs = Number(payload.slice(sep + 1));
  return Number.isFinite(expiresMs) && expiresMs > Date.now();
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname.startsWith("/login/verify")) {
    return NextResponse.next();
  }
  const secret = process.env.SESSION_SECRET;
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = !!secret && !!cookie && (await validSession(cookie, secret));
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
