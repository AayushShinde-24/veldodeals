import { describe, it, expect } from "vitest";
import { warmupDailyCap, warmupDayFrom, computeWarmupState, WARMUP_DAYS, WARMUP_MAX_CAP, WARMUP_START_CAP } from "@/lib/deliverability/warmup";
import { classifyMailboxHealth } from "@/lib/deliverability/mailbox-health";
import { evaluateCompliance, buildPostalIdentityLine } from "@/lib/deliverability/compliance-policy";

describe("warmup ramp", () => {
  it("starts low on day 1 and ramps", () => {
    expect(warmupDailyCap(1)).toBe(WARMUP_START_CAP);
    expect(warmupDailyCap(2)).toBeGreaterThan(warmupDailyCap(1));
  });

  it("reaches the max cap once warmed up", () => {
    expect(warmupDailyCap(WARMUP_DAYS)).toBe(WARMUP_MAX_CAP);
    expect(warmupDailyCap(WARMUP_DAYS + 10)).toBe(WARMUP_MAX_CAP);
  });

  it("never exceeds the provided ceiling", () => {
    expect(warmupDailyCap(50, 60)).toBe(60);
    expect(warmupDailyCap(1, 5)).toBe(5);
  });

  it("computes day from a start date", () => {
    const now = new Date("2026-01-15T00:00:00Z");
    expect(warmupDayFrom(new Date("2026-01-15T00:00:00Z"), now)).toBe(1);
    expect(warmupDayFrom(new Date("2026-01-10T00:00:00Z"), now)).toBe(6);
    expect(warmupDayFrom(null, now)).toBe(1);
  });

  it("marks warmed up after the window", () => {
    const now = new Date("2026-02-01T00:00:00Z");
    const state = computeWarmupState(new Date("2026-01-01T00:00:00Z"), 200, now);
    expect(state.warmedUp).toBe(true);
    expect(state.dailyCap).toBe(200);
  });
});

describe("mailbox health", () => {
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const allScopes = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.events";

  it("reports disconnected when there is no token", () => {
    expect(classifyMailboxHealth(null).status).toBe("disconnected");
  });

  it("reports healthy with valid token + scopes", () => {
    const h = classifyMailboxHealth({ email: "a@b.com", expires_at: future, scopes: allScopes, refresh_token: "r" });
    expect(h.status).toBe("healthy");
    expect(h.needsReconnect).toBe(false);
  });

  it("flags missing send scope", () => {
    const h = classifyMailboxHealth({ email: "a@b.com", expires_at: future, scopes: "https://www.googleapis.com/auth/gmail.readonly", refresh_token: "r" });
    expect(h.status).toBe("scope_missing");
    expect(h.needsReconnect).toBe(true);
  });

  it("flags expired token without refresh as needing reconnect", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const h = classifyMailboxHealth({ email: "a@b.com", expires_at: past, scopes: allScopes, refresh_token: null });
    expect(h.status).toBe("expired");
    expect(h.needsReconnect).toBe(true);
  });

  it("flags expiring-soon tokens (auto-refreshable)", () => {
    const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const h = classifyMailboxHealth({ email: "a@b.com", expires_at: soon, scopes: allScopes, refresh_token: "r" });
    expect(h.status).toBe("expiring");
    expect(h.needsReconnect).toBe(false);
  });
});

describe("compliance readiness", () => {
  const full = {
    company_name: "Acme",
    business_email: "hi@acme.com",
    physical_mailing_address: "1 Market St, SF, CA",
    outreach_purpose: "B2B sales",
    compliance_confirmation: true,
  };

  it("is ready when confirmed with sender identity + postal address", () => {
    const r = evaluateCompliance(full);
    expect(r.ready).toBe(true);
    expect(r.regulations.canSpam).toBe(true);
    expect(r.regulations.gdpr).toBe(true);
    expect(r.regulations.casl).toBe(true);
    expect(r.missing).toHaveLength(0);
  });

  it("is not ready without confirmation", () => {
    const r = evaluateCompliance({ ...full, compliance_confirmation: false });
    expect(r.ready).toBe(false);
    expect(r.missing).toContain("compliance_confirmation");
  });

  it("fails CAN-SPAM without a physical address", () => {
    const r = evaluateCompliance({ ...full, physical_mailing_address: "" });
    expect(r.regulations.canSpam).toBe(false);
    expect(r.ready).toBe(false);
    expect(r.missing).toContain("physical_mailing_address");
  });

  it("builds a postal identity line for the footer", () => {
    expect(buildPostalIdentityLine(full)).toBe("Acme · 1 Market St, SF, CA");
  });
});
