import { describe, expect, it } from "vitest";
import {
  balanceSheet,
  buildCategorizationLines,
  profitAndLoss,
  trialBalance,
  type AccountInfo,
  type DatedLine,
} from "./ledger";
import {
  balanceSheetCsv,
  centsToDecimal,
  csvEscape,
  pnlCsv,
  trialBalanceCsv,
} from "./report-csv";
import { comparePnl, previousPeriod } from "./comparison";

const accounts: AccountInfo[] = [
  { id: "checking", name: "TFA Checking", type: "ASSET" },
  { id: "dividends", name: "Dividend Income", type: "INCOME" },
  { id: "consulting", name: "Consulting Income", type: "INCOME" },
  { id: "office", name: "Office, Misc & Sundry", type: "EXPENSE" }, // comma: exercises escaping
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

const day = (d: string) => new Date(`${d}T00:00:00Z`);

describe("csv primitives", () => {
  it("escapes commas and quotes, formats cents as decimals", () => {
    expect(csvEscape('Office, Misc & "Sundry"')).toBe(
      '"Office, Misc & ""Sundry"""',
    );
    expect(centsToDecimal(1532450)).toBe("15324.50");
    expect(centsToDecimal(-4500)).toBe("-45.00");
    expect(centsToDecimal(1)).toBe("0.01");
  });
});

describe("statement CSVs", () => {
  it("P&L CSV totals equal the report", () => {
    const csv = pnlCsv(
      profitAndLoss(accounts, lines, day("2026-01-01"), day("2026-12-31")),
      "2026-01-01",
      "2026-12-31",
    );
    expect(csv).toContain("Total income,6200.00");
    expect(csv).toContain("Total expenses,875.50");
    expect(csv).toContain("Net income,5324.50");
    expect(csv).toContain('"Office, Misc & Sundry",89.25');
  });

  it("balance-sheet CSV carries the identity", () => {
    const csv = balanceSheetCsv(
      balanceSheet(accounts, lines, day("2026-12-31")),
      "2026-12-31",
    );
    expect(csv).toContain("Total assets,15324.50");
    expect(csv).toContain("Total liabilities + equity,15324.50");
  });

  it("trial-balance CSV totals match", () => {
    const csv = trialBalanceCsv(
      trialBalance(accounts, lines, day("2026-12-31")),
      "2026-12-31",
    );
    expect(csv).toContain("Totals,16200.00,16200.00");
  });
});

describe("previousPeriod", () => {
  it("month-aligned ranges step back whole months", () => {
    const prev = previousPeriod(day("2026-02-01"), day("2026-02-28"));
    expect(prev.from.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(prev.to.toISOString().slice(0, 10)).toBe("2026-01-31");
    const q = previousPeriod(day("2026-04-01"), day("2026-06-30"));
    expect(q.from.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(q.to.toISOString().slice(0, 10)).toBe("2026-03-31");
  });

  it("arbitrary ranges step back by the same day count", () => {
    const prev = previousPeriod(day("2026-03-10"), day("2026-03-19"));
    expect(prev.from.toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(prev.to.toISOString().slice(0, 10)).toBe("2026-03-09");
  });
});

describe("comparePnl", () => {
  it("February vs January, aligned by account with change column", () => {
    const feb = profitAndLoss(accounts, lines, day("2026-02-01"), day("2026-02-28"));
    const jan = profitAndLoss(accounts, lines, day("2026-01-01"), day("2026-01-31"));
    const cmp = comparePnl(feb, jan);
    expect(cmp.incomeTotals).toEqual({
      currentCents: 120000,
      previousCents: 250000,
      changeCents: -130000,
    });
    expect(cmp.netTotals.changeCents).toBe(118500 - 241075);
    // Accounts only in one period still appear, zero-filled on the other side.
    const dividends = cmp.income.find((r) => r.account.id === "dividends")!;
    expect(dividends.currentCents).toBe(0);
    expect(dividends.previousCents).toBe(250000);
  });
});
