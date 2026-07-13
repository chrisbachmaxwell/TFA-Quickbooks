"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  LINK_EXPIRY_MINUTES,
  newLoginToken,
  normalizeEmail,
  SESSION_COOKIE,
} from "@/lib/auth";
import { sendSignInLink } from "@/lib/email";
import {
  isBlocked,
  newRateLimitState,
  registerFailure,
  type RateLimitState,
} from "@/lib/rate-limit";

// Rate-limit link REQUESTS (per ip and per email — both are attacker-chosen,
// so the limiter's global cap is the real backstop).
const globalState = globalThis as unknown as { __linkLimiter?: RateLimitState };
const limiter: RateLimitState = (globalState.__linkLimiter ??= newRateLimitState());

const NEUTRAL_MESSAGE =
  "If that address is authorized, a sign-in link is on its way. It expires in 15 minutes.";

export async function requestLink(formData: FormData): Promise<void> {
  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const now = Date.now();
  if (!email || !email.includes("@")) {
    redirect(`/login?error=${encodeURIComponent("Enter your email address.")}`);
  }
  // Keyed on the ip+email pair; the limiter's global cap backstops
  // attackers who rotate either half.
  const key = `${ip}|${email}`;
  if (isBlocked(limiter, key, now)) {
    redirect(
      `/login?error=${encodeURIComponent("Too many requests — try again in a few minutes.")}`,
    );
  }
  registerFailure(limiter, key, now);

  const authorized = await prisma.authorizedUser.findUnique({
    where: { email },
  });
  if (authorized) {
    const { token, tokenHash } = newLoginToken();
    await prisma.loginToken.create({
      data: {
        email,
        tokenHash,
        expiresAt: new Date(now + LINK_EXPIRY_MINUTES * 60_000),
      },
    });
    const proto = hdrs.get("x-forwarded-proto") ?? "http";
    const host = hdrs.get("host") ?? "localhost:3000";
    const link = `${proto}://${host}/login/verify?token=${token}`;
    await sendSignInLink({ to: email, link });
  }
  // Same message either way — never reveal whether an email is authorized.
  redirect(`/login?sent=${encodeURIComponent(NEUTRAL_MESSAGE)}`);
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
