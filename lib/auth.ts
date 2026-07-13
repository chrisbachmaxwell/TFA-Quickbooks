import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

// Passwordless sessions: the cookie is `base64url(email|expiresMs).hmac`,
// signed with SESSION_SECRET. The middleware verifies the same construction
// with Web Crypto — keep the two in sync. Rotating SESSION_SECRET signs
// everyone out.
export const SESSION_COOKIE = "tfa_session";
export const SESSION_DAYS = 30;
export const LINK_EXPIRY_MINUTES = 15;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function sessionCookieFor(
  email: string,
  secret: string,
  now = Date.now(),
): string {
  const payload = `${email}|${now + SESSION_DAYS * 24 * 60 * 60 * 1000}`;
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${hmacHex(secret, payload)}`;
}

/** Returns the email for a valid, unexpired session cookie; null otherwise. */
export function verifySessionCookie(
  cookie: string,
  secret: string,
  now = Date.now(),
): string | null {
  const dot = cookie.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = cookie.slice(0, dot);
  const signature = cookie.slice(dot + 1);
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString();
  } catch {
    return null;
  }
  const expected = hmacHex(secret, payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const sep = payload.lastIndexOf("|");
  if (sep <= 0) return null;
  const email = payload.slice(0, sep);
  const expiresMs = Number(payload.slice(sep + 1));
  if (!Number.isFinite(expiresMs) || expiresMs <= now) return null;
  return email;
}

/** A fresh magic-link token (sent to the user) and its hash (stored). */
export function newLoginToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashLoginToken(token) };
}

export function hashLoginToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
