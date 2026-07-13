import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashLoginToken, SESSION_COOKIE, sessionCookieFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

function reject(req: NextRequest, message: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?error=${encodeURIComponent(message)}`;
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const secret = process.env.SESSION_SECRET;
  if (!secret) return reject(req, "SESSION_SECRET is not configured on the server.");
  if (!token) return reject(req, "That sign-in link is incomplete.");

  // Atomic consume: only one visit can claim the token.
  const now = new Date();
  const claimed = await prisma.loginToken.updateMany({
    where: {
      tokenHash: hashLoginToken(token),
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
  });
  if (claimed.count === 0) {
    return reject(req, "That sign-in link is invalid, expired, or already used — request a new one.");
  }
  const record = await prisma.loginToken.findUnique({
    where: { tokenHash: hashLoginToken(token) },
  });
  // The allowlist is re-checked at sign-in, so removing a user kills their
  // outstanding links too.
  const stillAuthorized =
    record &&
    (await prisma.authorizedUser.findUnique({ where: { email: record.email } }));
  if (!stillAuthorized) {
    return reject(req, "That sign-in link is invalid, expired, or already used — request a new one.");
  }

  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  const res = NextResponse.redirect(url);
  res.cookies.set(SESSION_COOKIE, sessionCookieFor(record.email, secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
