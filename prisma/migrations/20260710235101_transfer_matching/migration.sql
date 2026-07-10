-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN     "matchedEntryId" TEXT;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_matchedEntryId_fkey" FOREIGN KEY ("matchedEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
