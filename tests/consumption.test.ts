import { describe, it, expect } from "vitest";
import { computeCreditCost, HYPER_PERSONALIZATION_MULTIPLIER } from "@/lib/revenue-os/pricing";

describe("computeCreditCost", () => {
  it("prices base actions per the confirmed model", () => {
    expect(computeCreditCost("email_send")).toBe(1);
    expect(computeCreditCost("voice_call")).toBe(10);
    expect(computeCreditCost("followup_3")).toBe(3);
    expect(computeCreditCost("followup_5")).toBe(3);
  });

  it("multiplies by quantity", () => {
    expect(computeCreditCost("email_send", { quantity: 10 })).toBe(10);
    expect(computeCreditCost("voice_call", { quantity: 3 })).toBe(30);
  });

  it("charges 25% more for hyper-personalization, rounded up", () => {
    expect(HYPER_PERSONALIZATION_MULTIPLIER).toBe(1.25);
    // email_send base = 1 → 1 * 1.25 = 1.25 → ceil → 2
    expect(computeCreditCost("email_send", { hyperPersonalization: true })).toBe(2);
    // voice_call base = 10 → 12.5 → ceil → 13
    expect(computeCreditCost("voice_call", { hyperPersonalization: true })).toBe(13);
  });

  it("defaults unknown actions to 1 credit", () => {
    expect(computeCreditCost("mystery_action")).toBe(1);
  });

  it("never returns a fractional credit", () => {
    const cost = computeCreditCost("email_send", { hyperPersonalization: true, quantity: 3 });
    expect(Number.isInteger(cost)).toBe(true);
  });
});
