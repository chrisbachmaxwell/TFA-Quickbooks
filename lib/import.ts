import { prisma } from "./db";
import { parseBankStatementCsv } from "./csv";
import { buildImportRecords } from "./import-hash";

export interface ImportResult {
  imported: number;
  skipped: number;
}

export async function importBankStatement(
  bankAccountId: string,
  csvText: string,
): Promise<ImportResult> {
  const bankAccount = await prisma.account.findUniqueOrThrow({
    where: { id: bankAccountId },
  });
  if (bankAccount.type !== "ASSET") {
    throw new Error("statements can only be imported into an asset (bank) account");
  }
  const rows = parseBankStatementCsv(csvText);
  const result = await prisma.bankTransaction.createMany({
    data: buildImportRecords(bankAccountId, rows),
    skipDuplicates: true,
  });
  return { imported: result.count, skipped: rows.length - result.count };
}
