"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { passwordMatches, SESSION_COOKIE, sessionTokenFor } from "@/lib/auth";
import {
  isBlocked,
  newRateLimitState,
  registerFailure,
  registerSuccess,
  type RateLimitState,
} from "@/lib/rate-limit";

// Per-key + global failure limiting (x-forwarded-for is client-controlled,
// so a per-key map alone is spoofable — the global cap backstops it).
// Lives on globalThis because the bundler can instantiate this module once
// per importing chunk.
const globalState = globalThis as unknown as { __loginLimiter?: RateLimitState };
const limiter: RateLimitState = (globalState.__loginLimiter ??= newRateLimitState());

function fail(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData): Promise<void> {
  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  if (isBlocked(limiter, ip, now)) {
    fail("Too many attempts — try again in a few minutes.");
  }
  const configured = process.env.APP_PASSWORD;
  if (!configured) {
    fail("APP_PASSWORD is not configured on the server.");
  }
  const supplied = String(formData.get("password") ?? "");
  if (!passwordMatches(supplied, configured)) {
    registerFailure(limiter, ip, now);
    fail("Wrong password.");
  }
  registerSuccess(limiter, ip);
  (await cookies()).set(SESSION_COOKIE, sessionTokenFor(configured), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  redirect("/");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
