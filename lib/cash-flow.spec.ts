import { describe, expect, it } from "vitest";
import { buildCategorizationLines, type AccountInfo } from "./ledger";
import { cashFlow, type DatedEntry } from "./cash-flow";

// The statement fixture, categorized — plus extra cases the CSV can't
// express: an investing purchase and a pure non-cash accrual.
const accounts: AccountInfo[] = [
  { id: "checking", name: "TFA Checking", type: "ASSET" },
  { id: "brokerage", name: "Brokerage Investments", type: "ASSET" }, // non-cash asset
  { id: "dividends", name: "Dividend Income", type: "INCOME" },
  { id: "consulting", name: "Consulting Income", type: "INCOME" },
  { id: "office", name: "Office Expenses", type: "EXPENSE" },
  { id: "bankfees", name: "Bank Fees", type: "EXPENSE" },
  { id: "legal", name: "Legal & Professional", type: "EXPENSE" },
  { id: "insurance", name: "Insurance", type: "EXPENSE" },
  { id: "contrib", name: "Owner Contributions", type: "EQUITY" },
  { id: "loan", name: "Shareholder Loan", type: "LIABILITY" },
];
const cashIds = new Set(["checking"]);

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

const entries: DatedEntry[] = statement.map(([date, categoryId, cents]) => ({
  date: new Date(`${date}T00:00:00Z`),
  lines: buildCategorizationLines("checking", categoryId, cents),
}));

const jan1 = new Date("2026-01-01T00:00:00Z");
const dec31 = new Date("2026-12-31T00:00:00Z");

describe("cashFlow", () => {
  it("full year: operating 5,324.50 + financing 10,000 = net change 15,324.50", () => {
    const cf = cashFlow(accounts, cashIds, entries, jan1, dec31);
    expect(cf.operating.totalCents).toBe(532450);
    expect(cf.investing.totalCents).toBe(0);
    expect(cf.financing.totalCents).toBe(1000000);
    expect(cf.netChangeCents).toBe(1532450);
    expect(cf.beginningCents).toBe(0);
    expect(cf.endingCents).toBe(1532450);
  });

  it("sub-period: February begins at 2,410.75 and ends at 3,595.75", () => {
    const cf = cashFlow(
      accounts,
      cashIds,
      entries,
      new Date("2026-02-01T00:00:00Z"),
      new Date("2026-02-28T00:00:00Z"),
    );
    expect(cf.beginningCents).toBe(241075);
    expect(cf.netChangeCents).toBe(118500);
    expect(cf.endingCents).toBe(359575);
  });

  it("buying a non-cash asset is an investing outflow", () => {
    const withPurchase: DatedEntry[] = [
      ...entries,
      {
        date: new Date("2026-05-01T00:00:00Z"),
        lines: [
          { accountId: "brokerage", debitCents: 500000, creditCents: 0 },
          { accountId: "checking", debitCents: 0, creditCents: 500000 },
        ],
      },
    ];
    const cf = cashFlow(accounts, cashIds, withPurchase, jan1, dec31);
    expect(cf.investing.totalCents).toBe(-500000);
    expect(cf.netChangeCents).toBe(1532450 - 500000);
  });

  it("borrowing cash is a financing inflow", () => {
    const withLoan: DatedEntry[] = [
      ...entries,
      {
        date: new Date("2026-06-01T00:00:00Z"),
        lines: [
          { accountId: "checking", debitCents: 300000, creditCents: 0 },
          { accountId: "loan", debitCents: 0, creditCents: 300000 },
        ],
      },
    ];
    const cf = cashFlow(accounts, cashIds, withLoan, jan1, dec31);
    expect(cf.financing.totalCents).toBe(1000000 + 300000);
  });

  it("entries that touch no cash account are excluded (pure accruals)", () => {
    const withAccrual: DatedEntry[] = [
      ...entries,
      {
        date: new Date("2026-07-01T00:00:00Z"),
        lines: [
          { accountId: "office", debitCents: 99900, creditCents: 0 },
          { accountId: "loan", debitCents: 0, creditCents: 99900 },
        ],
      },
    ];
    const cf = cashFlow(accounts, cashIds, withAccrual, jan1, dec31);
    expect(cf.netChangeCents).toBe(1532450); // unchanged — no cash moved
    expect(cf.operating.totalCents).toBe(532450);
  });

  it("ending cash reconciles with the cash accounts' ledger balance", () => {
    const cf = cashFlow(accounts, cashIds, entries, jan1, dec31);
    let ledgerCash = 0;
    for (const e of entries)
      for (const l of e.lines)
        if (cashIds.has(l.accountId)) ledgerCash += l.debitCents - l.creditCents;
    expect(cf.endingCents).toBe(ledgerCash);
  });
});
