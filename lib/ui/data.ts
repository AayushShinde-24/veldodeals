import "server-only";
import { getCurrentUser } from "@/lib/auth/server";
import { createServiceClient } from "@/lib/integrations/supabase";
import { isDemoMode, demoIntegrationStatus, demoOperationalData } from "@/lib/demo/mode";

export type UiSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function resolveUserId(searchParams: UiSearchParams): Promise<string> {
  const { isDemoMode, DEMO_USER_ID } = await import("@/lib/demo/mode");
  if (isDemoMode()) return DEMO_USER_ID;
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated. Please sign in.");
  const params = await searchParams;
  const override = typeof params.uid === "string" ? params.uid : null;
  return override ?? user.id;
}

export type CampaignRow = {
  id: string;
  name: string;
  status: string;
  created_at: string;
};

export type LeadRow = {
  id: string;
  email: string;
  company: string | null;
  stage: string;
  score: number | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export type EmailRow = {
  id: string;
  status: string;
  subject: string | null;
  approval_status: string | null;
  created_at: string;
  lead_id?: string | null;
  subject_1?: string | null;
  email_score?: number | null;
  body?: string | null;
  email_body?: string | null;
  personalization_reason?: string | null;
};

export type SendRow = {
  id: string;
  status: string;
  created_at: string;
};

export type ReplyRow = {
  id: string;
  classification: string | null;
  created_at: string;
  lead_id?: string | null;
  should_create_deal?: boolean | null;
  next_action?: string | null;
  reply_class?: string | null;
  sentiment?: string | null;
  body?: string | null;
  raw_reply?: string | null;
};

export type MeetingRow = {
  id: string;
  title: string | null;
  created_at: string;
};

export type DealRow = {
  id: string;
  stage: string;
  company: string | null;
  amount: number | null;
  title?: string | null;
  value?: number | null;
  probability?: number | null;
};

export type TaskRow = {
  id: string;
  agent_name: string | null;
  status: string;
  task_type: string | null;
  created_at: string;
  retry_count?: number | null;
  priority?: number | null;
  error_message?: string | null;
};

export type LearningRow = {
  campaign_id: string;
  summary: string;
  recommended_change: string | null;
};

export type LogRow = {
  id: string;
  agent_name: string | null;
  log_level: string | null;
  message: string;
  created_at: string;
};

export type ProfileRow = {
  id?: string;
  plan?: string | null;
  credits_balance?: number | null;
  workspace_name?: string | null;
  workspace_role?: string | null;
  email?: string | null;
  [key: string]: unknown;
};

export type LedgerRow = {
  id: string;
  credit_change: number;
  reason: string;
  new_balance: number;
  created_at: string;
};

export type GeneratedEmailRow = {
  id: string;
  lead_id: string | null;
  subject: string | null;
  status: string;
  approval_status?: string | null;
  personalization_reason?: string | null;
  subject_1?: string | null;
  email_score?: number | null;
  body?: string | null;
  email_body?: string | null;
};

export type ErrorLogRow = {
  id: string;
  source: string;
  error_code: string | null;
  error_message: string;
  created_at?: string;
};

export type CallTaskRow = {
  id: string;
  lead_id: string | null;
  status: string;
  consent_basis?: string | null;
  outcome?: string | null;
  created_at: string;
};

export type CrmSyncRow = {
  id: string;
  deal_id?: string | null;
  crm: string;
  action: string;
  notes?: string | null;
  created_at?: string;
};

export type ConnectedAccountRow = {
  id: string;
  provider: string;
  email: string | null;
  status: string;
  last_refresh_at?: string | null;
};

export type InvestorProfileRow = {
  id: string;
  name: string;
  firm: string | null;
  match_score: number | null;
  status: string;
};

export type FundraisingTaskRow = {
  id: string;
  status: string;
  needs_legal_review?: boolean | null;
  outreach_channel: string;
  pitch_angle?: string | null;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  action: string;
  created_at: string;
};

export type ComplianceRow = {
  compliance_confirmation?: boolean | null;
  [key: string]: unknown;
};

export type WorkspaceRow = {
  id?: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  company_size?: string | null;
  [key: string]: unknown;
};

export type OperationalData = {
  campaigns: CampaignRow[];
  leads: LeadRow[];
  canonicalEmails: EmailRow[];
  sends: SendRow[];
  canonicalReplies: ReplyRow[];
  replies: ReplyRow[];
  calendarEvents: MeetingRow[];
  deals: DealRow[];
  tasks: TaskRow[];
  learnings: LearningRow[];
  logs: LogRow[];
  profile: ProfileRow | null;
  usage: { id: string }[];
  ledger: LedgerRow[];
  generatedEmails: GeneratedEmailRow[];
  emailSends: SendRow[];
  unsubscribes: { id: string }[];
  errorLogs: ErrorLogRow[];
  mvpUsage: { id: string }[];
  callTasks: CallTaskRow[];
  crmSyncs: CrmSyncRow[];
  connectedAccounts: ConnectedAccountRow[];
  compliance: ComplianceRow | null;
  workspace: WorkspaceRow | null;
  investorProfiles: InvestorProfileRow[];
  fundraisingTasks: FundraisingTaskRow[];
  auditLogs: AuditLogRow[];
};

// ─────────────────────────────────────────────────────────
// Dashboard-specific data (richer than the shared operational set)
// ─────────────────────────────────────────────────────────

type DraftRow = {
  id: string;
  lead_id: string;
  subject: string | null;
  status: string;
  approval_status: string | null;
  personalization_reason: string | null;
};

type TaskDashRow = {
  id: string;
  agent_name: string | null;
  status: string;
  task_type: string | null;
  error_message: string | null;
  created_at: string;
};

type UserRow = { credits_balance: number | null };

export type DashboardData = {
  campaigns: CampaignRow[];
  leads: LeadRow[];
  sends: SendRow[];
  meetings: MeetingRow[];
  tasks: TaskDashRow[];
  drafts: DraftRow[];
  user: UserRow | null;
  generatedEmails: DraftRow[];
  emailSends: SendRow[];
  unsubscribes: { id: string }[];
  errorLogs: { id: string; source: string; error_code: string | null; error_message: string }[];
  mvpUsage: { id: string }[];
  error?: string;
};

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const { isDemoMode, demoDashboardData } = await import("@/lib/demo/mode");
  if (isDemoMode()) return demoDashboardData();

  const db = createServiceClient();

  try {
    const [campaigns, leads, sends, meetings, tasks, drafts, userRow, unsubscribes, errorLogs, mvpUsage] =
      await Promise.allSettled([
        db.from("campaigns").select("id,name,status,created_at").eq("user_id", userId).limit(50),
        db.from("leads").select("id,email,company,stage,score").eq("user_id", userId).limit(200),
        db.from("email_sends").select("id,status,created_at").eq("user_id", userId).limit(200),
        db.from("meetings").select("id,title,created_at").eq("user_id", userId).limit(50),
        db
          .from("agent_tasks")
          .select("id,agent_name,status,task_type,error_message,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        db
          .from("generated_emails")
          .select("id,lead_id,subject,status,approval_status,personalization_reason")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100),
        db.from("profiles").select("credits_balance").eq("id", userId).maybeSingle(),
        db.from("unsubscribes").select("id").eq("user_id", userId).limit(500),
        db
          .from("error_logs")
          .select("id,source,error_code,error_message")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        db.from("mvp_usage").select("id").eq("user_id", userId).limit(500),
      ]);

    function r<T>(result: PromiseSettledResult<{ data: T | null }>): T | null {
      return result.status === "fulfilled" ? result.value.data : null;
    }

    const draftData = (r<DraftRow[]>(drafts as PromiseSettledResult<{ data: DraftRow[] | null }>) ?? []);
    const sendData = (r<SendRow[]>(sends as PromiseSettledResult<{ data: SendRow[] | null }>) ?? []);

    return {
      campaigns: r<CampaignRow[]>(campaigns as PromiseSettledResult<{ data: CampaignRow[] | null }>) ?? [],
      leads: r<LeadRow[]>(leads as PromiseSettledResult<{ data: LeadRow[] | null }>) ?? [],
      sends: sendData,
      meetings: r<MeetingRow[]>(meetings as PromiseSettledResult<{ data: MeetingRow[] | null }>) ?? [],
      tasks: r<TaskDashRow[]>(tasks as PromiseSettledResult<{ data: TaskDashRow[] | null }>) ?? [],
      drafts: draftData,
      user: r<UserRow>(userRow as PromiseSettledResult<{ data: UserRow | null }>),
      generatedEmails: draftData,
      emailSends: sendData,
      unsubscribes: r<{ id: string }[]>(unsubscribes as PromiseSettledResult<{ data: { id: string }[] | null }>) ?? [],
      errorLogs: r<{ id: string; source: string; error_code: string | null; error_message: string }[]>(
        errorLogs as PromiseSettledResult<{ data: { id: string; source: string; error_code: string | null; error_message: string }[] | null }>
      ) ?? [],
      mvpUsage: r<{ id: string }[]>(mvpUsage as PromiseSettledResult<{ data: { id: string }[] | null }>) ?? [],
    };
  } catch (err) {
    return {
      campaigns: [],
      leads: [],
      sends: [],
      meetings: [],
      tasks: [],
      drafts: [],
      user: null,
      generatedEmails: [],
      emailSends: [],
      unsubscribes: [],
      errorLogs: [],
      mvpUsage: [],
      error: err instanceof Error ? err.message : "Failed to load dashboard data",
    };
  }
}

