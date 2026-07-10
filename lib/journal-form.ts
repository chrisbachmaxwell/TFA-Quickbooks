import { parseAmountToCents } from "./money";
import type { EntryLine } from "./ledger";

export interface JournalFormRow {
  accountId: string;
  debit: string; // dollars, as typed
  credit: string;
}

/**
 * Turns the manual-entry form's rows into engine lines. Blank rows are
 * dropped; a row with both sides, no account, or an unparseable amount
 * throws with the 1-based row number.
 */
export function parseManualEntryLines(rows: JournalFormRow[]): EntryLine[] {
  const lines: EntryLine[] = [];
  rows.forEach((row, i) => {
    const n = i + 1;
    const debitRaw = row.debit.trim();
    const creditRaw = row.credit.trim();
    if (!row.accountId && !debitRaw && !creditRaw) return; // blank row
    if (!row.accountId) throw new Error(`Line ${n}: pick an account`);
    if (debitRaw && creditRaw) {
      throw new Error(`Line ${n}: enter a debit or a credit, not both`);
    }
    if (!debitRaw && !creditRaw) {
      throw new Error(`Line ${n}: enter an amount`);
    }
    const cents = parseAmountToCents(debitRaw || creditRaw);
    if (cents <= 0) throw new Error(`Line ${n}: amount must be positive`);
    lines.push({
      accountId: row.accountId,
      debitCents: debitRaw ? cents : 0,
      creditCents: creditRaw ? cents : 0,
    });
  });
  return lines;
}
