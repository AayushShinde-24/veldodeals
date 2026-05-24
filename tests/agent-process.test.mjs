import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";

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

const {
  agentNameSchema,
  agentOutputSchemas,
  campaignLeaderOutputSchema,
  leadImportOutputSchema,
  companyResearchOutputSchema,
  publicSignalOutputSchema,
  icpFitOutputSchema,
  personalizationOutputSchema,
  emailWriterOutputSchema,
  emailQualityOutputSchema,
  emailVerificationOutputSchema,
  sendGateOutputSchema,
  sendingOutputSchema,
  voiceCallOutputSchema,
  meetingBookingOutputSchema,
  dealClosingOutputSchema,
  investorPipelineOutputSchema,
  fundraisingOutputSchema,
  replyClassificationOutputSchema,
  analyticsLearningOutputSchema,
} = loadTsModule("lib/agents/schemas.ts");

const { evaluateSendGates } = loadTsModule("src/lib/email/gates.ts");
const campaignId = "11111111-1111-4111-8111-111111111111";
const leadId = "22222222-2222-4222-8222-222222222222";

test("agent registry includes every required sales workflow agent", () => {
  const expectedAgents = [
    "campaign_leader",
    "lead_import",
    "lead_enrichment",
    "company_research",
    "public_signal_research",
    "icp_fit",
    "personalization_strategy",
    "email_strategy",
    "email_writer",
    "email_quality_scoring",
    "email_verification",
    "send_gate",
    "campaign_sequence",
    "sending",
    "voice_call",
    "meeting_booking",
    "deal_closing",
    "investor_pipeline",
    "fundraising",
    "reply_classification",
    "crm_sync",
    "analytics_learning",
    "billing_credits",
    "admin_qa",
  ];

  assert.deepEqual(agentNameSchema.options, expectedAgents);
  for (const agent of expectedAgents) {
    assert.ok(agentOutputSchemas[agent], `${agent} must have a validated output schema`);
  }
});

test("campaign leader schema enforces routing, pause or continue decisions, and review flags", () => {
  const paused = campaignLeaderOutputSchema.parse({
    campaign_id: campaignId,
    current_stage: "lead intake",
    next_agent: "lead_import",
    task: "Collect missing lead filters",
    reason: "Audience criteria are too broad.",
    required_inputs: ["job titles", "market sector"],
    blocking_issues: ["Lead count is missing"],
    confidence: 48,
    needs_human_review: true,
    allowed_to_continue: false,
  });

  assert.equal(paused.allowed_to_continue, false);
  assert.equal(paused.needs_human_review, true);
  assert.throws(() => campaignLeaderOutputSchema.parse({ ...paused, next_agent: "random_agent" }));
});

test("lead, research, scoring, strategy, writing, QA, verification, send, reply, and reporting schemas cover the full process", () => {
  assert.equal(leadImportOutputSchema.parse({
    valid_leads: [{ email: "alex@example.com", company: "Example Co", title: "VP Sales" }],
    rejected_leads: [{ raw: { name: "No Email" }, reason: "Missing email" }],
    duplicate_count: 0,
    import_quality_score: 72,
    notes: "Saved valid leads and rejected incomplete records.",
  }).valid_leads.length, 1);

  assert.equal(companyResearchOutputSchema.parse({
    lead_id: leadId,
    company_summary: "Public website says Example Co sells revenue software.",
    target_customers: "Revenue teams",
    product_offering: "Pipeline tools",
    positioning: "Operational system",
    possible_pain_points: ["Manual research"],
    useful_pages: [{ title: "About", url: "https://example.com/about" }],
    confidence: 61,
  }).confidence, 61);

  assert.equal(publicSignalOutputSchema.parse({
    lead_id: leadId,
    signals: [],
    best_signal: "No strong public signal found.",
    confidence: 35,
  }).confidence, 35);

  assert.equal(icpFitOutputSchema.parse({
    lead_id: leadId,
    fit_score: 49,
    fit_level: "low",
    reason: "Below ICP threshold.",
    should_continue: false,
  }).should_continue, false);

  assert.equal(personalizationOutputSchema.parse({
    lead_id: leadId,
    business_priority: "Pipeline quality",
    pain_point: "Manual research",
    public_trigger: "Weak evidence",
    personalization_angle: "Use broad business context only",
    opener: "Noticed your team is focused on pipeline quality.",
    risk_level: "medium",
    confidence: 45,
    needs_review: true,
  }).needs_review, true);

  assert.throws(() => emailWriterOutputSchema.parse({
    lead_id: leadId,
    subject_1: "Quick question",
    subject_2: "Saw this",
    email_body: "I saw your private browsing history and thought we should talk.",
    cta: "Open to talking?",
    tone: "direct",
    personalization_used: [],
    assumptions: [],
    word_count: 12,
  }));

  assert.equal(emailQualityOutputSchema.parse({
    lead_id: leadId,
    score: 74,
    pass: false,
    fail_reason: "Below send threshold.",
    fixes: ["Tighten claim"],
    final_verdict: "revise",
  }).pass, false);

  assert.equal(emailVerificationOutputSchema.parse({
    lead_id: leadId,
    email: "alex@example.com",
    status: "unknown",
    send_decision: "review",
    reason: "Verification could not confirm deliverability.",
  }).status, "unknown");

  assert.equal(sendingOutputSchema.parse({
    sent: false,
    lead_id: leadId,
    campaign_id: campaignId,
    provider_message_id: "not-sent",
    credits_used: 0,
    status: "blocked",
  }).credits_used, 0);

  assert.equal(voiceCallOutputSchema.parse({
    lead_id: leadId,
    campaign_id: campaignId,
    status: "needs_review",
    consent_basis: "manual_review_required",
    compliance_checks: ["DNC status must be checked before calling."],
    script: "Disclose AI assistance and ask for permission to continue.",
    needs_review: true,
  }).needs_review, true);

  assert.equal(meetingBookingOutputSchema.parse({
    lead_id: leadId,
    campaign_id: campaignId,
    status: "suggested",
    meeting_goal: "Qualify the opportunity.",
    suggested_slots: [new Date().toISOString()],
    crm_stage: "meeting_booked",
    needs_review: false,
  }).crm_stage, "meeting_booked");

  assert.equal(dealClosingOutputSchema.parse({
    lead_id: leadId,
    campaign_id: campaignId,
    deal_stage: "proposal_sent",
    next_action: "Follow up on decision criteria.",
    follow_up_plan: ["Confirm timeline"],
    revenue_confidence: 72,
    needs_review: false,
  }).deal_stage, "proposal_sent");

  assert.equal(investorPipelineOutputSchema.parse({
    campaign_id: campaignId,
    investors_found: 1,
    matched_investors: [{ name: "Investor", firm: "Fund", match_score: 80, source_url: "https://example.com", allowed_channels: ["email"] }],
    provenance_complete: true,
    needs_review: false,
  }).investors_found, 1);

  assert.throws(() => fundraisingOutputSchema.parse({
    campaign_id: campaignId,
    status: "drafted",
    pitch_angle: "Guaranteed funding for fake traction.",
    email_subject: "Guaranteed funding",
    email_body: "We guarantee investment with unverified revenue.",
    compliance_checks: [],
    needs_legal_review: false,
  }));

  assert.equal(replyClassificationOutputSchema.parse({
    lead_id: leadId,
    reply_class: "unsubscribe",
    sentiment: "negative",
    next_action: "Stop sequence",
    should_stop_sequence: true,
    should_create_deal: false,
  }).should_stop_sequence, true);

  assert.doesNotMatch(analyticsLearningOutputSchema.parse({
    campaign_id: campaignId,
    summary: "Campaign completed with three replies and one booked meeting.",
    best_performing_segment: "Revenue teams",
    weakness: "Low verified lead volume",
    recommended_change: "Narrow the market sector and rerun lead search.",
    risk_flags: [],
  }).summary, /Supabase|Apollo|GPT|OpenAI|Claude|Anthropic|Gmail|Google|Resend|Firecrawl|Tavily|ZeroBounce|Clay/u);
});

