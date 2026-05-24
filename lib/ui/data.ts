import "server-only";

import { getCurrentProfile, getCurrentUser, type AuthProfile } from "@/lib/auth/server";
import { createServiceClient } from "@/lib/integrations/supabase";
import { hasSecret, type Env } from "@/lib/security/env";

export type UiSearchParams = Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
export type UiLoadState = {
  userId?: string;
  profile: AuthProfile | null;
  error: string | null;
};

export async function resolveUserId(searchParams?: UiSearchParams) {
  const params = await searchParams;
  const value = params?.user_id;
  const explicit = Array.isArray(value) ? value[0] : value;
  if (explicit && process.env.VELDO_ALLOW_UNAUTH_USER_ID === "true") return explicit;
  const user = await getCurrentUser();
  return user?.id;
}

export async function getDashboardData(userId?: string) {
  const profile = await getProfileForUser(userId);
  if (!userId) return emptyDashboard("Sign in to load your Veldo workspace.");
  try {
    const db = createServiceClient();
    const [campaigns, leads, tasks, drafts, sends, replies, logs, decisions, user, deals, meetings] = await Promise.all([
      db.from("campaigns").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
      db.from("leads").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      db.from("agent_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      db.from("personalized_emails").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      db.from("email_send_events").select("*").eq("user_id", userId),
      db.from("reply_events").select("*").eq("user_id", userId),
      db.from("agent_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      db.from("agent_decisions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      db.from("users").select("*").eq("id", userId).maybeSingle(),
      profile?.workspace_id ? db.from("crm_deals").select("*").eq("workspace_id", profile.workspace_id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
      profile?.workspace_id ? db.from("calendar_events").select("*").eq("workspace_id", profile.workspace_id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
    ]);

    return {
      userId,
      campaigns: campaigns.data ?? [],
      leads: leads.data ?? [],
      tasks: tasks.data ?? [],
      drafts: drafts.data ?? [],
      sends: sends.data ?? [],
      replies: replies.data ?? [],
      logs: logs.data ?? [],
      decisions: decisions.data ?? [],
      deals: deals.data ?? [],
      meetings: meetings.data ?? [],
      user: user.data ?? profile,
      profile: (user.data as AuthProfile | null) ?? profile,
      error: firstError([campaigns, leads, tasks, drafts, sends, replies, logs, decisions, user, deals, meetings]),
    };
  } catch (error) {
    return emptyDashboard(error instanceof Error ? error.message : "Dashboard data could not be loaded.");
  }
}

export async function getListData(userId: string | undefined, table: string, campaignId?: string) {
  if (!userId) return [];
  try {
    let query = createServiceClient().from(table).select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (campaignId) query = query.eq("campaign_id", campaignId);
    const { data } = await query.limit(200);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getCampaignView(userId: string | undefined, campaignId: string) {
  if (!userId) return null;
  try {
    const db = createServiceClient();
    const [campaign, leads, tasks, drafts, logs, decisions, learnings] = await Promise.all([
      db.from("campaigns").select("*").eq("user_id", userId).eq("id", campaignId).maybeSingle(),
      db.from("leads").select("*").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: false }),
      db.from("agent_tasks").select("*").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: false }),
      db.from("personalized_emails").select("*").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: false }),
      db.from("agent_logs").select("*").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: false }).limit(100),
      db.from("agent_decisions").select("*").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: false }).limit(100),
      db.from("campaign_learnings").select("*").eq("user_id", userId).eq("campaign_id", campaignId).maybeSingle(),
    ]);
    const [generatedEmails, emailSends, errors, research, signals, icpScores, personalization, strategies, emailScores, verifications, sendGates] = await Promise.all([
      db.from("generated_emails").select("*").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: false }),
      db.from("email_sends").select("*").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: false }),
      db.from("error_logs").select("*").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: false }).limit(50),
      db.from("company_research").select("*").eq("user_id", userId).eq("campaign_id", campaignId),
      db.from("public_signals").select("*").eq("user_id", userId).eq("campaign_id", campaignId),
      db.from("icp_scores").select("*").eq("user_id", userId).eq("campaign_id", campaignId),
      db.from("personalization_strategies").select("*").eq("user_id", userId).eq("campaign_id", campaignId),
      db.from("email_strategies").select("*").eq("user_id", userId).eq("campaign_id", campaignId),
      db.from("email_scores").select("*").eq("user_id", userId).eq("campaign_id", campaignId),
      db.from("email_verifications").select("*").eq("user_id", userId).eq("campaign_id", campaignId),
      db.from("send_gate_results").select("*").eq("user_id", userId).eq("campaign_id", campaignId),
    ]);
    return {
      campaign: campaign.data,
      leads: leads.data ?? [],
      tasks: tasks.data ?? [],
      drafts: drafts.data ?? [],
      generatedEmails: generatedEmails.data ?? [],
      emailSends: emailSends.data ?? [],
      errors: errors.data ?? [],
      logs: logs.data ?? [],
      decisions: decisions.data ?? [],
      research: research.data ?? [],
      signals: signals.data ?? [],
      icpScores: icpScores.data ?? [],
      personalization: personalization.data ?? [],
      strategies: strategies.data ?? [],
      emailScores: emailScores.data ?? [],
      verifications: verifications.data ?? [],
      sendGates: sendGates.data ?? [],
      learnings: learnings.data,
    };
  } catch {
    return null;
  }
}

