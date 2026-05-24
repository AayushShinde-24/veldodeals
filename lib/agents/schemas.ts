import { z } from "zod";

export const agentStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "needs_review",
  "blocked",
]);

export const leadStageSchema = z.enum([
  "imported",
  "enriched",
  "researched",
  "signals_found",
  "scored",
  "personalized",
  "drafted",
  "scored_email",
  "verified",
  "needs_review",
  "approved",
  "sent",
  "rejected",
  "blocked",
]);

export const agentNameSchema = z.enum([
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
]);

export type AgentName = z.infer<typeof agentNameSchema>;

export const campaignLeaderOutputSchema = z.object({
  campaign_id: z.string().uuid(),
  current_stage: z.string().min(1),
  next_agent: agentNameSchema,
  task: z.string().min(1),
  reason: z.string().min(1),
  required_inputs: z.array(z.string()),
  blocking_issues: z.array(z.string()),
  confidence: z.number().int().min(0).max(100),
  needs_human_review: z.boolean(),
  allowed_to_continue: z.boolean(),
});

export const normalizedLeadSchema = z.object({
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  email: z.string().email(),
  title: z.string().nullable().optional(),
  company: z.string().min(1),
  company_website: z.string().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
});

export const rejectedLeadSchema = z.object({
  raw: z.record(z.string(), z.unknown()),
  reason: z.string().min(1),
});

export const leadImportOutputSchema = z.object({
  valid_leads: z.array(normalizedLeadSchema),
  rejected_leads: z.array(rejectedLeadSchema),
  duplicate_count: z.number().int().min(0),
  import_quality_score: z.number().int().min(0).max(100),
  notes: z.string(),
});

export const leadEnrichmentOutputSchema = z.object({
  lead_id: z.string().uuid(),
  enriched_profile: z.record(z.string(), z.unknown()),
  company_data: z.record(z.string(), z.unknown()),
  social_profiles: z.array(z.record(z.string(), z.unknown())),
  conflicts: z.array(z.string()),
  confidence: z.number().int().min(0).max(100),
  needs_review: z.boolean(),
});

export const companyResearchOutputSchema = z.object({
  lead_id: z.string().uuid(),
  company_summary: z.string(),
  target_customers: z.string(),
  product_offering: z.string(),
  positioning: z.string(),
  possible_pain_points: z.array(z.string()),
  useful_pages: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
    }),
  ),
  confidence: z.number().int().min(0).max(100),
});

export const publicSignalSchema = z.object({
  signal: z.string(),
  source_title: z.string(),
  source_url: z.string().url(),
  why_it_matters: z.string(),
  strength: z.number().int().min(0).max(100),
});

export const publicSignalOutputSchema = z.object({
  lead_id: z.string().uuid(),
  signals: z.array(publicSignalSchema).min(0).max(5),
  best_signal: z.string(),
  confidence: z.number().int().min(0).max(100),
});

export const icpFitOutputSchema = z.object({
  lead_id: z.string().uuid(),
  fit_score: z.number().int().min(0).max(100),
  fit_level: z.enum(["high", "medium", "low", "reject"]),
  reason: z.string(),
  should_continue: z.boolean(),
});

export const personalizationOutputSchema = z.object({
  lead_id: z.string().uuid(),
  business_priority: z.string(),
  pain_point: z.string(),
  public_trigger: z.string(),
  personalization_angle: z.string(),
  opener: z.string(),
  risk_level: z.enum(["low", "medium", "high"]),
  confidence: z.number().int().min(0).max(100),
  needs_review: z.boolean(),
});

export const emailStrategyOutputSchema = z.object({
  lead_id: z.string().uuid(),
  angle: z.string().min(1),
  pain_hypothesis: z.string().min(1),
  offer: z.string().min(1),
  cta: z.string().min(1),
  tone: z.string().min(1),
  objection_risk: z.string().min(1),
  facts_allowed: z.array(z.string()).default([]),
  facts_blocked: z.array(z.string()).default([]),
  confidence: z.number().int().min(0).max(100),
  needs_review: z.boolean(),
});

export const emailWriterOutputSchema = z.object({
  lead_id: z.string().uuid(),
  subject_1: z.string().min(1).max(90),
  subject_2: z.string().min(1).max(90),
  email_body: z.string().min(1).max(1400),
  cta: z.string().min(1).max(220),
  tone: z.string(),
  personalization_used: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  word_count: z.number().int().min(0),
}).superRefine((value, ctx) => {
  const unsafe = /(saw you liked|watched your|private|DM|direct message|browsing history|secretly|tracking you)/iu;
  const content = `${value.subject_1} ${value.subject_2} ${value.email_body}`;
  if (unsafe.test(content)) {
    ctx.addIssue({
      code: "custom",
      message: "Email copy must not imply private surveillance or invented private facts.",
      path: ["email_body"],
    });
  }
  if (value.word_count > 110) {
    ctx.addIssue({
      code: "custom",
      message: "Email body must stay under 110 words.",
      path: ["word_count"],
    });
  }
});