test("email score launch threshold is 75", () => {
  const base = {
    lead: { email: "alex@example.com", company: "Example Co" },
    icpScore: { fit_score: 75 },
    research: { confidence: 75 },
    strategy: { risk_level: "low" },
    verification: { status: "valid" },
    draft: { approval_status: "approved" },
    credits: 1,
    notUnsubscribed: true,
    complianceReady: true,
    dailySendingRemaining: 1,
    duplicateRecipient: false,
    requireConnectedSendingAccount: true,
    connectedSendingAccount: true,
  };

  assert.equal(evaluateSendGates({ ...base, emailScore: { score: 74 } }).pass, false);
  assert.equal(evaluateSendGates({ ...base, emailScore: { score: 75 } }).pass, true);
  assert.equal(evaluateSendGates({ ...base, emailScore: { score: 80 } }).pass, true);
});

test("send gates block every unsafe sending condition and only pass after all gates clear", () => {
  const blocked = evaluateSendGates({
    lead: { email: "", company: "" },
    icpScore: { fit_score: 49 },
    research: { confidence: 59 },
    strategy: { risk_level: "high" },
    emailScore: { score: 74 },
    verification: { status: "unknown" },
    draft: { approval_status: "needs_review" },
    credits: 0,
    notUnsubscribed: false,
    complianceReady: false,
    dailySendingRemaining: 0,
    duplicateRecipient: true,
    requireConnectedSendingAccount: true,
    connectedSendingAccount: false,
  });

  assert.equal(blocked.pass, false);
  assert.equal(blocked.checks.length, 14);
  assert.ok(blocked.failures.length >= 12);
  assert.match(blocked.failures.join(" "), /mailbox/i);
  assert.match(blocked.failures.join(" "), /minimum is 75/);

  const passed = evaluateSendGates({
    lead: { email: "alex@example.com", company: "Example Co" },
    icpScore: { fit_score: 75 },
    research: { confidence: 75 },
    strategy: { risk_level: "low" },
    emailScore: { score: 75 },
    verification: { status: "valid" },
    draft: { approval_status: "approved" },
    credits: 1,
    notUnsubscribed: true,
    complianceReady: true,
    dailySendingRemaining: 1,
    duplicateRecipient: false,
    requireConnectedSendingAccount: true,
    connectedSendingAccount: true,
  });

  assert.equal(passed.pass, true);
});

test("visible process UI names every major workflow state without provider names", () => {
  const source = readFileSync(new URL("../app/agent/veldo-chat-client.tsx", import.meta.url), "utf8")
    .split(/\r?\n/u)
    .filter((line) => !line.includes(".replace("))
    .join("\n");

  for (const state of [
    "Understanding",
    "Strategy",
    "Lead search",
    "Research",
    "Drafting",
    "QA",
    "Gate check",
    "Sending readiness",
    "Sent",
    "Follow-up",
    "Replies",
  ]) {
    assert.match(source, new RegExp(state.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), `${state} should be visible`);
  }

  assert.doesNotMatch(source, /Supabase|Apollo|GPT|OpenAI|Claude|Anthropic|Gmail|Google|Resend|Firecrawl|Tavily|ZeroBounce|Clay/u);
});
