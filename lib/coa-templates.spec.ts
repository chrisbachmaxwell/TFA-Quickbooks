import { describe, expect, it } from "vitest";
import { COA_TEMPLATES, missingAccounts, templateById } from "./coa-templates";

describe("chart-of-accounts templates", () => {
  it("ships at least three templates, each substantial", () => {
    expect(COA_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    for (const t of COA_TEMPLATES) {
      expect(t.accounts.length).toBeGreaterThanOrEqual(20);
    }
  });

  it("every template has unique names (case-insensitive) and at least one cash account", () => {
    for (const t of COA_TEMPLATES) {
      const names = t.accounts.map((a) => a.name.toLowerCase());
      expect(new Set(names).size).toBe(names.length);
      expect(t.accounts.some((a) => a.cash)).toBe(true);
      // cash flag only on assets
      for (const a of t.accounts) {
        if (a.cash) expect(a.type).toBe("ASSET");
      }
    }
  });

  it("every template covers all five account types", () => {
    for (const t of COA_TEMPLATES) {
      const types = new Set(t.accounts.map((a) => a.type));
      expect([...types].sort()).toEqual(
        ["ASSET", "EQUITY", "EXPENSE", "INCOME", "LIABILITY"].sort(),
      );
    }
  });

  it("missingAccounts filters case-insensitively", () => {
    const holding = templateById("holding")!;
    const all = missingAccounts(holding, []);
    expect(all).toHaveLength(holding.accounts.length);
    const some = missingAccounts(holding, ["checking", "DIVIDEND INCOME", " Bank Fees "]);
    expect(some).toHaveLength(holding.accounts.length - 3);
    expect(some.every((a) => a.name !== "Checking")).toBe(true);
  });

  it("templateById resolves known ids and rejects unknown ones", () => {
    expect(templateById("holding")?.name).toContain("Holding");
    expect(templateById("nope")).toBeUndefined();
  });
});
