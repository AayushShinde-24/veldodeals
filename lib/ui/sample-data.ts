export const sampleCampaigns = [
  {
    id: "sample-enterprise-ai",
    name: "Enterprise AI pipeline",
    goal: "Book qualified demos with revenue leaders adopting AI workflows.",
    status: "running",
    leader_decision_json: {
      next_agent: "personalization_strategy",
      current_stage: "build_personalization_strategy",
      confidence: 87,
      reason: "Signals and ICP fit are strong enough to draft messaging.",
      allowed_to_continue: true,
    },
  },
  {
    id: "sample-devtools-founders",
    name: "Devtools founder motion",
    goal: "Reach founders with stalled outbound reply rates.",
    status: "needs_review",
    leader_decision_json: {
      next_agent: "campaign_leader",
      current_stage: "human_review",
      confidence: 64,
      reason: "Personalization signal needs human approval.",
      allowed_to_continue: false,
    },
  },
  {
    id: "sample-agency-partners",
    name: "Agency partner expansion",
    goal: "Find agencies that can resell Veldo workflows.",
    status: "paused",
    leader_decision_json: {
      next_agent: "company_research",
      current_stage: "research_company",
      confidence: 72,
      reason: "Paused until target niche is narrowed.",
      allowed_to_continue: false,
    },
  },
];

export const sampleLeads = [
  { id: "lead-1", first_name: "Maya", last_name: "Chen", email: "maya@northstar.ai", title: "VP Revenue", company: "Northstar AI", stage: "personalized", rejection_reason: null },
  { id: "lead-2", first_name: "Elliot", last_name: "Rao", email: "elliot@stacklane.io", title: "Founder", company: "Stacklane", stage: "verified", rejection_reason: null },
  { id: "lead-3", first_name: "Nora", last_name: "Wells", email: "nora@revgrid.co", title: "Head of Growth", company: "Revgrid", stage: "needs_review", rejection_reason: "Weak public signal." },
  { id: "lead-4", first_name: "Ari", last_name: "Patel", email: "ari@signalops.com", title: "Sales Ops", company: "SignalOps", stage: "sent", rejection_reason: null },
];

export const sampleTasks = [
  { id: "task-1", agent_name: "campaign_leader", task_type: "route_next_stage", status: "running", retry_count: 0, error_message: null, lead_id: null },
  { id: "task-2", agent_name: "company_research", task_type: "research_company", status: "completed", retry_count: 0, error_message: null, lead_id: "lead-1" },
  { id: "task-3", agent_name: "personalization_strategy", task_type: "build_personalization", status: "needs_review", retry_count: 0, error_message: "Signal strength below approval threshold.", lead_id: "lead-3" },
  { id: "task-4", agent_name: "email_quality_scoring", task_type: "score_email", status: "queued", retry_count: 0, error_message: null, lead_id: "lead-2" },
];

export const sampleDrafts = [
  { id: "draft-1", lead_id: "lead-1", subject_1: "AI workflow audit for Northstar", email_body: "Noticed Northstar is hiring for revenue systems roles...", approval_status: "needs_review", word_count: 118 },
  { id: "draft-2", lead_id: "lead-2", subject_1: "Stacklane outbound bottlenecks", email_body: "Stacklane's developer motion looks strong...", approval_status: "approved", word_count: 103 },
];

export const sampleLogs = [
  { id: "log-1", agent_name: "campaign_leader", level: "info", message: "Leader routed Maya Chen to personalization strategy.", created_at: new Date().toISOString() },
  { id: "log-2", agent_name: "email_quality_scoring", level: "warn", message: "Draft held for review because the CTA was too broad.", created_at: new Date().toISOString() },
  { id: "log-3", agent_name: "billing_credits", level: "info", message: "Credits checked before approved send.", created_at: new Date().toISOString() },
];

export const agentCards = [
  ["Campaign Leader", "Routes every task, checks confidence, pauses unsafe sends.", "active", 92],
  ["Lead Research", "Finds and enriches ICP-matched companies and contacts.", "active", 84],
  ["Personalization", "Turns verified signals into safe outreach angles.", "active", 88],
  ["Campaign Strategy", "Builds sequences, timing, and A/B testing plans.", "idle", 77],
  ["Inbox Reply", "Classifies replies and recommends next actions.", "active", 81],
  ["CRM Deal", "Moves interested replies into pipeline stages.", "idle", 73],
  ["Analytics", "Finds performance patterns and learning loops.", "active", 86],
  ["Finance", "Tracks credits, cost, and pricing health.", "idle", 79],
  ["Product Improvement", "Finds UX bottlenecks from product signals.", "idle", 71],
  ["Support", "Guides setup and escalates high priority issues.", "active", 83],
] as const;

export const revenueBars = [42, 58, 49, 71, 88, 76, 93, 84];
