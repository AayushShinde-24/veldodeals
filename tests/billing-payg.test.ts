import { describe, it, expect } from "vitest";
import { computePaygCost, paygUnitRate } from "@/lib/billing/payg";
import { planIsPayg, planHasSeatSharing } from "@/lib/revenue-os/pricing";

describe("PAYG cost", () => {
  it("bills $0.12 per credit by default", () => {
    expect(computePaygCost(100)).toBe(12);
    expect(computePaygCost(1)).toBe(0.12);
  });

  it("bills $0.15 per hyper-personalized credit", () => {
    expect(computePaygCost(100, true)).toBe(15);
    expect(paygUnitRate(true)).toBe(0.15);
    expect(paygUnitRate(false)).toBe(0.12);
  });

  it("rounds to cents and ignores non-positive input", () => {
    expect(computePaygCost(3)).toBe(0.36);
    expect(computePaygCost(0)).toBe(0);
    expect(computePaygCost(-5)).toBe(0);
  });
});

describe("plan billing classification", () => {
  it("marks only Custom Enterprise as pay-as-you-go", () => {
    expect(planIsPayg("enterprise_custom")).toBe(true);
    expect(planIsPayg("enterprise_scale")).toBe(false);
    expect(planIsPayg("free")).toBe(false);
  });

  it("identifies seat-sharing plans; solo is single-seat", () => {
    expect(planHasSeatSharing("solo_launch")).toBe(false); // private balance, 1 seat
    expect(planHasSeatSharing("team_engine")).toBe(true); // up to 10 seats
    expect(planHasSeatSharing("enterprise_scale")).toBe(true); // 200 seats
    expect(planHasSeatSharing("enterprise_custom")).toBe(true); // unlimited (-1)
  });
});
