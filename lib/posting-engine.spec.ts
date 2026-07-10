import { describe, expect, it } from "vitest";
import {
  accountBalanceCents,
  buildCategorizationLines,
  trialBalanceCents,
  validateEntryLines,
  type EntryLine,
} from "./ledger";

// Deterministic PRNG (mulberry32) so failures reproduce exactly.
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Splits total into n positive integer parts. */
function splitCents(rng: () => number, total: number, n: number): number[] {
  const parts: number[] = [];
  let remaining = total;
  for (let i = 0; i < n - 1; i++) {
    const maxPart = remaining - (n - 1 - i);
    const part = randomInt(rng, 1, maxPart);
    parts.push(part);
    remaining -= part;
  }
  parts.push(remaining);
  return parts;
}

describe("validateEntryLines", () => {
  const ok: EntryLine[] = [
    { accountId: "bank", debitCents: 500, creditCents: 0 },
    { accountId: "sales", debitCents: 0, creditCents: 500 },
  ];

  it("accepts a balanced entry", () => {
    expect(() => validateEntryLines(ok)).not.toThrow();
  });

  it("rejects fewer than two lines", () => {
    expect(() => validateEntryLines([ok[0]])).toThrow(/two lines/);
  });

  it("rejects unbalanced entries", () => {
    expect(() =>
      validateEntryLines([
        { accountId: "bank", debitCents: 500, creditCents: 0 },
        { accountId: "sales", debitCents: 0, creditCents: 499 },
      ]),
    ).toThrow(/unbalanced/);
  });

  it("rejects negative amounts", () => {
    expect(() =>
      validateEntryLines([
        { accountId: "bank", debitCents: -500, creditCents: 0 },
        { accountId: "sales", debitCents: 0, creditCents: -500 },
      ]),
    ).toThrow(/negative/);
  });

  it("rejects non-integer cents", () => {
    expect(() =>
      validateEntryLines([
        { accountId: "bank", debitCents: 500.5, creditCents: 0 },
        { accountId: "sales", debitCents: 0, creditCents: 500.5 },
      ]),
    ).toThrow(/integer/);
  });

  it("rejects a line that is both debit and credit", () => {
    expect(() =>
      validateEntryLines([
        { accountId: "bank", debitCents: 500, creditCents: 500 },
        { accountId: "sales", debitCents: 500, creditCents: 500 },
      ]),
    ).toThrow(/both/);
  });

  it("rejects zero-amount lines", () => {
    expect(() =>
      validateEntryLines([
        { accountId: "bank", debitCents: 0, creditCents: 0 },
        { accountId: "sales", debitCents: 0, creditCents: 0 },
      ]),
    ).toThrow(/nonzero|zero/);
  });
});

describe("trial balance over a randomized batch", () => {
  it("stays exactly zero across 500 random valid entries", () => {
    const rng = makeRng(20260710);
    const allLines: EntryLine[] = [];
    const accounts = ["a1", "a2", "a3", "a4", "a5", "a6"];
    for (let i = 0; i < 500; i++) {
      const total = randomInt(rng, 1, 10_000_000);
      const debitParts = splitCents(rng, total, randomInt(rng, 1, 3));
      const creditParts = splitCents(rng, total, randomInt(rng, 1, 3));
      const lines: EntryLine[] = [
        ...debitParts.map((cents) => ({
          accountId: accounts[randomInt(rng, 0, accounts.length - 1)],
          debitCents: cents,
          creditCents: 0,
        })),
        ...creditParts.map((cents) => ({
          accountId: accounts[randomInt(rng, 0, accounts.length - 1)],
          debitCents: 0,
          creditCents: cents,
        })),
      ];
      validateEntryLines(lines); // every generated entry must be valid
      allLines.push(...lines);
    }
    expect(trialBalanceCents(allLines)).toBe(0);
  });
});

describe("accountBalanceCents", () => {
  const lines: EntryLine[] = [
    { accountId: "x", debitCents: 1000, creditCents: 0 },
    { accountId: "x", debitCents: 0, creditCents: 300 },
  ];

  it("is debit-normal for assets and expenses", () => {
    expect(accountBalanceCents("ASSET", lines)).toBe(700);
    expect(accountBalanceCents("EXPENSE", lines)).toBe(700);
  });

  it("is credit-normal for liabilities, equity, income", () => {
    expect(accountBalanceCents("LIABILITY", lines)).toBe(-700);
    expect(accountBalanceCents("EQUITY", lines)).toBe(-700);
    expect(accountBalanceCents("INCOME", lines)).toBe(-700);
  });
});

describe("buildCategorizationLines", () => {
  it("money in: debits the bank, credits the category", () => {
    const lines = buildCategorizationLines("bank", "sales", 250000);
    expect(lines).toEqual([
      { accountId: "bank", debitCents: 250000, creditCents: 0 },
      { accountId: "sales", debitCents: 0, creditCents: 250000 },
    ]);
    expect(() => validateEntryLines(lines)).not.toThrow();
  });

  it("money out: debits the category, credits the bank", () => {
    const lines = buildCategorizationLines("bank", "rent", -8925);
    expect(lines).toEqual([
      { accountId: "rent", debitCents: 8925, creditCents: 0 },
      { accountId: "bank", debitCents: 0, creditCents: 8925 },
    ]);
    expect(() => validateEntryLines(lines)).not.toThrow();
  });

  it("rejects zero amounts", () => {
    expect(() => buildCategorizationLines("bank", "rent", 0)).toThrow(/zero/);
  });

  it("rejects categorizing to the same bank account", () => {
    expect(() => buildCategorizationLines("bank", "bank", 100)).toThrow(
      /own bank account/,
    );
  });

  it("rejects non-integer amounts", () => {
    expect(() => buildCategorizationLines("bank", "rent", 10.5)).toThrow(
      /integer/,
    );
  });
});
