import { parseAmountToCents } from "./money";

export interface StatementRow {
  date: Date; // UTC midnight — bank statements are date-only
  description: string;
  amountCents: number; // signed: positive = money in, negative = money out
}

// RFC 4180-style CSV: quoted fields may contain commas, newlines, and "" escapes.
function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const pushField = () => {
    record.push(field);
    field = "";
  };
  const pushRecord = () => {
    pushField();
    records.push(record);
    record = [];
  };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += c;
        i += 1;
      }
    } else if (c === '"' && field.trim() === "") {
      inQuotes = true;
      field = ""; // drop padding before an opening quote (", \"a, b\"" case)
      i += 1;
    } else if (c === ",") {
      pushField();
      i += 1;
    } else if (c === "\r" && text[i + 1] === "\n") {
      pushRecord();
      i += 2;
    } else if (c === "\n" || c === "\r") {
      pushRecord();
      i += 1;
    } else {
      field += c;
      i += 1;
    }
  }
  if (field !== "" || record.length > 0) pushRecord();
  if (inQuotes) throw new Error("malformed CSV: unclosed quote");
  return records.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

function parseStatementDate(raw: string): Date {
  const s = raw.trim();
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (iso) {
    [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (us) {
    [m, d, y] = [Number(us[1]), Number(us[2]), Number(us[3])];
  } else {
    throw new Error(`unparseable date: "${raw}" (expected YYYY-MM-DD or MM/DD/YYYY)`);
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    throw new Error(`impossible date: "${raw}"`);
  }
  return date;
}

const DESCRIPTION_HEADERS = ["description", "memo", "details", "payee", "narrative"];

/**
 * Parses a bank-statement CSV into rows. Requires a header line naming a
 * date column, an amount column, and a description-like column. Throws with
 * a 1-based row number on the first bad row.
 */
export function parseBankStatementCsv(text: string): StatementRow[] {
  const records = parseCsvRecords(text);
  if (records.length < 2) {
    throw new Error("CSV needs a header line and at least one transaction row");
  }
  const header = records[0].map((h) => h.trim().toLowerCase());
  const dateIdx = header.indexOf("date");
  const amountIdx = header.indexOf("amount");
  const descIdx = header.findIndex((h) => DESCRIPTION_HEADERS.includes(h));
  if (dateIdx === -1 || amountIdx === -1 || descIdx === -1) {
    throw new Error(
      `CSV header must include "Date", "Amount", and a description column — got: ${records[0].join(", ")}`,
    );
  }
  return records.slice(1).map((record, i) => {
    const rowNumber = i + 2; // 1-based, counting the header
    try {
      return {
        date: parseStatementDate(record[dateIdx] ?? ""),
        description: (record[descIdx] ?? "").trim() || "(no description)",
        amountCents: parseAmountToCents(record[amountIdx] ?? ""),
      };
    } catch (err) {
      throw new Error(`Row ${rowNumber}: ${err instanceof Error ? err.message : err}`);
    }
  });
}