export interface CampaignDetail {
  id?: string;
  name?: string | null;
  goal?: string | null;
  status?: string | null;
  sending_mode?: string | null;
  product_name?: string | null;
  product_offer?: string | null;
  target_audience?: string | null;
  target_niche?: string | null;
  location?: string | null;
  workflow_progress?: number | null;
  leader_decision_json?: {
    current_stage?: string;
    next_agent?: string;
    confidence?: number | string;
    allowed_to_continue?: boolean;
  } | null;
  final_summary?: { summary?: string } | null;
  [key: string]: unknown;
}

export type CampaignLearnings = {
  summary?: string;
  best_performing_segment?: string | null;
  weakness?: string | null;
  recommended_change?: string | null;
} | null;

export type CampaignDraftRow = {
  id: string;
  lead_id: string;
  subject: string | null;
  subject_1: string | null;
  email_body: string | null;
  body: string | null;
  status: string;
  approval_status: string;
  safety_status: string | null;
  personalization_reason: string | null;
  cta: string | null;
  edited_subject: string | null;
  edited_body: string | null;
};

export type CampaignSendRow = {
  id: string;
  lead_id: string | null;
  generated_email_id: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  failure_reason: string | null;
};

export type CampaignViewData = {
  campaign: CampaignDetail | null;
  leads: { id: string; email: string; company: string | null; stage: string; score: number | null }[];
  drafts: CampaignDraftRow[];
  sendGates: { id: string; lead_id: string; eligible_to_send: boolean; decision: string; checks: unknown }[];
  research: { id: string; lead_id: string; summary: string | null; confidence: number | null }[];
  icpScores: { id: string; lead_id: string; score: number | null; fit_score: number | null; reasoning: string | null }[];
  signals: { id: string; lead_id: string; signal_type: string | null; content: string | null; best_signal: string | null }[];
  strategies: { id: string; lead_id: string; approach: string | null; angle: string | null }[];
  emailScores: { id: string; lead_id: string; score: number | null }[];
  verifications: { id: string; lead_id: string; status: string }[];
  decisions: { id: string; agent_name: string; decision: string; reasoning: string; created_at: string; confidence: number | string | null; needs_human_review: boolean; decision_json: unknown }[];
  tasks: TaskRow[];
  sends: SendRow[];
  emailSends: CampaignSendRow[];
  generatedEmails: CampaignDraftRow[];
  errors: { id: string; source: string; error_code: string | null; error_message: string; created_at: string }[];
  learnings: CampaignLearnings;
  logs: { id: string; message: string; created_at: string }[];
};

