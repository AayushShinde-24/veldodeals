import { describe, it, expect } from "vitest";
import { computeDealFee } from "@/lib/billing/deal-fees";

describe("computeDealFee", () => {
  it("takes 2.5% by default", () => {
    expect(computeDealFee(10000)).toBe(250);
    expect(computeDealFee(24000)).toBe(600);
  });

  it("rounds to cents", () => {
    expect(computeDealFee(1333.33)).toBeCloseTo(33.33, 2);
  });

  it("supports a custom fee percentage", () => {
    expect(computeDealFee(10000, 5)).toBe(500);
  });

  it("returns 0 for non-positive or invalid values", () => {
    expect(computeDealFee(0)).toBe(0);
    expect(computeDealFee(-100)).toBe(0);
    expect(computeDealFee(Number.NaN)).toBe(0);
  });
});
