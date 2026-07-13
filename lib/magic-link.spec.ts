import { describe, expect, it } from "vitest";
import {
  hashLoginToken,
  newLoginToken,
  normalizeEmail,
  sessionCookieFor,
  verifySessionCookie,
} from "./auth";

const SECRET = "test-secret";

describe("session cookies", () => {
  it("round-trips a valid cookie to its email", () => {
    const cookie = sessionCookieFor("chrism@pictureline.com", SECRET);
    expect(verifySessionCookie(cookie, SECRET)).toBe("chrism@pictureline.com");
  });

  it("rejects tampered payloads and signatures", () => {
    const cookie = sessionCookieFor("a@b.com", SECRET);
    const [payload, sig] = cookie.split(".");
    const forged =
      Buffer.from("evil@b.com|9999999999999").toString("base64url") + "." + sig;
    expect(verifySessionCookie(forged, SECRET)).toBeNull();
    expect(verifySessionCookie(payload + ".deadbeef", SECRET)).toBeNull();
    expect(verifySessionCookie("garbage", SECRET)).toBeNull();
    expect(verifySessionCookie("", SECRET)).toBeNull();
  });

  it("rejects the right cookie signed with the wrong secret", () => {
    const cookie = sessionCookieFor("a@b.com", "other-secret");
    expect(verifySessionCookie(cookie, SECRET)).toBeNull();
  });

  it("expires", () => {
    const past = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const cookie = sessionCookieFor("a@b.com", SECRET, past);
    expect(verifySessionCookie(cookie, SECRET)).toBeNull();
  });

  it("emails containing separators survive the encoding", () => {
    const tricky = "we|rd.na|me@example.com";
    const cookie = sessionCookieFor(tricky, SECRET);
    expect(verifySessionCookie(cookie, SECRET)).toBe(tricky);
  });
});

describe("login tokens", () => {
  it("generates unique tokens whose hash matches", () => {
    const a = newLoginToken();
    const b = newLoginToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).toBe(hashLoginToken(a.token));
    expect(a.tokenHash).not.toBe(a.token); // never store the raw token
    expect(a.token).toHaveLength(64);
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  ChrisM@Pictureline.COM ")).toBe(
      "chrism@pictureline.com",
    );
  });
});
