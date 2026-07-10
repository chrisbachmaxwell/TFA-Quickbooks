import { expect, test } from "@playwright/test";
import { categorizeBankTransaction } from "../lib/posting";
import { db, resetDb } from "./helpers";

// Ledger-integrity checks that need direct database access. These run in
// the Playwright suite (not Vitest) because they exercise real Postgres
// behavior: transaction isolation and CHECK constraints.

test.beforeAll(async () => {
  await resetDb();
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("concurrent categorization of one transaction posts exactly one entry", async () => {
  const checking = await db.account.create({
    data: { name: "Race Checking", type: "ASSET" },
  });
  const rent = await db.account.create({
    data: { name: "Race Rent", type: "EXPENSE" },
  });
  const fees = await db.account.create({
    data: { name: "Race Fees", type: "EXPENSE" },
  });

  for (let round = 0; round < 5; round++) {
    const txn = await db.bankTransaction.create({
      data: {
        bankAccountId: checking.id,
        date: new Date("2026-06-01T00:00:00Z"),
        description: `Race round ${round}`,
        amountCents: -100000,
        importHash: `race-${round}`,
      },
    });

    // Double-click / two-tabs simulation: both candidates fire at once.
    const results = await Promise.allSettled([
      categorizeBankTransaction(txn.id, rent.id),
      categorizeBankTransaction(txn.id, fees.id),
    ]);

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    expect(succeeded).toBe(1); // exactly one winner, never zero, never two

    // The ledger holds exactly one entry for this transaction — no orphans.
    const entries = await db.journalEntry.findMany({
      where: { memo: `Race round ${round}` },
      include: { lines: true },
    });
    expect(entries).toHaveLength(1);
    const debits = entries[0].lines.reduce((s, l) => s + l.debitCents, 0);
    const credits = entries[0].lines.reduce((s, l) => s + l.creditCents, 0);
    expect(debits).toBe(100000);
    expect(credits).toBe(100000);
  }
});

test("the database itself refuses corrupt journal lines", async () => {
  const account = await db.account.create({
    data: { name: "Backstop Target", type: "ASSET" },
  });
  const entry = await db.journalEntry.create({
    data: { date: new Date("2026-06-02T00:00:00Z"), memo: "backstop probe" },
  });

  // Negative amounts: representable in no valid entry.
  await expect(
    db.journalLine.create({
      data: {
        entryId: entry.id,
        accountId: account.id,
        debitCents: -500,
        creditCents: 0,
      },
    }),
  ).rejects.toThrow();

  // A line that is both debit and credit.
  await expect(
    db.journalLine.create({
      data: {
        entryId: entry.id,
        accountId: account.id,
        debitCents: 500,
        creditCents: 500,
      },
    }),
  ).rejects.toThrow();
});

test("account names that differ only by case are refused by the database", async () => {
  await db.account.create({
    data: { name: "Office Expenses", type: "EXPENSE" },
  });
  await expect(
    db.account.create({ data: { name: "office expenses", type: "EXPENSE" } }),
  ).rejects.toThrow();
});
