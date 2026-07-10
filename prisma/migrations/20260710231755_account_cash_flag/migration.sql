ALTER TABLE "Account" ADD COLUMN "cash" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: any asset account that has received a bank statement is a cash account.
UPDATE "Account" SET "cash" = true
WHERE "type" = 'ASSET'
  AND "id" IN (SELECT DISTINCT "bankAccountId" FROM "BankTransaction");
