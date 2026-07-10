import { describe, expect, it } from "vitest";
import { buildSuggestionMap, normalizeDescription } from "./suggestions";

describe("normalizeDescription", () => {
  it("lowercases, trims, and collapses whitespace", () => {
    expect(normalizeDescription("  Dividend -  Acme   Holdings ")).toBe(
      "dividend - acme holdings",
    );
  });
});

describe("buildSuggestionMap", () => {
  it("maps a seen description to its account", () => {
    const map = buildSuggestionMap([
      { description: "Coffee Shop", accountId: "meals", at: new Date(1000) },
    ]);
    expect(map.get("coffee shop")).toBe("meals");
    expect(map.get("unseen payee")).toBeUndefined();
  });

  it("the most recent categorization wins", () => {
    const map = buildSuggestionMap([
      { description: "Coffee Shop", accountId: "office", at: new Date(2000) },
      { description: "Coffee Shop", accountId: "meals", at: new Date(1000) },
    ]);
    expect(map.get("coffee shop")).toBe("office");
  });

  it("matches case- and whitespace-insensitively", () => {
    const map = buildSuggestionMap([
      { description: "COFFEE  SHOP", accountId: "meals", at: new Date(1000) },
    ]);
    expect(map.get(normalizeDescription("coffee shop"))).toBe("meals");
  });
});
