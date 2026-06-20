import { describe, it, expect } from "vitest";
import { scoreInvestorMatch } from "@/lib/fundraising/matching";
import { containsProhibitedClaims } from "@/lib/fundraising/outreach";

const investor = {
  stages: ["seed", "series-a"],
  sectors: ["ai", "b2b saas"],
  checkMin: 500_000,
  checkMax: 5_000_000,
  geographies: ["US"],
};

describe("investor matching", () => {
  it("scores a strong fit highly", () => {
    const r = scoreInvestorMatch(investor, {
      stage: "seed",
      sectors: ["ai"],
      targetCheck: 1_000_000,
      geography: "US",
    });
    expect(r.score).toBe(100);
  });

  it("penalizes wrong stage and sector", () => {
    const r = scoreInvestorMatch(investor, {
      stage: "series-c",
      sectors: ["biotech"],
      targetCheck: 1_000_000,
      geography: "US",
    });
    expect(r.stage).toBe(0);
    expect(r.sector).toBe(0);
    expect(r.score).toBeLessThan(50);
  });

  it("zeroes the check dimension when out of band", () => {
    const r = scoreInvestorMatch(investor, { stage: "seed", sectors: ["ai"], targetCheck: 50_000_000, geography: "US" });
    expect(r.check).toBe(0);
  });

  it("gives partial check credit when target unknown but band exists", () => {
    const r = scoreInvestorMatch(investor, { stage: "seed", sectors: ["ai"], geography: "US" });
    expect(r.check).toBeGreaterThan(0);
    expect(r.check).toBeLessThan(20);
  });

  it("normalizes casing and separators", () => {
    const r = scoreInvestorMatch(investor, { stage: "Seed", sectors: ["B2B_SaaS"], geography: "us" });
    expect(r.stage).toBeGreaterThan(0);
    expect(r.sector).toBeGreaterThan(0);
  });
});

describe("securities-language guardrail", () => {
  it("flags guaranteed/risk-free/return-promising language", () => {
    expect(containsProhibitedClaims("This is a guaranteed 10x return")).toBe(true);
    expect(containsProhibitedClaims("A risk-free investment")).toBe(true);
    expect(containsProhibitedClaims("We will double your money")).toBe(true);
  });

  it("passes compliant, factual copy", () => {
    expect(containsProhibitedClaims("We grew to 100 customers and are raising a seed round.")).toBe(false);
  });
});
