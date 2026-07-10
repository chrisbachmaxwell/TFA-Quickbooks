import type { AccountInfo, DatedLine } from "./ledger";

export interface MonthlyTotals {
  month: number; // 0-11
  incomeCents: number;
  expenseCents: number;
}

/** Income and expense totals per calendar month of `year`, from posted lines. */
export function monthlyIncomeExpenses(
  accounts: AccountInfo[],
  lines: DatedLine[],
  year: number,
): MonthlyTotals[] {
  const typeById = new Map(accounts.map((a) => [a.id, a.type]));
  const months: MonthlyTotals[] = Array.from({ length: 12 }, (_, month) => ({
    month,
    incomeCents: 0,
    expenseCents: 0,
  }));
  for (const line of lines) {
    if (line.date.getUTCFullYear() !== year) continue;
    const bucket = months[line.date.getUTCMonth()];
    const type = typeById.get(line.accountId);
    if (type === "INCOME") {
      bucket.incomeCents += line.creditCents - line.debitCents;
    } else if (type === "EXPENSE") {
      bucket.expenseCents += line.debitCents - line.creditCents;
    }
  }
  return months;
}

/** Total balance across all ASSET accounts — the "cash on hand" tile. */
export function cashBalanceCents(
  accounts: AccountInfo[],
  lines: DatedLine[],
): number {
  const assetIds = new Set(
    accounts.filter((a) => a.type === "ASSET").map((a) => a.id),
  );
  let total = 0;
  for (const line of lines) {
    if (!assetIds.has(line.accountId)) continue;
    total += line.debitCents - line.creditCents;
  }
  return total;
}
