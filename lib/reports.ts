import { prisma } from "./db";
import type { AccountInfo, DatedLine } from "./ledger";

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
