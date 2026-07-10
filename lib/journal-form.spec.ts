import { describe, expect, it } from "vitest";
import { parseManualEntryLines } from "./journal-form";
import { validateEntryLines } from "./ledger";

describe("parseManualEntryLines", () => {
  it("parses dollars to integer cents on the right sides", () => {
    const lines = parseManualEntryLines([
      { accountId: "a", debit: "500.00", credit: "" },
      { accountId: "b", debit: "", credit: "500" },
    ]);
    expect(lines).toEqual([
      { accountId: "a", debitCents: 50000, creditCents: 0 },
      { accountId: "b", debitCents: 0, creditCents: 50000 },
    ]);
    expect(() => validateEntryLines(lines)).not.toThrow();
  });

  it("drops fully blank rows", () => {
    const lines = parseManualEntryLines([
      { accountId: "a", debit: "1", credit: "" },
      { accountId: "", debit: "", credit: "" },
      { accountId: "b", debit: "", credit: "1" },
    ]);
    expect(lines).toHaveLength(2);
  });

  it("rejects a row with both sides, a missing account, and zero amounts", () => {
    expect(() =>
      parseManualEntryLines([{ accountId: "a", debit: "1", credit: "1" }]),
    ).toThrow(/Line 1: enter a debit or a credit/);
    expect(() =>
      parseManualEntryLines([{ accountId: "", debit: "1", credit: "" }]),
    ).toThrow(/Line 1: pick an account/);
    expect(() =>
      parseManualEntryLines([{ accountId: "a", debit: "0", credit: "" }]),
    ).toThrow(/positive/);
    expect(() =>
      parseManualEntryLines([{ accountId: "a", debit: "", credit: "" }]),
    ).toThrow(/enter an amount/);
  });

  it("propagates unparseable amounts with the row number", () => {
    expect(() =>
      parseManualEntryLines([{ accountId: "a", debit: "12,34", credit: "" }]),
    ).toThrow(/comma/);
  });
});
