import "server-only";

import { createServiceClient, type SupabaseServiceClient } from "@/lib/integrations/supabase";
import type { AgentContext, AgentName } from "@/lib/agents/schemas";

export type JsonRecord = Record<string, unknown>;

export function getDb() {
  return createServiceClient();
}

export async function logAgent(
  db: SupabaseServiceClient,
  context: AgentContext & { agentName: AgentName },
  message: string,
  level: "info" | "warn" | "error" = "info",
  metadata: JsonRecord = {},
) {
  const workspaceId = await getWorkspaceId(db, context.userId, context.campaignId);
  await db.from("agent_logs").insert({
    user_id: context.userId,
    ...(workspaceId ? { workspace_id: workspaceId } : {}),
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    task_id: context.taskId,
    agent_name: context.agentName,
    level,
    message,
    metadata,
  });
}

export async function saveDecision(
  db: SupabaseServiceClient,
  context: AgentContext & { agentName: AgentName },
  decision: JsonRecord,
  confidence = 0,
  needsHumanReview = false,
) {
  const workspaceId = await getWorkspaceId(db, context.userId, context.campaignId);
  await db.from("agent_decisions").insert({
    user_id: context.userId,
    ...(workspaceId ? { workspace_id: workspaceId } : {}),
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    task_id: context.taskId,
    agent_name: context.agentName,
    decision_json: decision,
    confidence,
    needs_human_review: needsHumanReview,
  });
}

export async function enqueueAgentTask(input: {
  userId: string;
  campaignId?: string | null;
  leadId?: string | null;
  agentName: AgentName;
  taskType: string;
  priority?: number;
  inputJson?: JsonRecord;
}) {
  const db = getDb();
  const workspaceId = await getWorkspaceId(db, input.userId, input.campaignId);
  const { data, error } = await db
    .from("agent_tasks")
    .insert({
      user_id: input.userId,
      ...(workspaceId ? { workspace_id: workspaceId } : {}),
      campaign_id: input.campaignId,
      lead_id: input.leadId,
      agent_name: input.agentName,
      task_type: input.taskType,
      priority: input.priority ?? 5,
      input_json: input.inputJson ?? {},
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function getWorkspaceId(db: SupabaseServiceClient, userId: string, campaignId?: string | null) {
  if (campaignId) {
    const { data } = await db.from("campaigns").select("workspace_id").eq("id", campaignId).maybeSingle();
    if (data?.workspace_id) return data.workspace_id as string;
  }
  const { data } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.workspace_id ?? null;
}

export async function fetchRequiredRow<T>(
  db: SupabaseServiceClient,
  table: string,
  id: string,
  label: string,
): Promise<T> {
  const { data, error } = await db.from(table).select("*").eq("id", id).single();
  if (error || !data) throw new Error(`${label} not found.`);
  return data as T;
}

export async function fetchLeadBundle(db: SupabaseServiceClient, leadId: string) {
  const { data: lead, error: leadError } = await db.from("leads").select("*").eq("id", leadId).single();
  if (leadError || !lead) throw new Error("Lead not found.");

  const [
    enrichment,
    companyResearch,
    publicSignals,
    icpScore,
    personalization,
    emailStrategy,
    email,
    emailScore,
    verification,
    sendGate,
  ] = await Promise.all([
    db.from("lead_enrichment").select("*").eq("lead_id", leadId).maybeSingle(),
    db.from("company_research").select("*").eq("lead_id", leadId).maybeSingle(),
    db.from("public_signals").select("*").eq("lead_id", leadId).maybeSingle(),
    db.from("icp_scores").select("*").eq("lead_id", leadId).maybeSingle(),
    db.from("personalization_strategies").select("*").eq("lead_id", leadId).maybeSingle(),
    db.from("email_strategies").select("*").eq("lead_id", leadId).maybeSingle(),
    db.from("personalized_emails").select("*").eq("lead_id", leadId).maybeSingle(),
    db.from("email_scores").select("*").eq("lead_id", leadId).maybeSingle(),
    db.from("email_verifications").select("*").eq("lead_id", leadId).maybeSingle(),
    db.from("send_gate_results").select("*").eq("lead_id", leadId).maybeSingle(),
  ]);

  return {
    lead,
    enrichment: enrichment.data,
    companyResearch: companyResearch.data,
    publicSignals: publicSignals.data,
    icpScore: icpScore.data,
    personalization: personalization.data,
    emailStrategy: emailStrategy.data,
    email: email.data,
    emailScore: emailScore.data,
    verification: verification.data,
    sendGate: sendGate.data,
  };
}

export async function updateLeadStage(db: SupabaseServiceClient, leadId: string, stage: string) {
  await db.from("leads").update({ stage }).eq("id", leadId);
}

export function wordCount(value: string) {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

export function toPlainTextHtml(text: string) {
  return text
    .split(/\n{2,}/u)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/u, "<br />")}</p>`)
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#039;");
}
