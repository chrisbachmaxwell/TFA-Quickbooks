import { describe, expect, it } from "vitest";
import {
  balanceSheet,
  buildCategorizationLines,
  profitAndLoss,
  type AccountInfo,
  type DatedLine,
} from "./ledger";

// Mirrors fixtures/sample-bank-statement.csv, categorized the way the e2e
// suite categorizes it — so the browser tests and this math check each other.
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

describe("balanceSheet", () => {
  it("balances for the full fixture: assets 15,324.50 = liabilities + equity", () => {
    const report = balanceSheet(accounts, lines, new Date("2026-12-31T00:00:00Z"));
    expect(report.totalAssetsCents).toBe(1532450);
    expect(report.liabilities.totalCents).toBe(0);
    expect(report.equity.totalCents).toBe(1000000);
    expect(report.retainedEarningsCents).toBe(532450);
    expect(report.totalLiabilitiesAndEquityCents).toBe(1532450);
    expect(report.totalAssetsCents).toBe(report.totalLiabilitiesAndEquityCents);
  });

  it("respects the as-of date (2026-02-28: assets 3,595.75, all retained earnings)", () => {
    const report = balanceSheet(accounts, lines, new Date("2026-02-28T00:00:00Z"));
    expect(report.totalAssetsCents).toBe(359575);
    expect(report.equity.totalCents).toBe(0);
    expect(report.retainedEarningsCents).toBe(359575);
    expect(report.totalAssetsCents).toBe(report.totalLiabilitiesAndEquityCents);
  });

  it("is empty before any activity", () => {
    const report = balanceSheet(accounts, lines, new Date("2025-12-31T00:00:00Z"));
    expect(report.totalAssetsCents).toBe(0);
    expect(report.totalLiabilitiesAndEquityCents).toBe(0);
  });
});

describe("profitAndLoss", () => {
  it("full year: income 6,200.00, expenses 875.50, net 5,324.50", () => {
    const report = profitAndLoss(
      accounts,
      lines,
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-12-31T00:00:00Z"),
    );
    expect(report.income.totalCents).toBe(620000);
    expect(report.expenses.totalCents).toBe(87550);
    expect(report.netIncomeCents).toBe(532450);
  });

  it("respects the date range (Jan–Feb: income 3,700.00, expenses 104.25, net 3,595.75)", () => {
    const report = profitAndLoss(
      accounts,
      lines,
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-02-28T00:00:00Z"),
    );
    expect(report.income.totalCents).toBe(370000);
    expect(report.expenses.totalCents).toBe(10425);
    expect(report.netIncomeCents).toBe(359575);
  });

  it("range boundaries are inclusive", () => {
    const report = profitAndLoss(
      accounts,
      lines,
      new Date("2026-01-05T00:00:00Z"),
      new Date("2026-01-05T00:00:00Z"),
    );
    expect(report.income.totalCents).toBe(250000);
    expect(report.expenses.totalCents).toBe(0);
  });

  it("equity contributions never appear in the P&L", () => {
    const report = profitAndLoss(
      accounts,
      lines,
      new Date("2026-03-15T00:00:00Z"),
      new Date("2026-03-15T00:00:00Z"),
    );
    expect(report.income.totalCents).toBe(0);
    expect(report.expenses.totalCents).toBe(0);
    expect(report.netIncomeCents).toBe(0);
  });
});
