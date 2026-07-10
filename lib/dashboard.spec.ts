import { describe, expect, it } from "vitest";
import {
  buildCategorizationLines,
  type AccountInfo,
  type DatedLine,
} from "./ledger";
import { cashBalanceCents, monthlyIncomeExpenses } from "./dashboard";

// Same fixture mirror as lib/reports.spec.ts — the dashboard tiles and the
// monthly chart must agree with the statements built from identical data.
const accounts: AccountInfo[] = [
  { id: "checking", name: "TFA Checking", type: "ASSET" },
  { id: "dividends", name: "Dividend Income", type: "INCOME" },
  { id: "consulting", name: "Consulting Income", type: "INCOME" },
  { id: "office", name: "Office Expenses", type: "EXPENSE" },
  { id: "bankfees", name: "Bank Fees", type: "EXPENSE" },
  { id: "legal", name: "Legal & Professional", type: "EXPENSE" },
  { id: "insurance", name: "Insurance", type: "EXPENSE" },
  { id: "contrib", name: "Owner Contributions", type: "EQUITY" },
];

const statement: Array<[string, string, number]> = [
  ["2026-01-05", "dividends", 250000],
  ["2026-01-12", "office", -8925],
  ["2026-02-03", "consulting", 120000],
  ["2026-02-14", "bankfees", -1500],
  ["2026-03-01", "dividends", 250000],
  ["2026-03-10", "legal", -45075],
  ["2026-03-15", "contrib", 1000000],
  ["2026-04-02", "insurance", -32050],
];

const lines: DatedLine[] = statement.flatMap(([date, categoryId, cents]) =>
  buildCategorizationLines("checking", categoryId, cents).map((line) => ({
    ...line,
    date: new Date(`${date}T00:00:00Z`),
  })),
);

describe("monthlyIncomeExpenses", () => {
  const months = monthlyIncomeExpenses(accounts, lines, 2026);

  it("returns all 12 months", () => {
    expect(months).toHaveLength(12);
    expect(months.map((m) => m.month)).toEqual([...Array(12).keys()]);
  });

  it("buckets the fixture months correctly", () => {
    expect(months[0]).toEqual({ month: 0, incomeCents: 250000, expenseCents: 8925 });
    expect(months[1]).toEqual({ month: 1, incomeCents: 120000, expenseCents: 1500 });
    expect(months[2]).toEqual({ month: 2, incomeCents: 250000, expenseCents: 45075 });
    expect(months[3]).toEqual({ month: 3, incomeCents: 0, expenseCents: 32050 });
  });

  it("months without activity are zero, and equity never leaks in", () => {
    for (let m = 4; m < 12; m++) {
      expect(months[m]).toEqual({ month: m, incomeCents: 0, expenseCents: 0 });
    }
    // March holds the $10,000 owner contribution — income there is dividends only.
    expect(months[2].incomeCents).toBe(250000);
  });

  it("the year filter excludes other years", () => {
    const other = monthlyIncomeExpenses(accounts, lines, 2025);
    expect(other.every((m) => m.incomeCents === 0 && m.expenseCents === 0)).toBe(true);
  });

  it("chart totals reconcile with the P&L totals", () => {
    const income = months.reduce((s, m) => s + m.incomeCents, 0);
    const expenses = months.reduce((s, m) => s + m.expenseCents, 0);
    expect(income).toBe(620000);
    expect(expenses).toBe(87550);
  });
});

describe("cashBalanceCents", () => {
  it("matches the balance-sheet asset total", () => {
    expect(cashBalanceCents(accounts, lines)).toBe(1532450);
  });

  it("is zero with no lines", () => {
    expect(cashBalanceCents(accounts, [])).toBe(0);
  });
});
