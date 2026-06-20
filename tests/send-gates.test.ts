import { describe, it, expect } from "vitest";
import { evaluateSendGates, GATE_THRESHOLDS, type GateInput } from "@/lib/agents/send-gate-agent";

const passing: GateInput = {
  credits: 10,
  icpScore: 80,
  researchScore: 75,
  emailScore: 90,
  emailVerified: true,
  humanApproved: true,
  personalizationRisk: "low",
};

describe("send gates", () => {
  it("passes when every gate is satisfied", () => {
    const result = evaluateSendGates(passing);
    expect(result.passed).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it("blocks when ICP fit is below threshold", () => {
    const result = evaluateSendGates({ ...passing, icpScore: GATE_THRESHOLDS.icpFit - 1 });
    expect(result.passed).toBe(false);
    expect(result.gates.icpFit.passed).toBe(false);
    expect(result.blockers.join(" ")).toContain("ICP fit");
  });

  it("blocks at exactly one below each threshold and passes at the threshold", () => {
    expect(evaluateSendGates({ ...passing, researchScore: GATE_THRESHOLDS.researchConfidence }).passed).toBe(true);
    expect(evaluateSendGates({ ...passing, researchScore: GATE_THRESHOLDS.researchConfidence - 1 }).passed).toBe(false);
    expect(evaluateSendGates({ ...passing, emailScore: GATE_THRESHOLDS.emailScore }).passed).toBe(true);
    expect(evaluateSendGates({ ...passing, emailScore: GATE_THRESHOLDS.emailScore - 1 }).passed).toBe(false);
  });

  it("blocks unverified email, unapproved drafts, zero credits, and high risk", () => {
    expect(evaluateSendGates({ ...passing, emailVerified: false }).passed).toBe(false);
    expect(evaluateSendGates({ ...passing, humanApproved: false }).passed).toBe(false);
    expect(evaluateSendGates({ ...passing, credits: 0 }).passed).toBe(false);
    expect(evaluateSendGates({ ...passing, personalizationRisk: "high" }).passed).toBe(false);
  });

  it("reports every failing gate at once", () => {
    const result = evaluateSendGates({
      credits: 0, icpScore: 0, researchScore: 0, emailScore: 0,
      emailVerified: false, humanApproved: false, personalizationRisk: "high",
    });
    expect(result.passed).toBe(false);
    expect(result.blockers.length).toBe(7);
  });
});
