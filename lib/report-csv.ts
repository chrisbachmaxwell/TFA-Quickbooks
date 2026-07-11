// CSV renderings of the statements. Amounts are plain decimals ("15324.50")
// so spreadsheets treat them as numbers; the screen keeps the $ formatting.
import type { BalanceSheet, ProfitAndLoss, ReportSection, TrialBalance } from "./ledger";
import type { CashFlowStatement } from "./cash-flow";

export function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
}

export function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

function sectionRows(title: string, section: ReportSection): string[][] {
  return [
    [title, ""],
    ...section.rows.map((r) => [r.account.name, centsToDecimal(r.balanceCents)]),
  ];
}

export function balanceSheetCsv(report: BalanceSheet, asOfIso: string): string {
  return toCsv([
    ["TFA Balance Sheet", `as of ${asOfIso}`],
    ...sectionRows("Assets", report.assets),
    ["Total assets", centsToDecimal(report.totalAssetsCents)],
    ...sectionRows("Liabilities", report.liabilities),
    ["Total liabilities", centsToDecimal(report.liabilities.totalCents)],
    ...sectionRows("Equity", report.equity),
    ["Retained earnings", centsToDecimal(report.retainedEarningsCents)],
    [
      "Total liabilities + equity",
      centsToDecimal(report.totalLiabilitiesAndEquityCents),
    ],
  ]);
}

export function pnlCsv(
  report: ProfitAndLoss,
  fromIso: string,
  toIso: string,
): string {
  return toCsv([
    ["TFA Profit & Loss", `${fromIso} to ${toIso}`],
    ...sectionRows("Income", report.income),
    ["Total income", centsToDecimal(report.income.totalCents)],
    ...sectionRows("Expenses", report.expenses),
    ["Total expenses", centsToDecimal(report.expenses.totalCents)],
    ["Net income", centsToDecimal(report.netIncomeCents)],
  ]);
}

export function cashFlowCsv(
  report: CashFlowStatement,
  fromIso: string,
  toIso: string,
): string {
  return toCsv([
    ["TFA Statement of Cash Flows", `${fromIso} to ${toIso}`],
    ...sectionRows("Operating activities", report.operating),
    ["Net cash from operating activities", centsToDecimal(report.operating.totalCents)],
    ...sectionRows("Investing activities", report.investing),
    ["Net cash from investing activities", centsToDecimal(report.investing.totalCents)],
    ...sectionRows("Financing activities", report.financing),
    ["Net cash from financing activities", centsToDecimal(report.financing.totalCents)],
    ["Net change in cash", centsToDecimal(report.netChangeCents)],
    ["Cash at beginning of period", centsToDecimal(report.beginningCents)],
    ["Cash at end of period", centsToDecimal(report.endingCents)],
  ]);
}

export function trialBalanceCsv(report: TrialBalance, asOfIso: string): string {
  return toCsv([
    ["TFA Trial Balance", `as of ${asOfIso}`, ""],
    ["Account", "Debit", "Credit"],
    ...report.rows.map((r) => [
      r.account.name,
      r.debitCents > 0 ? centsToDecimal(r.debitCents) : "",
      r.creditCents > 0 ? centsToDecimal(r.creditCents) : "",
    ]),
    [
      "Totals",
      centsToDecimal(report.totalDebitsCents),
      centsToDecimal(report.totalCreditsCents),
    ],
  ]);
}