export async function getWorkspaceContext(userId?: string): Promise<UiLoadState> {
  return {
    userId,
    profile: await getProfileForUser(userId),
    error: userId ? null : "Sign in to load this workspace.",
  };
}

export async function getOperationalData(userId?: string) {
  if (!userId) {
    return {
      userId,
      profile: null,
      campaigns: [],
      leads: [],
      replies: [],
      canonicalReplies: [],
      canonicalEmails: [],
      generatedEmails: [],
      emailSends: [],
      unsubscribes: [],
      errorLogs: [],
      callTasks: [],
      investorProfiles: [],
      fundraisingTasks: [],
      compliance: null,
      mvpUsage: [],
      crmSyncs: [],
      sends: [],
      tasks: [],
      logs: [],
      decisions: [],
      subscriptions: [],
      payments: [],
      ledger: [],
      usage: [],
      learnings: [],
      deals: [],
      connectedAccounts: [],
      calendarEvents: [],
      auditLogs: [],
      workspace: null,
      settings: null,
      error: "Sign in to load operational data.",
    };
  }

  try {
    const db = createServiceClient();
    const profile = await getProfileForUser(userId);
    const workspaceId = profile?.workspace_id;
    const [campaigns, leads, replies, crmSyncs, sends, tasks, logs, decisions, subscriptions, payments, ledger, usage, learnings, deals, connectedAccounts, calendarEvents, auditLogs, workspace, settings, canonicalReplies, canonicalEmails, generatedEmails, emailSends, unsubscribes, errorLogs, callTasks, investorProfiles, fundraisingTasks, compliance, mvpUsage] = await Promise.all([
      db.from("campaigns").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
      db.from("leads").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
      db.from("reply_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
      db.from("crm_sync_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
      db.from("email_send_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
      db.from("agent_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
      db.from("agent_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
      db.from("agent_decisions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
      db.from("subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      db.from("payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      db.from("credits_ledger").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      db.from("usage_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
      db.from("campaign_learnings").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      workspaceId ? db.from("crm_deals").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null }),
      workspaceId ? db.from("connected_accounts").select("id,workspace_id,provider,email,status,scope,expires_at,last_refresh_at,last_error,metadata,created_at,updated_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
      workspaceId ? db.from("calendar_events").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
      workspaceId ? db.from("audit_logs").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
      workspaceId ? db.from("workspaces").select("*").eq("id", workspaceId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      workspaceId ? db.from("settings").select("*").eq("workspace_id", workspaceId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      workspaceId ? db.from("replies").select("*").eq("workspace_id", workspaceId).order("received_at", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null }),
      workspaceId ? db.from("emails").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [], error: null }),
      db.from("generated_emails").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
      db.from("email_sends").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
      db.from("unsubscribes").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
      db.from("error_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      db.from("call_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
      db.from("investor_profiles").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
      db.from("fundraising_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
      db.from("user_compliance").select("*").eq("user_id", userId).maybeSingle(),
      db.from("usage").select("*").eq("user_id", userId).order("usage_date", { ascending: false }).limit(40),
    ]);

    const legacyError = firstError([campaigns, leads, replies, crmSyncs, sends, tasks, logs, decisions, subscriptions, payments, ledger, usage, learnings]);
    const workspaceError = workspaceId ? firstError([deals, connectedAccounts, calendarEvents, auditLogs, workspace, settings, canonicalReplies, canonicalEmails]) : null;

    return {
      userId,
      profile,
      campaigns: campaigns.data ?? [],
      leads: leads.data ?? [],
      replies: replies.data ?? [],
      canonicalReplies: canonicalReplies.data ?? [],
      canonicalEmails: canonicalEmails.data ?? [],
      generatedEmails: generatedEmails.data ?? [],
      emailSends: emailSends.data ?? [],
      unsubscribes: unsubscribes.data ?? [],
      errorLogs: errorLogs.data ?? [],
      callTasks: callTasks.data ?? [],
      investorProfiles: investorProfiles.data ?? [],
      fundraisingTasks: fundraisingTasks.data ?? [],
      compliance: compliance.data ?? null,
      mvpUsage: mvpUsage.data ?? [],
      crmSyncs: crmSyncs.data ?? [],
      sends: sends.data ?? [],
      tasks: tasks.data ?? [],
      logs: logs.data ?? [],
      decisions: decisions.data ?? [],
      subscriptions: subscriptions.data ?? [],
      payments: payments.data ?? [],
      ledger: ledger.data ?? [],
      usage: usage.data ?? [],
      learnings: learnings.data ?? [],
      deals: deals.data ?? [],
      connectedAccounts: connectedAccounts.data ?? [],
      calendarEvents: calendarEvents.data ?? [],
      auditLogs: auditLogs.data ?? [],
      workspace: workspace.data ?? null,
      settings: settings.data ?? null,
      error: legacyError ?? workspaceError,
    };
  } catch (error) {
    return {
      userId,
      profile: await getProfileForUser(userId),
      campaigns: [],
      leads: [],
      replies: [],
      canonicalReplies: [],
      canonicalEmails: [],
      generatedEmails: [],
      emailSends: [],
      unsubscribes: [],
      errorLogs: [],
      callTasks: [],
      investorProfiles: [],
      fundraisingTasks: [],
      compliance: null,
      mvpUsage: [],
      crmSyncs: [],
      sends: [],
      tasks: [],
      logs: [],
      decisions: [],
      subscriptions: [],
      payments: [],
      ledger: [],
      usage: [],
      learnings: [],
      deals: [],
      connectedAccounts: [],
      calendarEvents: [],
      auditLogs: [],
      workspace: null,
      settings: null,
      error: error instanceof Error ? error.message : "Operational data could not be loaded.",
    };
  }
}

export function getIntegrationStatus() {
  const keys: Array<{ label: string; env: keyof Env; description: string }> = [
    { label: "Workspace data", env: "SUPABASE_SERVICE_ROLE_KEY", description: "Database, auth, and secure server access." },
    { label: "AI routing", env: "OPENAI_API_KEY", description: "Control layer for structured routing, scoring, and validation." },
    { label: "AI writing", env: "ANTHROPIC_API_KEY", description: "Premium reasoning and email-writing layer." },
    { label: "Lead search", env: "APOLLO_API_KEY", description: "Lead discovery and enrichment source." },
    { label: "Data enrichment", env: "CLAY_API_KEY", description: "Optional enrichment layer for company and contact intelligence." },
    { label: "Web research", env: "TAVILY_API_KEY", description: "Web research for public business signals." },
    { label: "Page extraction", env: "FIRECRAWL_API_KEY", description: "Official-page extraction for company research." },
    { label: "Email verification", env: "ZEROBOUNCE_API_KEY", description: "Email verification before send eligibility." },
    { label: "Mailbox", env: "GOOGLE_CLIENT_ID", description: "Primary user-account sending and reply sync through OAuth." },
    { label: "Calendar", env: "GOOGLE_CLIENT_SECRET", description: "Meeting availability and booked calls through OAuth." },
    { label: "Token encryption", env: "TOKEN_ENCRYPTION_KEY", description: "Required before OAuth tokens can be persisted." },
    { label: "Fallback sender", env: "RESEND_API_KEY", description: "Legacy/admin fallback provider for approved sends." },
    { label: "Additional enrichment", env: "ENRICH_API_KEY", description: "Additional company/contact enrichment." },
    { label: "AI voice calls", env: "VELDO_VOICE_PROVIDER_API_KEY", description: "Autonomous call execution after compliance gates pass." },
    { label: "DNC checks", env: "VELDO_DNC_PROVIDER_API_KEY", description: "Call compliance checks before any autonomous dialing." },
  ];

  return keys.map((item) => ({
    ...item,
    configured: hasSecret(item.env),
  }));
}

async function getProfileForUser(userId?: string) {
  if (!userId) return null;
  const current = await getCurrentProfile();
  if (current?.id === userId) return current;
  try {
    const { data } = await createServiceClient().from("users").select("*").eq("id", userId).maybeSingle();
    return data as AuthProfile | null;
  } catch {
    return null;
  }
}

function emptyDashboard(error: string | null = null) {
  return {
    userId: undefined,
    campaigns: [],
    leads: [],
    tasks: [],
    drafts: [],
    sends: [],
    replies: [],
    logs: [],
    decisions: [],
    deals: [],
    meetings: [],
    user: null,
    profile: null,
    error,
  };
}

function firstError(results: Array<{ error?: { message?: string } | null }>) {
  return results.find((result) => result.error)?.error?.message ?? null;
}
