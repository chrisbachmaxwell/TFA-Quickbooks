import { describe, expect, it } from "vitest";
import {
  GLOBAL_LIMIT,
  isBlocked,
  newRateLimitState,
  PER_KEY_LIMIT,
  registerFailure,
  registerSuccess,
  WINDOW_MS,
} from "./rate-limit";

describe("rate limiting", () => {
  it("blocks a single key after the per-key limit", () => {
    const state = newRateLimitState();
    for (let i = 0; i < PER_KEY_LIMIT; i++) {
      expect(isBlocked(state, "ip1", 1000)).toBe(false);
      registerFailure(state, "ip1", 1000);
    }
    expect(isBlocked(state, "ip1", 1000)).toBe(true);
    expect(isBlocked(state, "ip2", 1000)).toBe(false);
  });

  it("rotating keys (spoofed x-forwarded-for) still hits the global cap", () => {
    const state = newRateLimitState();
    for (let i = 0; i < GLOBAL_LIMIT; i++) {
      expect(isBlocked(state, `spoof-${i}`, 1000)).toBe(false);
      registerFailure(state, `spoof-${i}`, 1000);
    }
    // A brand-new key is blocked anyway: the global window is exhausted.
    expect(isBlocked(state, "fresh-key", 1000)).toBe(true);
  });

  it("windows expire", () => {
    const state = newRateLimitState();
    for (let i = 0; i < GLOBAL_LIMIT; i++) registerFailure(state, `k${i}`, 1000);
    expect(isBlocked(state, "any", 1000)).toBe(true);
    expect(isBlocked(state, "any", 1000 + WINDOW_MS + 1)).toBe(false);
  });

  it("success clears the per-key count but not the global window", () => {
    const state = newRateLimitState();
    for (let i = 0; i < PER_KEY_LIMIT; i++) registerFailure(state, "ip1", 1000);
    expect(isBlocked(state, "ip1", 1000)).toBe(true);
    registerSuccess(state, "ip1");
    expect(isBlocked(state, "ip1", 1000)).toBe(false);
  });
});
