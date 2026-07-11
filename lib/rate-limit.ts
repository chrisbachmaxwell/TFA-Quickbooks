// Failure-count rate limiting with a per-key limit AND a global cap: the
// per-key limit throttles an honest-but-wrong client, the global cap stops
// an attacker who rotates spoofable keys (x-forwarded-for is client input).

export interface RateLimitState {
  perKey: Map<string, { count: number; resetAt: number }>;
  global: { count: number; resetAt: number };
}

export const PER_KEY_LIMIT = 8;
export const GLOBAL_LIMIT = 32;
export const WINDOW_MS = 10 * 60_000;

export function newRateLimitState(): RateLimitState {
  return { perKey: new Map(), global: { count: 0, resetAt: 0 } };
}

export function isBlocked(
  state: RateLimitState,
  key: string,
  now: number,
): boolean {
  if (state.global.resetAt > now && state.global.count >= GLOBAL_LIMIT) {
    return true;
  }
  const entry = state.perKey.get(key);
  return !!entry && entry.resetAt > now && entry.count >= PER_KEY_LIMIT;
}

export function registerFailure(
  state: RateLimitState,
  key: string,
  now: number,
): void {
  const entry = state.perKey.get(key);
  const next =
    entry && entry.resetAt > now
      ? entry
      : { count: 0, resetAt: now + WINDOW_MS };
  next.count += 1;
  state.perKey.set(key, next);
  if (state.global.resetAt <= now) {
    state.global = { count: 0, resetAt: now + WINDOW_MS };
  }
  state.global.count += 1;
}

export function registerSuccess(state: RateLimitState, key: string): void {
  state.perKey.delete(key);
}
