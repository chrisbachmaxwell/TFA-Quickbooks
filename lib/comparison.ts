import type { AccountInfo, ProfitAndLoss, ReportSection } from "./ledger";

const DAY_MS = 24 * 60 * 60 * 1000;

function isFirstOfMonth(d: Date): boolean {
  return d.getUTCDate() === 1;
}

function isLastOfMonth(d: Date): boolean {
  const next = new Date(d.getTime() + DAY_MS);
  return next.getUTCDate() === 1;
}

/**
 * The period immediately before [from, to]: previous calendar month(s) when
 * the range is month-aligned, otherwise the same number of days ending the
 * day before `from`.
 */
export function previousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  if (isFirstOfMonth(from) && isLastOfMonth(to)) {
    const monthSpan =
      (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
      (to.getUTCMonth() - from.getUTCMonth()) +
      1;
    const prevFrom = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - monthSpan, 1),
    );
    const prevTo = new Date(from.getTime() - DAY_MS);
    return { from: prevFrom, to: prevTo };
  }
  const spanMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - DAY_MS);
  return { from: new Date(prevTo.getTime() - spanMs), to: prevTo };
}

export interface ComparisonRow {
  account: AccountInfo;
  currentCents: number;
  previousCents: number;
  changeCents: number;
}

export interface PnlComparison {
  income: ComparisonRow[];
  expenses: ComparisonRow[];
  incomeTotals: { currentCents: number; previousCents: number; changeCents: number };
  expenseTotals: { currentCents: number; previousCents: number; changeCents: number };
  netTotals: { currentCents: number; previousCents: number; changeCents: number };
}

function mergeSections(
  current: ReportSection,
  previous: ReportSection,
): ComparisonRow[] {
  const byId = new Map<string, ComparisonRow>();
  for (const row of current.rows) {
    byId.set(row.account.id, {
      account: row.account,
      currentCents: row.balanceCents,
      previousCents: 0,
      changeCents: row.balanceCents,
    });
  }
  for (const row of previous.rows) {
    const existing = byId.get(row.account.id);
    if (existing) {
      existing.previousCents = row.balanceCents;
      existing.changeCents = existing.currentCents - row.balanceCents;
    } else {
      byId.set(row.account.id, {
        account: row.account,
        currentCents: 0,
        previousCents: row.balanceCents,
        changeCents: -row.balanceCents,
      });
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.account.name.localeCompare(b.account.name),
  );
}

export function comparePnl(
  current: ProfitAndLoss,
  previous: ProfitAndLoss,
): PnlComparison {
  const totals = (c: number, p: number) => ({
    currentCents: c,
    previousCents: p,
    changeCents: c - p,
  });
  return {
    income: mergeSections(current.income, previous.income),
    expenses: mergeSections(current.expenses, previous.expenses),
    incomeTotals: totals(current.income.totalCents, previous.income.totalCents),
    expenseTotals: totals(
      current.expenses.totalCents,
      previous.expenses.totalCents,
    ),
    netTotals: totals(current.netIncomeCents, previous.netIncomeCents),
  };
}
