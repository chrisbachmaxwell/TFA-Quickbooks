import { createHmac, timingSafeEqual } from "crypto";

// Single-user auth: the session cookie holds an HMAC derived from the app
// password. Rotating APP_PASSWORD invalidates every session. The middleware
// recomputes the same value with Web Crypto — keep the two in sync.
export const SESSION_COOKIE = "tfa_session";
const SESSION_SALT = "tfa-session-v1";

export function sessionTokenFor(password: string): string {
  return createHmac("sha256", password).update(SESSION_SALT).digest("hex");
}

export function passwordMatches(input: string, actual: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(actual);
  if (a.length !== b.length) {
    // burn comparable time so length isn't observable
    timingSafeEqual(Buffer.alloc(32), Buffer.alloc(32));
    return false;
  }
  return timingSafeEqual(a, b);
}
