import { describe, it, expect } from "vitest";
import { creditsRequired, creditCosts, isWithinPlan, getRevenuePlan, plans, revenuePlans, paygRates } from "@/lib/revenue-os/pricing";

describe("credit costs", () => {
  it("charges 1 credit per email and 10 per voice call", () => {
    expect(creditsRequired("email_send")).toBe(1);
    expect(creditsRequired("voice_call")).toBe(10);
  });

  it("matches the confirmed consumption (follow-up=3, call bundle=25, combined=30)", () => {
    expect(creditCosts.followup_3).toBe(3);
    expect(creditCosts.followup_5).toBe(3);
    expect(creditCosts.voice_calls_3).toBe(25);
    expect(creditCosts.combined_calls_emails).toBe(30);
  });

  it("defaults unknown operations to 1 credit", () => {
    expect(creditsRequired("totally_unknown_op")).toBe(1);
  });
});

describe("plans", () => {
  it("has no free tier — entry plan is Solo", () => {
    expect((plans as Record<string, unknown>).free).toBeUndefined();
    expect(plans.solo.priceMonthlyUsd).toBe(2499);
  });

  it("applies a 2.5% deal fee on every tier", () => {
    for (const plan of revenuePlans) {
      expect(plan.dealFeePct).toBe(2.5);
    }
  });

  it("prices the confirmed ladder", () => {
    expect(plans.solo.priceMonthlyUsd).toBe(2499);
    expect(plans.team.priceMonthlyUsd).toBe(4999);
    expect(plans.scale.priceMonthlyUsd).toBe(9999);
    expect(plans.enterprise.priceMonthlyUsd).toBe(8999);
    expect(plans.enterprise_max.priceMonthlyUsd).toBe(25999);
    expect(plans.custom.priceMonthlyUsd).toBeNull();
  });

  it("shares credits across up to 10 seats on the team plans", () => {
    expect(plans.solo.maxTeamSeats).toBe(10);
    expect(plans.team.maxTeamSeats).toBe(10);
    expect(plans.scale.maxTeamSeats).toBe(10);
  });

  it("PAYG / top-ups charge $0.10 per credit ($0.13 hyper)", () => {
    expect(paygRates.creditUsd).toBe(0.1);
    expect(paygRates.hyperPersonalizedCreditUsd).toBe(0.13);
  });

  it("getRevenuePlan falls back to solo for unknown/empty keys", () => {
    expect(getRevenuePlan(undefined).key).toBe("solo");
    expect(getRevenuePlan("nonsense").key).toBe("solo");
    expect(getRevenuePlan("scale").key).toBe("scale");
  });
});

describe("plan limits", () => {
  it("blocks a solo user at their campaign cap", () => {
    expect(isWithinPlan("solo", { campaigns: 0, mailboxes: 1 })).toBe(true);
    expect(isWithinPlan("solo", { campaigns: 5, mailboxes: 1 })).toBe(false);
  });

  it("treats -1 caps as unlimited", () => {
    expect(isWithinPlan("scale", { campaigns: 9999, mailboxes: 3 })).toBe(true);
  });
});
