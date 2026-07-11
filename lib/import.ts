import { prisma } from "./db";
import { parseBankStatementCsv } from "./csv";
import { buildImportRecords } from "./import-hash";
import { pickMirror, TRANSFER_MATCH_WINDOW_DAYS } from "./transfer-match";

const MATCH_WINDOW_MS = TRANSFER_MATCH_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export interface ImportResult {
  imported: number;
  skipped: number;
  ignoredZero: number;
  matchedTransfers: number;
}

/**
 * Matches this account's open statement rows against transfer entries that
 * were already posted from OTHER accounts' statements (the mirror arrived
 * after the transfer was categorized).
 */
async function matchIncomingTransfers(bankAccountId: string): Promise<number> {
  const openRows = await prisma.bankTransaction.findMany({
    where: {
      bankAccountId,
      journalEntryId: null,
      matchedEntryId: null,
      excluded: false,
    },
  });
  let matched = 0;
  for (const row of openRows) {
    const abs = Math.abs(row.amountCents);
    const candidates = await prisma.journalEntry.findMany({
      where: {
        date: {
          gte: new Date(row.date.getTime() - MATCH_WINDOW_MS),
          lte: new Date(row.date.getTime() + MATCH_WINDOW_MS),
        },
        matchedTransfers: { none: {} },
        bankTransaction: { bankAccountId: { not: bankAccountId } },
        lines: {
          some: {
            accountId: bankAccountId,
            debitCents: row.amountCents > 0 ? abs : 0,
            creditCents: row.amountCents < 0 ? abs : 0,
          },
        },
      },
    });
    // Reuse the pure picker's window/closest-date rules; amounts already agree.
    const entryId = pickMirror(
      row.date,
      row.amountCents,
      candidates.map((e) => ({
        id: e.id,
        date: e.date,
        amountCents: -row.amountCents,
      })),
    );
    if (entryId) {
      // Atomic claim: re-check the entry is still unmatched inside a
      // transaction so two concurrent imports can't attach two mirrors
      // to one entry.
      const claimed = await prisma.$transaction(async (tx) => {
        const stillFree = await tx.journalEntry.findFirst({
          where: { id: entryId, matchedTransfers: { none: {} } },
          select: { id: true },
        });
        if (!stillFree) return 0;
        const r = await tx.bankTransaction.updateMany({
          where: { id: row.id, matchedEntryId: null, journalEntryId: null },
          data: { matchedEntryId: entryId },
        });
        return r.count;
      });
      matched += claimed;
    }
  }
  return matched;
}

export async function importBankStatement(
  bankAccountId: string,
  csvText: string,
): Promise<ImportResult> {
  const bankAccount = await prisma.account.findUniqueOrThrow({
    where: { id: bankAccountId },
  });
  if (bankAccount.type !== "ASSET" || !bankAccount.cash) {
    throw new Error(
      "statements can only be imported into a cash (bank) account — mark the account as cash on the chart of accounts",
    );
  }
  const allRows = parseBankStatementCsv(csvText);
  // $0.00 rows (voids, memo lines) can never be categorized into a balanced
  // entry, so importing them would jam the uncategorized list forever.
  const rows = allRows.filter((row) => row.amountCents !== 0);
  const result = await prisma.bankTransaction.createMany({
    data: buildImportRecords(bankAccountId, rows),
    skipDuplicates: true,
  });
  const matchedTransfers = await matchIncomingTransfers(bankAccountId);
  return {
    imported: result.count,
    skipped: rows.length - result.count,
    ignoredZero: allRows.length - rows.length,
    matchedTransfers,
  };
}
