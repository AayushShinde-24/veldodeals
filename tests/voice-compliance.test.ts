import { describe, it, expect } from "vitest";
import { evaluateCallCompliance, CALL_WINDOW_START_HOUR, CALL_WINDOW_END_HOUR } from "@/lib/voice/compliance";

const base = {
  consentBasis: "existing_business_relationship",
  toPhone: "+14155550123",
  localHour: 12,
  onDncList: false,
  disclosureGiven: true,
};

describe("call compliance", () => {
  it("allows a fully compliant call", () => {
    expect(evaluateCallCompliance(base).allowed).toBe(true);
  });

  it("blocks DNC numbers", () => {
    const r = evaluateCallCompliance({ ...base, onDncList: true });
    expect(r.allowed).toBe(false);
    expect(r.blockers.join(" ")).toMatch(/do-not-call/i);
  });

  it("blocks outside the calling window", () => {
    expect(evaluateCallCompliance({ ...base, localHour: CALL_WINDOW_START_HOUR - 1 }).allowed).toBe(false);
    expect(evaluateCallCompliance({ ...base, localHour: CALL_WINDOW_END_HOUR }).allowed).toBe(false);
    expect(evaluateCallCompliance({ ...base, localHour: CALL_WINDOW_START_HOUR }).allowed).toBe(true);
  });

  it("requires consent basis and AI disclosure", () => {
    expect(evaluateCallCompliance({ ...base, consentBasis: "" }).allowed).toBe(false);
    expect(evaluateCallCompliance({ ...base, disclosureGiven: false }).allowed).toBe(false);
  });

  it("rejects invalid phone numbers", () => {
    expect(evaluateCallCompliance({ ...base, toPhone: "abc" }).allowed).toBe(false);
    expect(evaluateCallCompliance({ ...base, toPhone: null }).allowed).toBe(false);
  });

  it("requires recording consent only when recording", () => {
    expect(evaluateCallCompliance({ ...base, recordingConsentRequired: true, recordingConsentGiven: false }).allowed).toBe(false);
    expect(evaluateCallCompliance({ ...base, recordingConsentRequired: true, recordingConsentGiven: true }).allowed).toBe(true);
  });

  it("collects all blockers at once", () => {
    const r = evaluateCallCompliance({ consentBasis: null, toPhone: null, localHour: 2, onDncList: true, disclosureGiven: false });
    expect(r.allowed).toBe(false);
    expect(r.blockers.length).toBeGreaterThanOrEqual(4);
  });
});
