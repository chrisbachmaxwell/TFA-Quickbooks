import { createHash } from "crypto";
import type { StatementRow } from "./csv";

// Dedupe key: identical rows in the SAME file get distinct occurrence
// numbers (two real $5 coffees on one day both import), but re-uploading
// the same statement reproduces the same hashes and every row is skipped.
export function rowImportHash(
  bankAccountId: string,
  row: StatementRow,
  occurrence: number,
): string {
  return createHash("sha256")
    .update(
      [
        bankAccountId,
        row.date.toISOString().slice(0, 10),
        row.description,
        String(row.amountCents),
        String(occurrence),
      ].join("|"),
    )
    .digest("hex");
}

export interface ImportRecord {
  bankAccountId: string;
  date: Date;
  description: string;
  amountCents: number;
  importHash: string;
}

/** Pure step of an import: statement rows → insertable records with hashes. */
export function buildImportRecords(
  bankAccountId: string,
  rows: StatementRow[],
): ImportRecord[] {
  const occurrences = new Map<string, number>();
  return rows.map((row) => {
    const key = `${row.date.toISOString()}|${row.description}|${row.amountCents}`;
    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);
    return {
      bankAccountId,
      date: row.date,
      description: row.description,
      amountCents: row.amountCents,
      importHash: rowImportHash(bankAccountId, row, occurrence),
    };
  });
}
