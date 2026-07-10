-- Database-level backstop for ledger invariants: application code validates
-- every entry, but the database must also refuse rows no valid entry can
-- contain, so future write paths (scripts, admin edits) can't corrupt books.

ALTER TABLE "JournalLine"
  ADD CONSTRAINT "JournalLine_debit_nonnegative" CHECK ("debitCents" >= 0);

ALTER TABLE "JournalLine"
  ADD CONSTRAINT "JournalLine_credit_nonnegative" CHECK ("creditCents" >= 0);

ALTER TABLE "JournalLine"
  ADD CONSTRAINT "JournalLine_one_sided" CHECK ("debitCents" = 0 OR "creditCents" = 0);

-- "Office expenses" and "Office Expenses" must not coexist.
CREATE UNIQUE INDEX "Account_name_lower_key" ON "Account" (lower("name"));
