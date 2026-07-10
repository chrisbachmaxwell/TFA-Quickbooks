import { describe, expect, it } from "vitest";
import { pickMirror } from "./transfer-match";

const day = (d: string) => new Date(`${d}T00:00:00Z`);

describe("pickMirror", () => {
  it("matches the exact opposite amount within the window", () => {
    expect(
      pickMirror(day("2026-05-01"), -500000, [
        { id: "a", date: day("2026-05-02"), amountCents: 500000 },
      ]),
    ).toBe("a");
  });

  it("rejects wrong amounts and out-of-window dates", () => {
    expect(
      pickMirror(day("2026-05-01"), -500000, [
        { id: "wrong-amount", date: day("2026-05-01"), amountCents: 499900 },
        { id: "same-sign", date: day("2026-05-01"), amountCents: -500000 },
        { id: "too-late", date: day("2026-05-05"), amountCents: 500000 },
      ]),
    ).toBeNull();
  });

  it("prefers the closest date, breaking ties to the earlier one", () => {
    expect(
      pickMirror(day("2026-05-03"), -500000, [
        { id: "far", date: day("2026-05-06"), amountCents: 500000 },
        { id: "near", date: day("2026-05-04"), amountCents: 500000 },
      ]),
    ).toBe("near");
    expect(
      pickMirror(day("2026-05-03"), -500000, [
        { id: "after", date: day("2026-05-04"), amountCents: 500000 },
        { id: "before", date: day("2026-05-02"), amountCents: 500000 },
      ]),
    ).toBe("before");
  });

  it("window boundary is inclusive at exactly 3 days", () => {
    expect(
      pickMirror(day("2026-05-01"), -100, [
        { id: "edge", date: day("2026-05-04"), amountCents: 100 },
      ]),
    ).toBe("edge");
  });
});
