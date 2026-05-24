import { z } from "zod";

export const revenueWorkflowStateSchema = z.enum([
  "researching",
  "drafting",
  "calling",
  "meeting_booking",
  "deal_followup",
  "fundraising",
  "needs_review",
  "blocked",
  "closed",
]);

export const outreachChannelSchema = z.enum(["email", "call", "meeting", "fundraising", "crm"]);

export const dataSourceSchema = z.object({
  provider: z.string().min(1),
  source_url: z.string().url().optional().nullable(),
  source_record_id: z.string().optional().nullable(),
  collected_at: z.string().datetime(),
  confidence: z.number().int().min(0).max(100),
  allowed_channels: z.array(outreachChannelSchema),
});

export const aiVoiceCallComplianceSchema = z.object({
  consent_basis: z.enum(["express_written", "existing_business_relationship", "manual_review_required"]),
  jurisdiction: z.string().min(2),
  dnc_checked: z.boolean(),
  call_time_allowed: z.boolean(),
  ai_disclosure_required: z.boolean(),
  ai_disclosure_script: z.string().min(1),
  recording_consent_required: z.boolean(),
  recording_consent_obtained: z.boolean(),
  opt_out_supported: z.boolean(),
  user_approved_campaign_purpose: z.boolean(),
});

export const fundraisingComplianceSchema = z.object({
  no_guaranteed_funding_claims: z.boolean(),
  no_fabricated_traction: z.boolean(),
  approved_securities_language: z.boolean(),
  investor_source_provenance: z.array(dataSourceSchema).min(1),
  needs_legal_review: z.boolean(),
});

export function isUnsafePrivateSignal(text: string) {
  return /(private browsing|watched your|liked your|hidden social|private message|direct message|dm|logged-in scrape|secretly tracking|personal inbox)/iu.test(text);
}

export function validatePublicBusinessData(input: { text: string; sources: Array<z.infer<typeof dataSourceSchema>> }) {
  if (isUnsafePrivateSignal(input.text)) {
    return { passed: false, issues: ["Private or logged-in activity cannot be used for outreach."] };
  }
  if (!input.sources.length) return { passed: false, issues: ["At least one public or authorized business source is required."] };
  const weak = input.sources.filter((source) => source.confidence < 60);
  return {
    passed: weak.length === 0,
    issues: weak.length ? ["One or more sources are below the 60 confidence launch threshold."] : [],
  };
}

export function evaluateAiVoiceCallCompliance(input: z.infer<typeof aiVoiceCallComplianceSchema>) {
  const issues = [];
  if (input.consent_basis === "manual_review_required") issues.push("AI voice call requires manual legal review before dialing.");
  if (!input.dnc_checked) issues.push("DNC status must be checked before calling.");
  if (!input.call_time_allowed) issues.push("Call time is not allowed for this recipient.");
  if (!input.ai_disclosure_required || !input.ai_disclosure_script.trim()) issues.push("AI caller disclosure is required.");
  if (input.recording_consent_required && !input.recording_consent_obtained) issues.push("Recording consent is required before recording.");
  if (!input.opt_out_supported) issues.push("Call opt-out handling must be supported.");
  if (!input.user_approved_campaign_purpose) issues.push("User-approved campaign purpose is required.");
  return { passed: issues.length === 0, issues };
}

export function evaluateFundraisingCompliance(input: z.infer<typeof fundraisingComplianceSchema>) {
  const issues = [];
  if (!input.no_guaranteed_funding_claims) issues.push("Fundraising outreach cannot guarantee funding.");
  if (!input.no_fabricated_traction) issues.push("Fundraising outreach cannot include fabricated traction.");
  if (!input.approved_securities_language) issues.push("Fundraising outreach needs approved securities language.");
  if (input.needs_legal_review) issues.push("Fundraising workflow requires legal review.");
  const provenance = validatePublicBusinessData({ text: "fundraising outreach", sources: input.investor_source_provenance });
  issues.push(...provenance.issues);
  return { passed: issues.length === 0, issues };
}
