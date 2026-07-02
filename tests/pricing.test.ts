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
  it("has no free tier — entry plan is Launch (Solo)", () => {
    expect((plans as Record<string, unknown>).free).toBeUndefined();
    expect(plans.solo_launch.priceMonthlyUsd).toBe(199);
  });

  it("applies a 2.5% deal fee on every tier", () => {
    for (const plan of revenuePlans) {
      expect(plan.dealFeePct).toBe(2.5);
    }
  });

  it("prices the confirmed ladder", () => {
    expect(plans.solo_launch.priceMonthlyUsd).toBe(199);
    expect(plans.solo_momentum.priceMonthlyUsd).toBe(399);
    expect(plans.solo_velocity.priceMonthlyUsd).toBe(699);
    expect(plans.team_crew.priceMonthlyUsd).toBe(999);
    expect(plans.team_engine.priceMonthlyUsd).toBe(2499);
    expect(plans.team_powerhouse.priceMonthlyUsd).toBe(4999);
    expect(plans.enterprise_scale.priceMonthlyUsd).toBe(9999);
    expect(plans.enterprise_apex.priceMonthlyUsd).toBe(19999);
    expect(plans.enterprise_custom.priceMonthlyUsd).toBeNull();
  });

  it("pools credits across seats on team (10) and enterprise; solo is single-seat", () => {
    expect(plans.solo_launch.maxTeamSeats).toBe(1);
    expect(plans.team_engine.maxTeamSeats).toBe(10);
    expect(plans.enterprise_scale.maxTeamSeats).toBe(200);
  });

  it("sets team hyper-personalization add-ons (199 / 399 / 799)", () => {
    expect(plans.team_crew.hyperPersonalizationUsd).toBe(199);
    expect(plans.team_engine.hyperPersonalizationUsd).toBe(399);
    expect(plans.team_powerhouse.hyperPersonalizationUsd).toBe(799);
  });

  it("PAYG (Custom Enterprise API) charges $0.12 per credit ($0.15 hyper)", () => {
    expect(paygRates.creditUsd).toBe(0.12);
    expect(paygRates.hyperPersonalizedCreditUsd).toBe(0.15);
  });

  it("getRevenuePlan falls back to the entry plan for unknown/empty keys", () => {
    expect(getRevenuePlan(undefined).key).toBe("solo_launch");
    expect(getRevenuePlan("nonsense").key).toBe("solo_launch");
    expect(getRevenuePlan("team_engine").key).toBe("team_engine");
  });
});

describe("plan limits", () => {
  it("blocks a Launch user at their campaign cap", () => {
    expect(isWithinPlan("solo_launch", { campaigns: 0, mailboxes: 1 })).toBe(true);
    expect(isWithinPlan("solo_launch", { campaigns: 3, mailboxes: 1 })).toBe(false);
  });

  it("treats -1 caps as unlimited", () => {
    expect(isWithinPlan("enterprise_scale", { campaigns: 9999, mailboxes: 3 })).toBe(true);
  });
});