export const emailQualityOutputSchema = z.object({
  lead_id: z.string().uuid(),
  score: z.number().int().min(0).max(100),
  pass: z.boolean(),
  fail_reason: z.string(),
  fixes: z.array(z.string()),
  final_verdict: z.enum(["send", "revise", "reject"]),
});

export const emailVerificationOutputSchema = z.object({
  lead_id: z.string().uuid(),
  email: z.string().email(),
  status: z.enum(["valid", "invalid", "catch_all", "risky", "unknown"]),
  send_decision: z.enum(["send", "skip", "review"]),
  reason: z.string(),
});

export const sendGateCheckSchema = z.object({
  gate: z.enum([
    "lead_has_email_and_company",
    "icp_fit_score",
    "research_confidence",
    "personalization_risk",
    "email_score",
    "email_verification",
    "user_approval",
    "credits_available",
    "not_unsubscribed",
    "compliance_ready",
    "daily_limit_available",
    "no_duplicate_recipient",
    "sending_account_ready",
    "first_release_allowlist",
  ]),
  passed: z.boolean(),
  detail: z.string(),
});

export const sendGateOutputSchema = z.object({
  lead_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  eligible_to_send: z.boolean(),
  checks: z.array(sendGateCheckSchema).min(8),
  failures: z.array(z.string()),
  needs_review: z.boolean(),
  decision: z.enum(["send", "review", "blocked"]),
});

export const campaignSequenceOutputSchema = z.object({
  campaign_id: z.string().uuid(),
  steps: z.array(
    z.object({
      step_number: z.number().int().min(1).max(3),
      delay_days: z.number().int().min(0),
      subject: z.string(),
      body: z.string(),
      goal: z.string(),
    }),
  ).length(3),
});

export const sendingOutputSchema = z.object({
  sent: z.boolean(),
  lead_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  provider_message_id: z.string(),
  credits_used: z.number().int().min(0),
  status: z.string(),
});

export const voiceCallOutputSchema = z.object({
  lead_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  status: z.enum(["queued", "needs_review", "blocked", "completed"]),
  consent_basis: z.enum(["express_written", "existing_business_relationship", "manual_review_required"]),
  compliance_checks: z.array(z.string()),
  script: z.string().min(1),
  needs_review: z.boolean(),
});

export const meetingBookingOutputSchema = z.object({
  lead_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  status: z.enum(["suggested", "booked", "needs_review", "blocked"]),
  meeting_goal: z.string().min(1),
  suggested_slots: z.array(z.string()),
  crm_stage: z.enum(["interested", "meeting_booked", "demo_done", "proposal_sent", "negotiation", "won", "lost"]),
  needs_review: z.boolean(),
});

export const dealClosingOutputSchema = z.object({
  lead_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  deal_stage: z.enum(["interested", "meeting_booked", "demo_done", "proposal_sent", "negotiation", "won", "lost"]),
  next_action: z.string().min(1),
  follow_up_plan: z.array(z.string()),
  revenue_confidence: z.number().int().min(0).max(100),
  needs_review: z.boolean(),
});

export const investorPipelineOutputSchema = z.object({
  campaign_id: z.string().uuid(),
  investors_found: z.number().int().min(0),
  matched_investors: z.array(z.object({
    name: z.string(),
    firm: z.string().optional().default(""),
    match_score: z.number().int().min(0).max(100),
    source_url: z.string().url().optional(),
    allowed_channels: z.array(z.enum(["email", "call"])).default(["email"]),
  })),
  provenance_complete: z.boolean(),
  needs_review: z.boolean(),
});

export const fundraisingOutputSchema = z.object({
  campaign_id: z.string().uuid(),
  investor_id: z.string().uuid().optional(),
  status: z.enum(["drafted", "needs_review", "blocked", "sent", "meeting_booked"]),
  pitch_angle: z.string().min(1),
  email_subject: z.string().min(1).max(90),
  email_body: z.string().min(1).max(1400),
  compliance_checks: z.array(z.string()),
  needs_legal_review: z.boolean(),
}).superRefine((value, ctx) => {
  const unsafe = /(guaranteed funding|guarantee investment|fake traction|unverified revenue|risk-free investment)/iu;
  if (unsafe.test(`${value.pitch_angle} ${value.email_subject} ${value.email_body}`)) {
    ctx.addIssue({
      code: "custom",
      message: "Fundraising outreach must not guarantee funding or fabricate traction.",
      path: ["email_body"],
    });
  }
});

export const replyClassificationOutputSchema = z.object({
  lead_id: z.string().uuid(),
  reply_class: z.enum([
    "interested",
    "referral",
    "not_now",
    "wrong_person",
    "angry",
    "spam_complaint",
    "unknown",
    "positive",
    "neutral",
    "objection",
    "unsubscribe",
    "not_interested",
    "meeting_request",
    "out_of_office",
    "bounced",
    "spam_complaint_risk",
  ]),
  sentiment: z.string(),
  next_action: z.string(),
  should_stop_sequence: z.boolean(),
  should_create_deal: z.boolean(),
});

