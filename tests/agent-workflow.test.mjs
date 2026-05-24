import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function loadTsModule(path) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    if (id === "server-only") return {};
    return require(id);
  };
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

const { evaluateSendGates } = loadTsModule("src/lib/email/gates.ts");
const { sendGateOutputSchema, emailWriterOutputSchema } = loadTsModule("lib/agents/schemas.ts");
const { revenuePlans, creditCosts, targetOutcomeRates } = loadTsModule("lib/revenue-os/pricing.ts");
const { validatePublicBusinessData, evaluateAiVoiceCallCompliance, evaluateFundraisingCompliance } = loadTsModule("lib/revenue-os/compliance.ts");

test("send gates pass only when all eight production gates pass", () => {
  const result = evaluateSendGates({
    lead: { email: "alex@example.com", company: "Example Co" },
    icpScore: { fit_score: 72 },
    research: { confidence: 81 },
    strategy: { risk_level: "low" },
    emailScore: { score: 88 },
    verification: { status: "valid" },
    draft: { approval_status: "approved" },
    credits: 3,
    notUnsubscribed: true,
    complianceReady: true,
    dailySendingRemaining: 10,
    duplicateRecipient: false,
    requireConnectedSendingAccount: true,
    connectedSendingAccount: true,
  });

  assert.equal(result.pass, true);
  assert.equal(result.checks.length, 14);
  assert.deepEqual(result.failures, []);
});

test("launch pricing and credit schedule match Revenue OS packaging", () => {
  assert.deepEqual(revenuePlans.map((plan) => plan.key), [
    "free",
    "starter",
    "go",
    "pro",
    "plus",
    "grow",
    "expand",
    "advanced_expansion",
    "custom_enterprise",
  ]);
  assert.equal(revenuePlans.find((plan) => plan.key === "free").monthlyCredits, 150);
  assert.equal(revenuePlans.find((plan) => plan.key === "starter").priceMonthlyUsd, 49);
  assert.equal(revenuePlans.find((plan) => plan.key === "advanced_expansion").monthlyCredits, 20000);
  assert.equal(creditCosts.ai_call_minute, 3);
  assert.equal(creditCosts.investor_outreach, 6);
  assert.equal(targetOutcomeRates.meetingRatePct, 10);
  assert.equal(targetOutcomeRates.emailDealRatePct, 1);
  assert.equal(targetOutcomeRates.callDealRatePct, 5);
});

test("voice, fundraising, and data compliance gates fail closed", () => {
  assert.equal(validatePublicBusinessData({
    text: "I saw your private browsing history.",
    sources: [{ provider: "public", source_url: "https://example.com", collected_at: new Date().toISOString(), confidence: 90, allowed_channels: ["email"] }],
  }).passed, false);

  assert.equal(evaluateAiVoiceCallCompliance({
    consent_basis: "manual_review_required",
    jurisdiction: "US",
    dnc_checked: false,
    call_time_allowed: false,
    ai_disclosure_required: true,
    ai_disclosure_script: "This is an AI assistant.",
    recording_consent_required: true,
    recording_consent_obtained: false,
    opt_out_supported: true,
    user_approved_campaign_purpose: false,
  }).passed, false);

  assert.equal(evaluateFundraisingCompliance({
    no_guaranteed_funding_claims: false,
    no_fabricated_traction: true,
    approved_securities_language: false,
    investor_source_provenance: [{ provider: "public", source_url: "https://example.com", collected_at: new Date().toISOString(), confidence: 85, allowed_channels: ["fundraising"] }],
    needs_legal_review: true,
  }).passed, false);
});

test("low-confidence research blocks sending even when personalization confidence is high", () => {
  const result = evaluateSendGates({
    lead: { email: "alex@example.com", company: "Example Co" },
    icpScore: { fit_score: 90 },
    research: { confidence: 30 },
    strategy: { confidence: 95, risk_level: "low" },
    emailScore: { score: 90 },
    verification: { status: "valid" },
    draft: { approval_status: "approved" },
    credits: 2,
    notUnsubscribed: true,
    complianceReady: true,
    dailySendingRemaining: 10,
    duplicateRecipient: false,
    requireConnectedSendingAccount: true,
    connectedSendingAccount: true,
  });

  assert.equal(result.pass, false);
  assert.match(result.failures.join(" "), /Research confidence/);
});

test("high personalization risk, invalid email, missing approval, and no credits block sending", () => {
  const result = evaluateSendGates({
    lead: { email: "alex@example.com", company: "Example Co" },
    icpScore: { fit_score: 76 },
    research: { confidence: 76 },
    strategy: { risk_level: "high" },
    emailScore: { score: 74 },
    verification: { status: "risky" },
    draft: { approval_status: "needs_review" },
    credits: 0,
    notUnsubscribed: false,
    complianceReady: false,
    dailySendingRemaining: 0,
    duplicateRecipient: true,
    requireConnectedSendingAccount: true,
    connectedSendingAccount: false,
  });

  assert.equal(result.pass, false);
  assert.match(result.failures.join(" "), /Personalization risk/);
  assert.match(result.failures.join(" "), /minimum is 75/);
  assert.match(result.failures.join(" "), /verification/);
  assert.match(result.failures.join(" "), /approval/);
  assert.match(result.failures.join(" "), /Credits/);
  assert.match(result.failures.join(" "), /unsubscribe/);
  assert.match(result.failures.join(" "), /Compliance/);
  assert.match(result.failures.join(" "), /Daily/);
  assert.match(result.failures.join(" "), /Duplicate/);
  assert.match(result.failures.join(" "), /mailbox/i);
});

test("agent schemas reject unsafe incomplete output before persistence", () => {
  assert.throws(() => sendGateOutputSchema.parse({
    lead_id: "not-a-uuid",
    campaign_id: "not-a-uuid",
    eligible_to_send: true,
    checks: [],
    failures: [],
    needs_review: false,
    decision: "send",
  }));

  assert.throws(() => emailWriterOutputSchema.parse({
    lead_id: "00000000-0000-0000-0000-000000000000",
    subject_1: "Quick question",
    subject_2: "Question",
    email_body: "I saw your private browsing history.",
    cta: "Open to talking?",
    tone: "direct",
    word_count: -1,
  }));
});
