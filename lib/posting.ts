import { prisma } from "./db";
import {
  buildCategorizationLines,
  buildSplitLines,
  validateEntryLines,
  type EntryLine,
  type SplitInput,
} from "./ledger";
import { pickMirror, TRANSFER_MATCH_WINDOW_DAYS } from "./transfer-match";

const MATCH_WINDOW_MS = TRANSFER_MATCH_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Posts a balanced journal entry; throws (and writes nothing) if invalid. */
export async function postJournalEntry(input: {
  date: Date;
  memo: string;
  lines: EntryLine[];
}): Promise<string> {
  validateEntryLines(input.lines);
  const entry = await prisma.journalEntry.create({
    data: {
      date: input.date,
      memo: input.memo,
      lines: {
        create: input.lines.map((l) => ({
          accountId: l.accountId,
          debitCents: l.debitCents,
          creditCents: l.creditCents,
        })),
      },
    },
  });
  return entry.id;
}

/**
 * Categorizes an uncategorized bank transaction: posts the balanced entry
 * and links it to the transaction, atomically.
 */
export async function categorizeBankTransaction(
  bankTransactionId: string,
  categoryAccountId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const txn = await tx.bankTransaction.findUniqueOrThrow({
      where: { id: bankTransactionId },
    });
    if (txn.journalEntryId) {
      throw new Error("transaction is already categorized");
    }
    if (txn.excluded) {
      throw new Error("transaction is excluded — restore it before categorizing");
    }
    const category = await tx.account.findUniqueOrThrow({
      where: { id: categoryAccountId },
    });
    if (!category.active) {
      throw new Error("cannot categorize to an inactive account");
    }
    const lines = buildCategorizationLines(
      txn.bankAccountId,
      categoryAccountId,
      txn.amountCents,
    );
    validateEntryLines(lines);
    const entry = await tx.journalEntry.create({
      data: {
        date: txn.date,
        memo: txn.description,
        lines: {
          create: lines.map((l) => ({
            accountId: l.accountId,
            debitCents: l.debitCents,
            creditCents: l.creditCents,
          })),
        },
      },
    });
    // Guarded update: under concurrent categorization (double-click, two
    // tabs) only the writer that still sees journalEntryId = null wins;
    // the loser's whole transaction — entry included — rolls back.
    const claimed = await tx.bankTransaction.updateMany({
      where: { id: bankTransactionId, journalEntryId: null },
      data: { journalEntryId: entry.id },
    });
    if (claimed.count === 0) {
      throw new Error("transaction is already categorized");
    }

    // Transfer to another cash account: the destination's statement carries
    // a mirror row for the same movement — match it so it never double-posts.
    if (category.cash) {
      const candidates = await tx.bankTransaction.findMany({
        where: {
          bankAccountId: categoryAccountId,
          journalEntryId: null,
          matchedEntryId: null,
          excluded: false,
          amountCents: -txn.amountCents,
          date: {
            gte: new Date(txn.date.getTime() - MATCH_WINDOW_MS),
            lte: new Date(txn.date.getTime() + MATCH_WINDOW_MS),
          },
        },
      });
      const mirrorId = pickMirror(txn.date, txn.amountCents, candidates);
      if (mirrorId) {
        await tx.bankTransaction.update({
          where: { id: mirrorId },
          data: { matchedEntryId: entry.id },
        });
      }
    }
  });
}

/**
 * Categorizes one bank transaction across several accounts, atomically —
 * the split cousin of categorizeBankTransaction, with the same race guard.
 */
export async function categorizeBankTransactionSplit(
  bankTransactionId: string,
  splits: SplitInput[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const txn = await tx.bankTransaction.findUniqueOrThrow({
      where: { id: bankTransactionId },
    });
    if (txn.journalEntryId) {
      throw new Error("transaction is already categorized");
    }
    if (txn.excluded) {
      throw new Error("transaction is excluded — restore it before categorizing");
    }
    const accounts = await tx.account.findMany({
      where: { id: { in: splits.map((s) => s.accountId) } },
    });
    if (accounts.length !== new Set(splits.map((s) => s.accountId)).size) {
      throw new Error("unknown account in split");
    }
    const inactive = accounts.find((a) => !a.active);
    if (inactive) {
      throw new Error(`cannot categorize to inactive account "${inactive.name}"`);
    }
    const lines = buildSplitLines(txn.bankAccountId, txn.amountCents, splits);
    validateEntryLines(lines);
    const entry = await tx.journalEntry.create({
      data: {
        date: txn.date,
        memo: txn.description,
        lines: {
          create: lines.map((l) => ({
            accountId: l.accountId,
            debitCents: l.debitCents,
            creditCents: l.creditCents,
          })),
        },
      },
    });
    const claimed = await tx.bankTransaction.updateMany({
      where: { id: bankTransactionId, journalEntryId: null },
      data: { journalEntryId: entry.id },
    });
    if (claimed.count === 0) {
      throw new Error("transaction is already categorized");
    }
  });
}

/** Reverses a categorization: unlinks the transaction and deletes its entry. */
export async function uncategorizeBankTransaction(
  bankTransactionId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const txn = await tx.bankTransaction.findUniqueOrThrow({
      where: { id: bankTransactionId },
    });
    if (!txn.journalEntryId) {
      throw new Error("transaction is not categorized");
    }
    const entryId = txn.journalEntryId;
    await tx.bankTransaction.update({
      where: { id: bankTransactionId },
      data: { journalEntryId: null },
    });
    await tx.journalEntry.delete({ where: { id: entryId } }); // lines cascade
  });
}

/** Excludes (or restores) an uncategorized statement row from the books. */
export async function setBankTransactionExcluded(
  bankTransactionId: string,
  excluded: boolean,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const txn = await tx.bankTransaction.findUniqueOrThrow({
      where: { id: bankTransactionId },
    });
    if (txn.journalEntryId) {
      throw new Error("categorized transactions can't be excluded — undo first");
    }
    await tx.bankTransaction.update({
      where: { id: bankTransactionId },
      data: { excluded },
    });
  });
}

/** Deletes a MANUAL journal entry. Bank-linked entries must be undone instead. */
export async function deleteManualEntry(entryId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const entry = await tx.journalEntry.findUniqueOrThrow({
      where: { id: entryId },
      include: { bankTransaction: true },
    });
    if (entry.bankTransaction) {
      throw new Error(
        "this entry belongs to a bank transaction — undo it from the review screen instead",
      );
    }
    await tx.journalEntry.delete({ where: { id: entryId } });
  });
}