export const crmSyncOutputSchema = z.object({
  crm: z.string(),
  contact_id: z.string(),
  deal_id: z.string(),
  action: z.enum(["created", "updated", "skipped"]),
  notes: z.string(),
});

export const analyticsLearningOutputSchema = z.object({
  campaign_id: z.string().uuid(),
  summary: z.string(),
  best_performing_segment: z.string(),
  weakness: z.string(),
  recommended_change: z.string(),
  risk_flags: z.array(z.string()),
});

export const billingCreditsOutputSchema = z.object({
  user_id: z.string().uuid(),
  credit_change: z.number().int(),
  reason: z.string(),
  new_balance: z.number().int().min(0),
  ledger_saved: z.boolean(),
});

export const adminQaOutputSchema = z.object({
  issue: z.string(),
  root_cause: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  fix: z.string(),
  developer_task: z.string(),
});

export const agentOutputSchemas = {
  campaign_leader: campaignLeaderOutputSchema,
  lead_import: leadImportOutputSchema,
  lead_enrichment: leadEnrichmentOutputSchema,
  company_research: companyResearchOutputSchema,
  public_signal_research: publicSignalOutputSchema,
  icp_fit: icpFitOutputSchema,
  personalization_strategy: personalizationOutputSchema,
  email_strategy: emailStrategyOutputSchema,
  email_writer: emailWriterOutputSchema,
  email_quality_scoring: emailQualityOutputSchema,
  email_verification: emailVerificationOutputSchema,
  send_gate: sendGateOutputSchema,
  campaign_sequence: campaignSequenceOutputSchema,
  sending: sendingOutputSchema,
  voice_call: voiceCallOutputSchema,
  meeting_booking: meetingBookingOutputSchema,
  deal_closing: dealClosingOutputSchema,
  investor_pipeline: investorPipelineOutputSchema,
  fundraising: fundraisingOutputSchema,
  reply_classification: replyClassificationOutputSchema,
  crm_sync: crmSyncOutputSchema,
  analytics_learning: analyticsLearningOutputSchema,
  billing_credits: billingCreditsOutputSchema,
  admin_qa: adminQaOutputSchema,
} as const;

export type CampaignLeaderOutput = z.infer<typeof campaignLeaderOutputSchema>;
export type LeadImportOutput = z.infer<typeof leadImportOutputSchema>;
export type LeadEnrichmentOutput = z.infer<typeof leadEnrichmentOutputSchema>;
export type CompanyResearchOutput = z.infer<typeof companyResearchOutputSchema>;
export type PublicSignalOutput = z.infer<typeof publicSignalOutputSchema>;
export type IcpFitOutput = z.infer<typeof icpFitOutputSchema>;
export type PersonalizationOutput = z.infer<typeof personalizationOutputSchema>;
export type EmailStrategyOutput = z.infer<typeof emailStrategyOutputSchema>;
export type EmailWriterOutput = z.infer<typeof emailWriterOutputSchema>;
export type EmailQualityOutput = z.infer<typeof emailQualityOutputSchema>;
export type EmailVerificationOutput = z.infer<typeof emailVerificationOutputSchema>;
export type SendGateOutput = z.infer<typeof sendGateOutputSchema>;
export type CampaignSequenceOutput = z.infer<typeof campaignSequenceOutputSchema>;
export type SendingOutput = z.infer<typeof sendingOutputSchema>;
export type VoiceCallOutput = z.infer<typeof voiceCallOutputSchema>;
export type MeetingBookingOutput = z.infer<typeof meetingBookingOutputSchema>;
export type DealClosingOutput = z.infer<typeof dealClosingOutputSchema>;
export type InvestorPipelineOutput = z.infer<typeof investorPipelineOutputSchema>;
export type FundraisingOutput = z.infer<typeof fundraisingOutputSchema>;
export type ReplyClassificationOutput = z.infer<typeof replyClassificationOutputSchema>;
export type CrmSyncOutput = z.infer<typeof crmSyncOutputSchema>;
export type AnalyticsLearningOutput = z.infer<typeof analyticsLearningOutputSchema>;
export type BillingCreditsOutput = z.infer<typeof billingCreditsOutputSchema>;
export type AdminQaOutput = z.infer<typeof adminQaOutputSchema>;

export type AgentTaskRow = {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  campaign_id: string | null;
  lead_id: string | null;
  agent_name: AgentName;
  task_type: string;
  status: z.infer<typeof agentStatusSchema>;
  priority: number;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown> | null;
  error_message: string | null;
  retry_count: number;
};

export type AgentContext = {
  userId: string;
  campaignId?: string;
  leadId?: string;
  taskId?: string;
};
