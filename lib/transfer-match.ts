// Picks the statement row (or entry) that mirrors a transfer: exact opposite
// amount, within the date window, closest date wins; ties break to the
// earliest, then first-seen.

export const TRANSFER_MATCH_WINDOW_DAYS = 3;
const WINDOW_MS = TRANSFER_MATCH_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export interface MirrorCandidate {
  id: string;
  date: Date;
  amountCents: number;
}

export function pickMirror(
  sourceDate: Date,
  sourceAmountCents: number,
  candidates: MirrorCandidate[],
): string | null {
  let best: MirrorCandidate | null = null;
  let bestDiff = Infinity;
  for (const candidate of candidates) {
    if (candidate.amountCents !== -sourceAmountCents) continue;
    const diff = Math.abs(candidate.date.getTime() - sourceDate.getTime());
    if (diff > WINDOW_MS) continue;
    if (
      diff < bestDiff ||
      (diff === bestDiff && best !== null && candidate.date < best.date)
    ) {
      best = candidate;
      bestDiff = diff;
    }
  }
  return best?.id ?? null;
}
