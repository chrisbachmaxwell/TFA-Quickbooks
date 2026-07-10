import { prisma } from "./db";
import { parseBankStatementCsv } from "./csv";
import { buildImportRecords } from "./import-hash";

export interface ImportResult {
  imported: number;
  skipped: number;
  ignoredZero: number;
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
  return {
    imported: result.count,
    skipped: rows.length - result.count,
    ignoredZero: allRows.length - rows.length,
  };
}
