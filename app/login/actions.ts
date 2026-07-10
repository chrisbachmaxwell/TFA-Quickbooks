"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { passwordMatches, SESSION_COOKIE, sessionTokenFor } from "@/lib/auth";

// In-memory, per-instance failure tracking. Good enough for a single-user,
// single-instance deployment; a horizontally scaled app would need a store.
// Lives on globalThis because the bundler can instantiate this module once
// per importing chunk — a plain module const would give each copy its own map.
type Attempts = Map<string, { count: number; resetAt: number }>;
const globalState = globalThis as unknown as { __loginAttempts?: Attempts };
const attempts: Attempts = (globalState.__loginAttempts ??= new Map());
const LIMIT = 8;
const WINDOW_MS = 10 * 60_000;

function fail(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData): Promise<void> {
  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && entry.resetAt > now && entry.count >= LIMIT) {
    fail("Too many attempts — try again in a few minutes.");
  }
  const configured = process.env.APP_PASSWORD;
  if (!configured) {
    fail("APP_PASSWORD is not configured on the server.");
  }
  const supplied = String(formData.get("password") ?? "");
  if (!passwordMatches(supplied, configured)) {
    const e =
      entry && entry.resetAt > now
        ? entry
        : { count: 0, resetAt: now + WINDOW_MS };
    e.count += 1;
    attempts.set(ip, e);
    fail("Wrong password.");
  }
  attempts.delete(ip);
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
