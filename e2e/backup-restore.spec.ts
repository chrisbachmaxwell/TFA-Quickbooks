import { execFileSync } from "child_process";
import { expect, test } from "@playwright/test";
import { db, resetDb } from "./helpers";

// Proves a backup taken after posting entries restores to identical report
// totals — the gate for "backups are real", not just "a file appeared".

test.afterAll(async () => {
  await db.$disconnect();
});

test("backup then restore reproduces the ledger exactly", async () => {
  await resetDb();
  const checking = await db.account.create({
    data: { name: "Backup Checking", type: "ASSET" },
  });
  const income = await db.account.create({
    data: { name: "Backup Income", type: "INCOME" },
  });
  await db.journalEntry.create({
    data: {
      date: new Date("2026-06-15T00:00:00Z"),
      memo: "backup fixture",
      lines: {
        create: [
          { accountId: checking.id, debitCents: 777700, creditCents: 0 },
          { accountId: income.id, debitCents: 0, creditCents: 777700 },
        ],
      },
    },
  });

  const before = await db.journalLine.aggregate({
    _sum: { debitCents: true, creditCents: true },
  });

  const backupFile = execFileSync("node", ["scripts/db-backup.mjs"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .pop()!;
  expect(backupFile).toMatch(/tfa-backup-.*\.sql$/);

  // Wipe everything, then restore.
  await resetDb();
  const wiped = await db.journalLine.count();
  expect(wiped).toBe(0);

  execFileSync("node", ["scripts/db-restore.mjs", backupFile, "--yes"], {
    encoding: "utf8",
  });

  const after = await db.journalLine.aggregate({
    _sum: { debitCents: true, creditCents: true },
  });
  expect(after._sum.debitCents).toBe(before._sum.debitCents);
  expect(after._sum.creditCents).toBe(before._sum.creditCents);
  const restored = await db.account.findMany({ orderBy: { name: "asc" } });
  expect(restored.map((a) => a.name)).toEqual([
    "Backup Checking",
    "Backup Income",
  ]);
});
