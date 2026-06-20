import type {
  OperationalData,
  DashboardData,
  CampaignViewData,
  IntegrationStatus,
} from "@/lib/ui/data";

// ─────────────────────────────────────────────────────────
// Demo mode. When no Supabase DB is configured (e.g. browsing locally), Veldo runs in
// a fully self-contained demo: an auto-signed-in demo user + rich mock data so the
// entire UI renders, populated and interactive, without any backend. Clearly fake data.
// ─────────────────────────────────────────────────────────

export const DEMO_USER_ID = "demo-user-0001";

export function isDemoMode(): boolean {
  if (process.env.VELDO_FORCE_DEMO === "1") return true;
  if (process.env.VELDO_DISABLE_DEMO === "1") return false;
  return !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function demoUser() {
  return {
    id: DEMO_USER_ID,
    email: "founder@acme.demo",
    user_metadata: { full_name: "Demo Founder", company_name: "Acme Growth Co" },
    app_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };
}

export function demoProfile() {
  return {
    id: DEMO_USER_ID,
    email: "founder@acme.demo",
    full_name: "Demo Founder",
    company_name: "Acme Growth Co",
    workspace_name: "Acme Growth Co",
    workspace_id: "demo-workspace",
    plan: "team",
    credits: 18420,
    avatar_url: null,
  };
}

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

const CAMPAIGNS = [
  { id: "cmp-1", name: "Q3 Mid-Market RevOps", status: "running", created_at: iso(12) },
  { id: "cmp-2", name: "Series-B SaaS Founders", status: "running", created_at: iso(8) },
  { id: "cmp-3", name: "Fintech Heads of Growth", status: "ready_to_send", created_at: iso(4) },
  { id: "cmp-4", name: "Devtools Champions", status: "draft", created_at: iso(1) },
];

const LEADS = [
  { id: "ld-1", email: "jordan@northwind.io", company: "Northwind", stage: "personalized", score: 88, full_name: "Jordan Lee", first_name: "Jordan", last_name: "Lee" },
  { id: "ld-2", email: "sam@globex.com", company: "Globex", stage: "verified", score: 76, full_name: "Sam Rivera", first_name: "Sam", last_name: "Rivera" },
  { id: "ld-3", email: "priya@initech.dev", company: "Initech", stage: "approved", score: 91, full_name: "Priya Nair", first_name: "Priya", last_name: "Nair" },
  { id: "ld-4", email: "chris@umbrella.co", company: "Umbrella", stage: "replied", score: 84, full_name: "Chris Okafor", first_name: "Chris", last_name: "Okafor" },
  { id: "ld-5", email: "mia@hooli.com", company: "Hooli", stage: "new", score: 63, full_name: "Mia Chen", first_name: "Mia", last_name: "Chen" },
];

export function demoOperationalData(): OperationalData {
  return {
    campaigns: CAMPAIGNS,
    leads: LEADS,
    canonicalEmails: [
      { id: "em-1", status: "sent", subject: "Quick idea for Northwind's pipeline", approval_status: "approved", created_at: iso(3), lead_id: "ld-1" },
      { id: "em-2", status: "generated", subject: "Globex + Acme", approval_status: "pending", created_at: iso(1), lead_id: "ld-2" },
    ],
    sends: [
      { id: "sd-1", status: "sent", created_at: iso(3) },
      { id: "sd-2", status: "sent", created_at: iso(2) },
      { id: "sd-3", status: "opened", created_at: iso(2) },
      { id: "sd-4", status: "replied", created_at: iso(1) },
    ],
    canonicalReplies: [
      { id: "rp-1", classification: "positive", created_at: iso(1), lead_id: "ld-4", reply_class: "positive", sentiment: "positive", next_action: "Book a meeting", body: "This looks interesting — can we chat Thursday?" },
    ],
    replies: [
      { id: "rp-1", classification: "positive", created_at: iso(1), lead_id: "ld-4", reply_class: "positive", sentiment: "positive", next_action: "Book a meeting", body: "This looks interesting — can we chat Thursday?", should_create_deal: true },
    ],
    calendarEvents: [{ id: "mt-1", title: "Umbrella × Acme intro", created_at: iso(1) }],
    deals: [
      { id: "dl-1", stage: "won", company: "Umbrella", amount: 24000, title: "Umbrella — Acme Pipeline", value: 24000, probability: 100 },
      { id: "dl-2", stage: "negotiation", company: "Globex", amount: 18000, title: "Globex expansion", value: 18000, probability: 60 },
    ],
    tasks: [
      { id: "tk-1", agent_name: "company_research", status: "completed", task_type: "research", created_at: iso(2), retry_count: 0 },
      { id: "tk-2", agent_name: "email_writer", status: "running", task_type: "write_emails", created_at: iso(0), retry_count: 0 },
      { id: "tk-3", agent_name: "email_verification", status: "needs_review", task_type: "verify", created_at: iso(1), retry_count: 1, error_message: "Low confidence on 2 addresses" },
    ],
    learnings: [{ campaign_id: "cmp-1", summary: "Subject lines under 4 words lifted reply rate 22%.", recommended_change: "Shorten subjects." }],
    logs: [
      { id: "lg-1", agent_name: "campaign_leader", log_level: "info", message: "Routed 5 leads to research.", created_at: iso(0) },
      { id: "lg-2", agent_name: "email_writer", log_level: "info", message: "Drafted 3 personalized emails.", created_at: iso(0) },
      { id: "lg-3", agent_name: "send_gate", log_level: "warn", message: "1 draft held: email score 71 < 75.", created_at: iso(0) },
    ],
    profile: { id: DEMO_USER_ID, plan: "team", credits_balance: 18420, workspace_name: "Acme Growth Co", workspace_role: "owner", email: "founder@acme.demo" },
    usage: Array.from({ length: 42 }, (_, i) => ({ id: `u-${i}` })),
    ledger: [
      { id: "le-1", credit_change: -3, reason: "email_write", new_balance: 18420, created_at: iso(0) },
      { id: "le-2", credit_change: -1, reason: "email_send", new_balance: 18423, created_at: iso(0) },
      { id: "le-3", credit_change: 25000, reason: "monthly_grant", new_balance: 18424, created_at: iso(6) },
    ],
    generatedEmails: [
      { id: "ge-1", lead_id: "ld-1", subject: "Quick idea for Northwind's pipeline", status: "sent", approval_status: "approved", personalization_reason: "Cited their Series B + RevOps hire" },
      { id: "ge-2", lead_id: "ld-2", subject: "Globex + Acme", status: "generated", approval_status: "pending", personalization_reason: "Mentioned recent product launch" },
    ],
    emailSends: [
      { id: "sd-1", status: "sent", created_at: iso(3) },
      { id: "sd-2", status: "sent", created_at: iso(2) },
      { id: "sd-4", status: "replied", created_at: iso(1) },
    ],
    unsubscribes: [{ id: "un-1" }],
    errorLogs: [{ id: "er-1", source: "email_verification", error_code: "low_conf", error_message: "2 addresses flagged for manual review", created_at: iso(1) }],
    mvpUsage: Array.from({ length: 18 }, (_, i) => ({ id: `mu-${i}` })),
    callTasks: [
      { id: "ct-1", lead_id: "ld-3", status: "queued", consent_basis: "existing_business_relationship", outcome: null, created_at: iso(0) },
      { id: "ct-2", lead_id: "ld-1", status: "needs_review", consent_basis: "manual_review_required", outcome: null, created_at: iso(1) },
    ],
    crmSyncs: [{ id: "cs-1", deal_id: "dl-1", crm: "hubspot", action: "synced", notes: "Deal pushed to HubSpot", created_at: iso(1) }],
    connectedAccounts: [{ id: "ca-1", provider: "gmail", email: "founder@acme.demo", status: "connected", last_refresh_at: iso(0) }],
    compliance: { compliance_confirmation: true },
    workspace: { id: "demo-workspace", name: "Acme Growth Co", website: "https://acme.demo", industry: "B2B SaaS", company_size: "11-50" },
    investorProfiles: [
      { id: "iv-1", name: "AI Frontier Fund", firm: "AI Frontier Fund", match_score: 86, status: "matched" },
      { id: "iv-2", name: "Atlantic Growth", firm: "Atlantic Growth", match_score: 64, status: "contacted" },
    ],
    fundraisingTasks: [{ id: "ft-1", status: "draft", needs_legal_review: false, outreach_channel: "email", pitch_angle: "Applied AI for revenue teams", created_at: iso(1) }],
    auditLogs: [
      { id: "al-1", action: "mailbox.connected", created_at: iso(5) },
      { id: "al-2", action: "campaign.started", created_at: iso(4) },
    ],
  };
}

export function demoDashboardData(): DashboardData {
  const op = demoOperationalData();
  return {
    campaigns: op.campaigns,
    leads: op.leads,
    sends: op.sends,
    meetings: op.calendarEvents,
    tasks: [
      { id: "tk-3", agent_name: "email_verification", status: "needs_review", task_type: "verify", error_message: "Low confidence on 2 addresses", created_at: iso(1) },
    ],
    drafts: op.generatedEmails.map((g) => ({ id: g.id, lead_id: g.lead_id ?? "", subject: g.subject, status: g.status, approval_status: g.approval_status ?? null, personalization_reason: g.personalization_reason ?? null })),
    user: { credits_balance: 18420 },
    generatedEmails: op.generatedEmails.map((g) => ({ id: g.id, lead_id: g.lead_id ?? "", subject: g.subject, status: g.status, approval_status: g.approval_status ?? null, personalization_reason: g.personalization_reason ?? null })),
    emailSends: op.emailSends,
    unsubscribes: op.unsubscribes,
    errorLogs: op.errorLogs.map((e) => ({ id: e.id, source: e.source, error_code: e.error_code, error_message: e.error_message })),
    mvpUsage: op.mvpUsage,
  };
}

export function demoCampaignView(): CampaignViewData {
  return {
    campaign: { id: "cmp-1", name: "Q3 Mid-Market RevOps", goal: "Book 20 demos with RevOps leaders", status: "running", sending_mode: "approval_required", product_offer: "Acme Pipeline", target_audience: "RevOps leaders", target_niche: "mid-market SaaS", location: "United States", workflow_progress: 64, leader_decision_json: { current_stage: "email_writing", next_agent: "email_scoring", confidence: 0.82, allowed_to_continue: true }, final_summary: { summary: "On track; reply rate trending above target." } },
    leads: LEADS.map((l) => ({ id: l.id, email: l.email, company: l.company, stage: l.stage, score: l.score })),
    drafts: [{ id: "ge-1", lead_id: "ld-1", subject: "Quick idea for Northwind's pipeline", subject_1: "Quick idea for Northwind's pipeline", email_body: "Hi Jordan — saw Northwind just raised a Series B and is hiring RevOps...", body: "Hi Jordan — saw Northwind just raised a Series B...", status: "approved", approval_status: "approved", safety_status: "checked", personalization_reason: "Cited Series B + RevOps hire", cta: "Open to a quick chat?", edited_subject: null, edited_body: null }],
    sendGates: [{ id: "sg-1", lead_id: "ld-1", eligible_to_send: true, decision: "approved", checks: [{ gate: "icp_fit_score", passed: true }, { gate: "email_score", passed: true }] }],
    research: [{ id: "cr-1", lead_id: "ld-1", summary: "Northwind raised a $30M Series B; hiring 4 RevOps roles; expanding to EU.", confidence: 82 }],
    icpScores: [{ id: "ic-1", lead_id: "ld-1", score: 88, fit_score: 88, reasoning: "VP RevOps at exactly-fit mid-market SaaS." }],
    signals: [{ id: "si-1", lead_id: "ld-1", signal_type: "funding", content: "Series B announced", best_signal: "Series B 2 weeks ago" }],
    strategies: [{ id: "st-1", lead_id: "ld-1", approach: "Lead with their RevOps scaling pain", angle: "RevOps scaling" }],
    emailScores: [{ id: "es-1", lead_id: "ld-1", score: 89 }],
    verifications: [{ id: "ve-1", lead_id: "ld-1", status: "valid" }],
    decisions: [{ id: "de-1", agent_name: "campaign_leader", decision: "route_to_writer", reasoning: "Research confidence above threshold.", created_at: iso(0), confidence: 0.82, needs_human_review: false, decision_json: { reason: "Confidence high" } }],
    tasks: [{ id: "tk-1", agent_name: "company_research", status: "completed", task_type: "research", created_at: iso(2), priority: 1, retry_count: 0, error_message: null }],
    sends: [{ id: "sd-1", status: "sent", created_at: iso(3) }],
    emailSends: [{ id: "sd-1", lead_id: "ld-1", generated_email_id: "ge-1", status: "sent", scheduled_at: null, sent_at: iso(3), failure_reason: null }],
    generatedEmails: [{ id: "ge-1", lead_id: "ld-1", subject: "Quick idea for Northwind's pipeline", subject_1: "Quick idea for Northwind's pipeline", email_body: "Hi Jordan...", body: "Hi Jordan...", status: "approved", approval_status: "approved", safety_status: "checked", personalization_reason: "Cited Series B", cta: "Quick chat?", edited_subject: null, edited_body: null }],
    errors: [],
    learnings: { summary: "Subject lines under 4 words lifted reply rate 22%.", best_performing_segment: "Series-B SaaS", weakness: "Fintench replies lag", recommended_change: "Shorten subjects." },
    logs: [{ id: "lg-1", message: "Routed 5 leads to research.", created_at: iso(0) }],
  };
}

export function demoIntegrationStatus(): IntegrationStatus[] {
  return [
    { label: "Gmail", key: "gmail", configured: true, description: "Send + track via Gmail.", connectUrl: "/api/google/connect" },
    { label: "Apollo.io", key: "apollo", configured: true, description: "Verified B2B contact data.", connectUrl: "/settings/integrations" },
    { label: "Stripe", key: "stripe", configured: true, description: "Subscriptions + credit top-ups.", connectUrl: "/settings/integrations" },
    { label: "Anthropic", key: "anthropic", configured: true, description: "Powers every agent.", connectUrl: "/settings/integrations" },
    { label: "Tavily", key: "tavily", configured: true, description: "Real-time account research.", connectUrl: "/settings/integrations" },
    { label: "ZeroBounce", key: "zerobounce", configured: false, description: "Email verification.", connectUrl: "/settings/integrations" },
  ];
}
