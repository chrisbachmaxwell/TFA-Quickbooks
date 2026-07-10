import { prisma } from "./db";
import type { AccountInfo, DatedLine } from "./ledger";
import type { DatedEntry } from "./cash-flow";

/** Everything the report functions need, straight from the ledger tables. */
export async function loadLedger(): Promise<{
  accounts: AccountInfo[];
  lines: DatedLine[];
}> {
  const [accounts, lines] = await Promise.all([
    prisma.account.findMany(),
    prisma.journalLine.findMany({
      include: { entry: { select: { date: true } } },
    }),
  ]);
  return {
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: a.type })),
    lines: lines.map((l) => ({
      accountId: l.accountId,
      debitCents: l.debitCents,
      creditCents: l.creditCents,
      date: l.entry.date,
    })),
  };
}

/** Entry-grouped ledger (the cash-flow statement classifies per entry). */
export async function loadEntries(): Promise<{
  accounts: AccountInfo[];
  cashAccountIds: Set<string>;
  entries: DatedEntry[];
}> {
  const [accounts, entries] = await Promise.all([
    prisma.account.findMany(),
    prisma.journalEntry.findMany({ include: { lines: true } }),
  ]);
  return {
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: a.type })),
    cashAccountIds: new Set(accounts.filter((a) => a.cash).map((a) => a.id)),
    entries: entries.map((e) => ({
      date: e.date,
      lines: e.lines.map((l) => ({
        accountId: l.accountId,
        debitCents: l.debitCents,
        creditCents: l.creditCents,
      })),
    })),
  };
}
