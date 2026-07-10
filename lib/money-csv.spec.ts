import { describe, expect, it } from "vitest";
import { formatCents, parseAmountToCents } from "./money";
import { parseBankStatementCsv } from "./csv";
import { buildImportRecords } from "./import-hash";

describe("parseAmountToCents", () => {
  it("parses plain, comma, dollar, paren, and signed forms", () => {
    expect(parseAmountToCents("1,234.56")).toBe(123456);
    expect(parseAmountToCents("$45")).toBe(4500);
    expect(parseAmountToCents("45.7")).toBe(4570);
    expect(parseAmountToCents("-45.70")).toBe(-4570);
    expect(parseAmountToCents("(45.00)")).toBe(-4500);
    expect(parseAmountToCents("+0.01")).toBe(1);
    expect(parseAmountToCents("0")).toBe(0);
  });

  it("rejects garbage and sub-cent precision", () => {
    expect(() => parseAmountToCents("abc")).toThrow(/unparseable/);
    expect(() => parseAmountToCents("")).toThrow(/empty/);
    expect(() => parseAmountToCents("45.678")).toThrow(/unparseable/);
    expect(() => parseAmountToCents("4 5")).toThrow(/unparseable/);
  });

  it("rejects decimal-comma and malformed grouping instead of inflating 100x", () => {
    expect(() => parseAmountToCents("12,34")).toThrow(/comma/); // European $12.34 must NOT become $1,234.00
    expect(() => parseAmountToCents("1.234,56")).toThrow(/unparseable|comma/);
    expect(() => parseAmountToCents("1,2,3")).toThrow(/comma/);
    expect(() => parseAmountToCents("12,3456")).toThrow(/comma/);
    expect(parseAmountToCents("12,345,678.90")).toBe(1234567890);
  });
});

describe("formatCents", () => {
  it("formats with commas, two decimals, and sign", () => {
    expect(formatCents(123456)).toBe("$1,234.56");
    expect(formatCents(-4500)).toBe("-$45.00");
    expect(formatCents(1)).toBe("$0.01");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(1532450)).toBe("$15,324.50");
  });

  it("rejects non-integer cents", () => {
    expect(() => formatCents(10.5)).toThrow(/integer/);
  });
});

describe("parseBankStatementCsv", () => {
  it("parses a statement with quoted commas and both date formats", () => {
    const rows = parseBankStatementCsv(
      [
        "Date,Description,Amount",
        "2026-01-05,Dividend - Acme Holdings,2500.00",
        '03/10/2026,"Legal fees, Smith & Co",-450.75',
      ].join("\r\n"),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].date.toISOString()).toBe("2026-01-05T00:00:00.000Z");
    expect(rows[0].amountCents).toBe(250000);
    expect(rows[1].date.toISOString()).toBe("2026-03-10T00:00:00.000Z");
    expect(rows[1].description).toBe("Legal fees, Smith & Co");
    expect(rows[1].amountCents).toBe(-45075);
  });

  it("accepts memo/details/payee as the description column", () => {
    const rows = parseBankStatementCsv("Date,Memo,Amount\n2026-01-05,Coffee,-4.50");
    expect(rows[0].description).toBe("Coffee");
  });

  it("tolerates a space before an opening quote", () => {
    const rows = parseBankStatementCsv(
      'Date,Description,Amount\n2026-03-10, "Legal fees, Smith & Co",-450.75',
    );
    expect(rows[0].description).toBe("Legal fees, Smith & Co");
    expect(rows[0].amountCents).toBe(-45075);
  });

  it("names the offending row on bad data", () => {
    expect(() =>
      parseBankStatementCsv(
        "Date,Description,Amount\n2026-01-05,ok,1.00\n2026-02-30,bad date,1.00",
      ),
    ).toThrow(/Row 3/);
    expect(() =>
      parseBankStatementCsv("Date,Description,Amount\n2026-01-05,bad amount,x"),
    ).toThrow(/Row 2/);
  });

  it("rejects files without the required header", () => {
    expect(() => parseBankStatementCsv("Foo,Bar\n1,2")).toThrow(/header/);
    expect(() => parseBankStatementCsv("Date,Description,Amount")).toThrow(
      /at least one/,
    );
  });
});

describe("buildImportRecords (dedupe hashing)", () => {
  const rows = parseBankStatementCsv(
    [
      "Date,Description,Amount",
      "2026-01-05,Coffee,-4.50",
      "2026-01-05,Coffee,-4.50", // a genuine second coffee that day
      "2026-01-06,Coffee,-4.50",
    ].join("\n"),
  );

  it("re-processing the same file reproduces identical hashes", () => {
    const first = buildImportRecords("bank", rows).map((r) => r.importHash);
    const second = buildImportRecords("bank", rows).map((r) => r.importHash);
    expect(first).toEqual(second);
  });

  it("identical rows within one file get distinct hashes", () => {
    const hashes = buildImportRecords("bank", rows).map((r) => r.importHash);
    expect(new Set(hashes).size).toBe(3);
  });

  it("hashes are scoped to the bank account", () => {
    const a = buildImportRecords("bank-a", rows).map((r) => r.importHash);
    const b = buildImportRecords("bank-b", rows).map((r) => r.importHash);
    expect(a.every((h) => !b.includes(h))).toBe(true);
  });
});
