import { NextResponse, type NextRequest } from "next/server";

// Edge-runtime twin of lib/auth.ts sessionTokenFor — same HMAC, Web Crypto.
const SESSION_COOKIE = "tfa_session";
const SESSION_SALT = "tfa-session-v1";

let cached: { password: string; token: string } | null = null;

async function expectedToken(password: string): Promise<string> {
  if (cached?.password === password) return cached.token;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(SESSION_SALT),
  );
  const token = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  cached = { password, token };
  return token;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login") return NextResponse.next();
  const password = process.env.APP_PASSWORD;
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const authed =
    !!password && !!cookie && safeEqual(cookie, await expectedToken(password));
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
