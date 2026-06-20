import { describe, it, expect } from "vitest";
import { computePaygCost, paygUnitRate } from "@/lib/billing/payg";
import { planIsPayg, planHasSeatSharing } from "@/lib/revenue-os/pricing";

describe("PAYG cost", () => {
  it("bills $0.10 per credit by default", () => {
    expect(computePaygCost(100)).toBe(10);
    expect(computePaygCost(1)).toBe(0.1);
  });

  it("bills $0.13 per hyper-personalized credit", () => {
    expect(computePaygCost(100, true)).toBe(13);
    expect(paygUnitRate(true)).toBe(0.13);
    expect(paygUnitRate(false)).toBe(0.1);
  });

  it("rounds to cents and ignores non-positive input", () => {
    expect(computePaygCost(3)).toBe(0.3);
    expect(computePaygCost(0)).toBe(0);
    expect(computePaygCost(-5)).toBe(0);
  });
});

describe("plan billing classification", () => {
  it("marks only Custom Enterprise as pay-as-you-go", () => {
    expect(planIsPayg("custom")).toBe(true);
    expect(planIsPayg("scale")).toBe(false);
    expect(planIsPayg("free")).toBe(false);
  });

  it("identifies seat-sharing plans (1–10 shared seats, or unlimited)", () => {
    expect(planHasSeatSharing("solo")).toBe(true); // up to 10 seats
    expect(planHasSeatSharing("team")).toBe(true);
    expect(planHasSeatSharing("scale")).toBe(true);
    expect(planHasSeatSharing("enterprise")).toBe(true); // unlimited (-1)
  });
});
