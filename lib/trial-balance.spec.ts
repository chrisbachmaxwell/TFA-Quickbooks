import { describe, expect, it } from "vitest";
import {
  buildCategorizationLines,
  trialBalance,
  type AccountInfo,
  type DatedLine,
} from "./ledger";

// Same fixture mirror as lib/reports.spec.ts.
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

describe("trialBalance", () => {
  it("full year: total debits = total credits = 16,200.00", () => {
    const tb = trialBalance(accounts, lines, new Date("2026-12-31T00:00:00Z"));
    expect(tb.totalDebitsCents).toBe(1620000);
    expect(tb.totalCreditsCents).toBe(1620000);
    const checking = tb.rows.find((r) => r.account.id === "checking")!;
    expect(checking.debitCents).toBe(1532450);
    expect(checking.creditCents).toBe(0);
    const dividends = tb.rows.find((r) => r.account.id === "dividends")!;
    expect(dividends.creditCents).toBe(500000);
  });

  it("respects the as-of date (through Feb: 3,700.00 both columns)", () => {
    const tb = trialBalance(accounts, lines, new Date("2026-02-28T00:00:00Z"));
    expect(tb.totalDebitsCents).toBe(370000);
    expect(tb.totalCreditsCents).toBe(370000);
  });

  it("zero-balance accounts are omitted", () => {
    const tb = trialBalance(accounts, lines, new Date("2025-12-31T00:00:00Z"));
    expect(tb.rows).toHaveLength(0);
  });
});
