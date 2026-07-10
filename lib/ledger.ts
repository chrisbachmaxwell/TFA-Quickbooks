// The double-entry posting engine (pure functions — no database here).
// Persistence lives in lib/posting.ts; reports pages feed DB rows into
// the report functions below.

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

export interface EntryLine {
  accountId: string;
  debitCents: number;
  creditCents: number;
}

export interface DatedLine extends EntryLine {
  date: Date;
}

export interface AccountInfo {
  id: string;
  name: string;
  type: AccountType;
}

// Accounts whose normal balance is a debit; the rest are credit-normal.
const DEBIT_NORMAL: ReadonlySet<AccountType> = new Set(["ASSET", "EXPENSE"]);

/** Throws unless the lines form a valid, balanced journal entry. */
export function validateEntryLines(lines: EntryLine[]): void {
  if (lines.length < 2) {
    throw new Error("a journal entry needs at least two lines");
  }
  let debits = 0;
  let credits = 0;
  for (const line of lines) {
    if (!Number.isInteger(line.debitCents) || !Number.isInteger(line.creditCents)) {
      throw new Error("amounts must be integer cents");
    }
    if (line.debitCents < 0 || line.creditCents < 0) {
      throw new Error("line amounts cannot be negative");
    }
    if (line.debitCents > 0 && line.creditCents > 0) {
      throw new Error("a line cannot be both a debit and a credit");
    }
    if (line.debitCents === 0 && line.creditCents === 0) {
      throw new Error("a line must have a nonzero amount");
    }
    debits += line.debitCents;
    credits += line.creditCents;
  }
  if (debits !== credits) {
    throw new Error(`unbalanced entry: debits ${debits} != credits ${credits}`);
  }
  if (debits === 0) {
    throw new Error("an entry cannot be all zero");
  }
}

/** Sum of debits minus sum of credits — exactly zero for a healthy ledger. */
export function trialBalanceCents(lines: EntryLine[]): number {
  let total = 0;
  for (const line of lines) {
    total += line.debitCents - line.creditCents;
  }
  return total;
}

/** Balance of one account in its normal direction (positive = normal). */
export function accountBalanceCents(type: AccountType, lines: EntryLine[]): number {
  let debits = 0;
  let credits = 0;
  for (const line of lines) {
    debits += line.debitCents;
    credits += line.creditCents;
  }
  return DEBIT_NORMAL.has(type) ? debits - credits : credits - debits;
}

/**
 * Builds the two balanced lines that categorize a bank transaction.
 * amountCents > 0 (money in): debit the bank account, credit the category.
 * amountCents < 0 (money out): debit the category, credit the bank account.
 */
export function buildCategorizationLines(
  bankAccountId: string,
  categoryAccountId: string,
  amountCents: number,
): EntryLine[] {
  if (!Number.isInteger(amountCents)) throw new Error("amount must be integer cents");
  if (amountCents === 0) throw new Error("zero-amount transaction cannot be categorized");
  if (bankAccountId === categoryAccountId) {
    throw new Error("cannot categorize a transaction to its own bank account");
  }
  const abs = Math.abs(amountCents);
  return amountCents > 0
    ? [
        { accountId: bankAccountId, debitCents: abs, creditCents: 0 },
        { accountId: categoryAccountId, debitCents: 0, creditCents: abs },
      ]
    : [
        { accountId: categoryAccountId, debitCents: abs, creditCents: 0 },
        { accountId: bankAccountId, debitCents: 0, creditCents: abs },
      ];
}

export interface ReportRow {
  account: AccountInfo;
  balanceCents: number;
}

export interface ReportSection {
  rows: ReportRow[];
  totalCents: number;
}

function sectionFor(
  accounts: AccountInfo[],
  type: AccountType,
  linesByAccount: Map<string, EntryLine[]>,
): ReportSection {
  const rows: ReportRow[] = [];
  let totalCents = 0;
  for (const account of accounts) {
    if (account.type !== type) continue;
    const balance = accountBalanceCents(type, linesByAccount.get(account.id) ?? []);
    if (balance === 0) continue;
    rows.push({ account, balanceCents: balance });
    totalCents += balance;
  }
  rows.sort((a, b) => a.account.name.localeCompare(b.account.name));
  return { rows, totalCents };
}

function groupByAccount(lines: DatedLine[]): Map<string, EntryLine[]> {
  const map = new Map<string, EntryLine[]>();
  for (const line of lines) {
    const bucket = map.get(line.accountId);
    if (bucket) bucket.push(line);
    else map.set(line.accountId, [line]);
  }
  return map;
}

export interface BalanceSheet {
  assets: ReportSection;
  liabilities: ReportSection;
  equity: ReportSection; // equity accounts only; retained earnings is separate
  retainedEarningsCents: number; // all income minus expenses through asOf
  totalAssetsCents: number;
  totalLiabilitiesAndEquityCents: number;
}

export function balanceSheet(
  accounts: AccountInfo[],
  lines: DatedLine[],
  asOf: Date,
): BalanceSheet {
  const inRange = lines.filter((l) => l.date.getTime() <= asOf.getTime());
  const byAccount = groupByAccount(inRange);
  const assets = sectionFor(accounts, "ASSET", byAccount);
  const liabilities = sectionFor(accounts, "LIABILITY", byAccount);
  const equity = sectionFor(accounts, "EQUITY", byAccount);
  const income = sectionFor(accounts, "INCOME", byAccount);
  const expenses = sectionFor(accounts, "EXPENSE", byAccount);
  const retainedEarningsCents = income.totalCents - expenses.totalCents;
  return {
    assets,
    liabilities,
    equity,
    retainedEarningsCents,
    totalAssetsCents: assets.totalCents,
    totalLiabilitiesAndEquityCents:
      liabilities.totalCents + equity.totalCents + retainedEarningsCents,
  };
}

export interface ProfitAndLoss {
  income: ReportSection;
  expenses: ReportSection;
  netIncomeCents: number;
}

export function profitAndLoss(
  accounts: AccountInfo[],
  lines: DatedLine[],
  from: Date,
  to: Date,
): ProfitAndLoss {
  const inRange = lines.filter(
    (l) => l.date.getTime() >= from.getTime() && l.date.getTime() <= to.getTime(),
  );
  const byAccount = groupByAccount(inRange);
  const income = sectionFor(accounts, "INCOME", byAccount);
  const expenses = sectionFor(accounts, "EXPENSE", byAccount);
  return {
    income,
    expenses,
    netIncomeCents: income.totalCents - expenses.totalCents,
  };
}