export async function getCampaignView(userId: string, campaignId: string): Promise<CampaignViewData> {
  const { isDemoMode, demoCampaignView } = await import("@/lib/demo/mode");
  if (isDemoMode()) return demoCampaignView();

  const db = createServiceClient();
  const [campaign, leads, drafts, gates, research, icp, signals, strategies, scores, verifs, decisions, tasks, sends, emailSends, errors, learnings, logs] =
    await Promise.allSettled([
      db.from("campaigns").select("*").eq("id", campaignId).eq("user_id", userId).maybeSingle(),
      db.from("leads").select("id,email,company,stage,score").eq("user_id", userId).eq("campaign_id", campaignId).limit(100),
      db.from("generated_emails").select("id,lead_id,subject,subject_1,email_body,body,status,approval_status,safety_status,personalization_reason,cta,edited_subject,edited_body").eq("user_id", userId).eq("campaign_id", campaignId).limit(200),
      db.from("send_gates").select("id,lead_id,eligible_to_send,decision,checks").eq("user_id", userId).eq("campaign_id", campaignId).limit(200),
      db.from("company_research").select("id,lead_id,summary,confidence").eq("user_id", userId).limit(100),
      db.from("icp_scores").select("id,lead_id,score,fit_score,reasoning").eq("user_id", userId).limit(100),
      db.from("signals").select("id,lead_id,signal_type,content,best_signal").eq("user_id", userId).limit(100),
      db.from("email_strategies").select("id,lead_id,approach,angle").eq("user_id", userId).limit(100),
      db.from("email_scores").select("id,lead_id,score").eq("user_id", userId).limit(100),
      db.from("email_verifications").select("id,lead_id,status").eq("user_id", userId).limit(100),
      db.from("agent_decisions").select("id,agent_name,decision,reasoning,created_at,confidence,needs_human_review,decision_json").eq("user_id", userId).limit(100),
      db.from("agent_tasks").select("id,agent_name,status,task_type,created_at,priority,retry_count,error_message").eq("user_id", userId).eq("campaign_id", campaignId).limit(50),
      db.from("email_sends").select("id,status,created_at").eq("user_id", userId).limit(200),
      db.from("email_sends").select("id,lead_id,generated_email_id,status,scheduled_at,sent_at,failure_reason").eq("user_id", userId).eq("campaign_id", campaignId).limit(200),
      db.from("error_logs").select("id,source,error_code,error_message,created_at").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: false }).limit(50),
      db.from("campaign_learnings").select("summary,best_performing_segment,weakness,recommended_change").eq("campaign_id", campaignId).maybeSingle(),
      db.from("agent_logs").select("id,message,created_at").eq("user_id", userId).limit(200),
    ]);

  function s<T>(r: PromiseSettledResult<{ data: T[] | null }>): T[] {
    return r.status === "fulfilled" ? (r.value.data ?? []) : [];
  }
  function sm<T>(r: PromiseSettledResult<{ data: T | null }>): T | null {
    return r.status === "fulfilled" ? r.value.data : null;
  }
  type Any = PromiseSettledResult<{ data: unknown }>;

  return {
    campaign: sm<CampaignDetail>(campaign as PromiseSettledResult<{ data: CampaignDetail | null }>),
    leads: s(leads as Any as PromiseSettledResult<{ data: CampaignViewData["leads"] | null }>),
    drafts: s(drafts as Any as PromiseSettledResult<{ data: CampaignViewData["drafts"] | null }>),
    sendGates: s(gates as Any as PromiseSettledResult<{ data: CampaignViewData["sendGates"] | null }>),
    research: s(research as Any as PromiseSettledResult<{ data: CampaignViewData["research"] | null }>),
    icpScores: s(icp as Any as PromiseSettledResult<{ data: CampaignViewData["icpScores"] | null }>),
    signals: s(signals as Any as PromiseSettledResult<{ data: CampaignViewData["signals"] | null }>),
    strategies: s(strategies as Any as PromiseSettledResult<{ data: CampaignViewData["strategies"] | null }>),
    emailScores: s(scores as Any as PromiseSettledResult<{ data: CampaignViewData["emailScores"] | null }>),
    verifications: s(verifs as Any as PromiseSettledResult<{ data: CampaignViewData["verifications"] | null }>),
    decisions: s(decisions as Any as PromiseSettledResult<{ data: CampaignViewData["decisions"] | null }>),
    tasks: s(tasks as PromiseSettledResult<{ data: TaskRow[] | null }>),
    sends: s(sends as PromiseSettledResult<{ data: SendRow[] | null }>),
    emailSends: s(emailSends as Any as PromiseSettledResult<{ data: CampaignViewData["emailSends"] | null }>),
    generatedEmails: s(drafts as Any as PromiseSettledResult<{ data: CampaignViewData["generatedEmails"] | null }>),
    errors: s(errors as Any as PromiseSettledResult<{ data: CampaignViewData["errors"] | null }>),
    learnings: sm<NonNullable<CampaignLearnings>>(learnings as PromiseSettledResult<{ data: NonNullable<CampaignLearnings> | null }>),
    logs: s(logs as Any as PromiseSettledResult<{ data: CampaignViewData["logs"] | null }>),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getListData(userId: string, resource?: string): Promise<any[]> {
  if (isDemoMode()) {
    const op = demoOperationalData();
    switch (resource) {
      case "campaigns": return op.campaigns;
      case "leads": case "lead-finder": case "leads/import": return op.leads;
      case "agents/tasks": case "tasks": case "admin/qa": return op.tasks;
      case "agents/logs": case "logs": return op.logs;
      default: return [];
    }
  }
  const db = createServiceClient();
  switch (resource) {
    case "campaigns":
      return (await db.from("campaigns").select("id,name,status,goal,created_at,leader_decision_json").eq("user_id", userId).limit(100)).data ?? [];
    case "leads":
      return (await db.from("leads").select("id,email,company,stage,score,created_at").eq("user_id", userId).limit(500)).data ?? [];
    case "agents/tasks":
    case "tasks":
      return (await db.from("agent_tasks").select("id,agent_name,status,task_type,error_message,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100)).data ?? [];
    case "agents/logs":
    case "logs":
      return (await db.from("agent_logs").select("id,agent_name,log_level,message,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200)).data ?? [];
    case "admin/qa":
      return (await db.from("agent_tasks").select("id,agent_name,status,task_type,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50)).data ?? [];
    case "lead-finder":
      return (await db.from("leads").select("id,email,company,title,stage,score,source,created_at").eq("user_id", userId).limit(200)).data ?? [];
    case "leads/import":
      return (await db.from("leads").select("id,email,company,title,stage,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100)).data ?? [];
    default:
      return [];
  }
}

export interface IntegrationStatus {
  label: string;
  key: string;
  configured: boolean;
  description: string;
  connectUrl?: string;
}

export function getIntegrationStatus(): IntegrationStatus[] {
  if (isDemoMode()) return demoIntegrationStatus();
  return [
    {
      label: "Gmail",
      key: "gmail",
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      description: "Send personalized emails and track opens, replies, and bounces via the Gmail API.",
      connectUrl: "/api/google/connect",
    },
    {
      label: "Apollo.io",
      key: "apollo",
      configured: !!process.env.APOLLO_API_KEY,
      description: "Pull verified B2B contact data — 275M+ people, role, company, LinkedIn, and phone.",
      connectUrl: "/settings/integrations",
    },
    {
      label: "Dodo Payments",
      key: "dodo",
      configured: !!process.env.DODO_PAYMENTS_API_KEY,
      description: "Manage subscription billing, credit top-ups, and plan upgrades.",
      connectUrl: "/settings/integrations",
    },
    {
      label: "Google Calendar",
      key: "calendar",
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      description: "Auto-book meetings from positive replies and track deal velocity.",
      connectUrl: "/api/google/connect",
    },
    {
      label: "Tavily (Research)",
      key: "tavily",
      configured: !!process.env.TAVILY_API_KEY,
      description: "Real-time web research to enrich company context and trigger timely outreach.",
      connectUrl: "/settings/integrations",
    },
    {
      label: "ZeroBounce",
      key: "zerobounce",
      configured: !!process.env.ZEROBOUNCE_API_KEY,
      description: "Verify email deliverability before sending to protect sender reputation.",
      connectUrl: "/settings/integrations",
    },
    {
      label: "Anthropic (AI)",
      key: "anthropic",
      configured: !!process.env.ANTHROPIC_API_KEY,
      description: "Power all 15 specialist agents — research, email writing, scoring, and ICP analysis.",
      connectUrl: "/settings/integrations",
    },
    {
      label: "Resend",
      key: "resend",
      configured: !!process.env.RESEND_API_KEY,
      description: "Send transactional notifications — approvals, alerts, team invites.",
      connectUrl: "/settings/integrations",
    },
  ];
}

export async function getOperationalData(userId: string): Promise<OperationalData> {
  const { isDemoMode, demoOperationalData } = await import("@/lib/demo/mode");
  if (isDemoMode()) return demoOperationalData();

  const db = createServiceClient();

  const [
    campaigns, leads, emails, sends, replies, meetings, deals, tasks, learnings, agentLogs,
    profile, usage, ledger, unsubscribes, errorLogs, mvpUsage, callTasks, crmSyncs,
    connectedAccounts, compliance, workspace, investorProfiles, fundraisingTasks, auditLogs,
  ] = await Promise.allSettled([
    db.from("campaigns").select("id,name,status,created_at").eq("user_id", userId).limit(100),
    db.from("leads").select("id,email,company,stage,score,full_name,first_name,last_name").eq("user_id", userId).limit(500),
    db.from("generated_emails").select("id,lead_id,status,subject,approval_status,personalization_reason,created_at").eq("user_id", userId).limit(200),
    db.from("email_sends").select("id,status,created_at").eq("user_id", userId).limit(200),
    db.from("email_replies").select("id,classification,reply_class,sentiment,next_action,should_create_deal,lead_id,body,raw_reply,created_at").eq("user_id", userId).limit(200),
    db.from("meetings").select("id,title,created_at").eq("user_id", userId).limit(100),
    db.from("crm_deals").select("id,stage,company,amount,title,value,probability").eq("user_id", userId).limit(100),
    db.from("agent_tasks").select("id,agent_name,status,task_type,created_at,retry_count,priority,error_message").eq("user_id", userId).limit(100),
    db.from("campaign_learnings").select("campaign_id,summary,recommended_change").eq("user_id", userId).limit(50),
    db.from("agent_logs").select("id,agent_name,log_level,message,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    db.from("profiles").select("id,plan,credits_balance,workspace_name,workspace_role,email").eq("id", userId).maybeSingle(),
    db.from("usage_events").select("id").eq("user_id", userId).limit(500),
    db.from("credit_ledger").select("id,credit_change,reason,new_balance,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    db.from("unsubscribes").select("id").eq("user_id", userId).limit(500),
    db.from("error_logs").select("id,source,error_code,error_message,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    db.from("mvp_usage").select("id").eq("user_id", userId).limit(500),
    db.from("call_tasks").select("id,lead_id,status,consent_basis,outcome,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    db.from("crm_syncs").select("id,deal_id,crm,action,notes,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    db.from("connected_accounts").select("id,provider,email,status,last_refresh_at").eq("user_id", userId).limit(20),
    db.from("compliance_settings").select("*").eq("user_id", userId).maybeSingle(),
    db.from("workspaces").select("id,name,website,industry,company_size").eq("owner_id", userId).maybeSingle(),
    db.from("investor_profiles").select("id,name,firm,match_score,status").eq("user_id", userId).limit(100),
    db.from("fundraising_tasks").select("id,status,needs_legal_review,outreach_channel,pitch_angle,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    db.from("audit_logs").select("id,action,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
  ]);

  function settled<T>(result: PromiseSettledResult<{ data: T[] | null }>): T[] {
    return result.status === "fulfilled" ? (result.value.data ?? []) : [];
  }
  function single<T>(result: PromiseSettledResult<{ data: T | null }>): T | null {
    return result.status === "fulfilled" ? result.value.data : null;
  }

  const emailData = settled<EmailRow>(emails as PromiseSettledResult<{ data: EmailRow[] | null }>);
  const replyData = settled<ReplyRow>(replies as PromiseSettledResult<{ data: ReplyRow[] | null }>);
  const sendData = settled<SendRow>(sends as PromiseSettledResult<{ data: SendRow[] | null }>);

  return {
    campaigns: settled<CampaignRow>(campaigns as PromiseSettledResult<{ data: CampaignRow[] | null }>),
    leads: settled<LeadRow>(leads as PromiseSettledResult<{ data: LeadRow[] | null }>),
    canonicalEmails: emailData,
    sends: sendData,
    canonicalReplies: replyData,
    replies: replyData,
    calendarEvents: settled<MeetingRow>(meetings as PromiseSettledResult<{ data: MeetingRow[] | null }>),
    deals: settled<DealRow>(deals as PromiseSettledResult<{ data: DealRow[] | null }>),
    tasks: settled<TaskRow>(tasks as PromiseSettledResult<{ data: TaskRow[] | null }>),
    learnings: settled<LearningRow>(learnings as PromiseSettledResult<{ data: LearningRow[] | null }>),
    logs: settled<LogRow>(agentLogs as PromiseSettledResult<{ data: LogRow[] | null }>),
    profile: single<ProfileRow>(profile as PromiseSettledResult<{ data: ProfileRow | null }>),
    usage: settled<{ id: string }>(usage as PromiseSettledResult<{ data: { id: string }[] | null }>),
    ledger: settled<LedgerRow>(ledger as PromiseSettledResult<{ data: LedgerRow[] | null }>),
    generatedEmails: settled<GeneratedEmailRow>(emails as PromiseSettledResult<{ data: GeneratedEmailRow[] | null }>),
    emailSends: sendData,
    unsubscribes: settled<{ id: string }>(unsubscribes as PromiseSettledResult<{ data: { id: string }[] | null }>),
    errorLogs: settled<ErrorLogRow>(errorLogs as PromiseSettledResult<{ data: ErrorLogRow[] | null }>),
    mvpUsage: settled<{ id: string }>(mvpUsage as PromiseSettledResult<{ data: { id: string }[] | null }>),
    callTasks: settled<CallTaskRow>(callTasks as PromiseSettledResult<{ data: CallTaskRow[] | null }>),
    crmSyncs: settled<CrmSyncRow>(crmSyncs as PromiseSettledResult<{ data: CrmSyncRow[] | null }>),
    connectedAccounts: settled<ConnectedAccountRow>(connectedAccounts as PromiseSettledResult<{ data: ConnectedAccountRow[] | null }>),
    compliance: single<ComplianceRow>(compliance as PromiseSettledResult<{ data: ComplianceRow | null }>),
    workspace: single<WorkspaceRow>(workspace as PromiseSettledResult<{ data: WorkspaceRow | null }>),
    investorProfiles: settled<InvestorProfileRow>(investorProfiles as PromiseSettledResult<{ data: InvestorProfileRow[] | null }>),
    fundraisingTasks: settled<FundraisingTaskRow>(fundraisingTasks as PromiseSettledResult<{ data: FundraisingTaskRow[] | null }>),
    auditLogs: settled<AuditLogRow>(auditLogs as PromiseSettledResult<{ data: AuditLogRow[] | null }>),
  };
}

export { getWorkspaceContext } from "@/src/lib/workspace/context";
