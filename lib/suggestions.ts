// Payee-memory: the last account a description was categorized to becomes
// the pre-selected suggestion next time that description shows up.

export interface CategorizedSample {
  description: string;
  accountId: string;
  at: Date; // when it was categorized — last one wins
}

export function normalizeDescription(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildSuggestionMap(
  samples: CategorizedSample[],
): Map<string, string> {
  const sorted = [...samples].sort((a, b) => a.at.getTime() - b.at.getTime());
  const map = new Map<string, string>();
  for (const sample of sorted) {
    map.set(normalizeDescription(sample.description), sample.accountId);
  }
  return map;
}
