import "server-only";

import { createServiceClient } from "@/lib/integrations/supabase";
import { enqueueAgentTask } from "@/lib/agents/agent-helpers";
import { ensureDefaultWorkspace, isMissingSchemaError } from "@/src/lib/workspace/context";

export async function createCampaign(input: {
  userId: string;
  name: string;
  goal: string;
  offer: Record<string, unknown>;
  icp: Record<string, unknown>;
}) {
  const db = createServiceClient();
  await db.from("users").upsert({ id: input.userId }, { onConflict: "id" });
  const workspace = await ensureDefaultWorkspace(input.userId);
  const fullPayload = {
    user_id: input.userId,
    ...(workspace.schemaMode === "workspace" ? { workspace_id: workspace.workspaceId } : {}),
    name: input.name,
    goal: input.goal,
    offer_json: input.offer,
    icp_json: input.icp,
    status: "draft",
  };
  let created = await db.from("campaigns").insert(fullPayload).select("*").single();
  if (created.error && isMissingSchemaError(created.error)) {
    created = await db.from("campaigns").insert({
      user_id: input.userId,
      name: input.name,
      goal: input.goal,
      offer_json: input.offer,
      icp_json: input.icp,
      status: "draft",
    }).select("*").single();
  }
  const { data, error } = created;
  if (error) throw new Error(error.message);
  if (workspace.schemaMode === "workspace") {
    await db.from("analytics_events").insert({
      workspace_id: workspace.workspaceId,
      event_type: "campaign_created",
      entity_id: data.id,
      metadata: { name: input.name },
    });
  }
  return data;
}

export async function startCampaign(userId: string, campaignId: string) {
  const db = createServiceClient();
  const { data, error } = await db
    .from("campaigns")
    .update({ status: "running" })
    .eq("user_id", userId)
    .eq("id", campaignId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await enqueueAgentTask({
    userId,
    campaignId,
    agentName: "campaign_leader",
    taskType: "plan_campaign",
    priority: 1,
    inputJson: {},
  });

  return data;
}

export async function pauseCampaign(userId: string, campaignId: string) {
  const db = createServiceClient();
  const { data, error } = await db
    .from("campaigns")
    .update({ status: "paused" })
    .eq("user_id", userId)
    .eq("id", campaignId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getCampaign(userId: string, campaignId: string) {
  const db = createServiceClient();
  const [campaign, leads, tasks, logs, drafts, analytics] = await Promise.all([
    db.from("campaigns").select("*").eq("user_id", userId).eq("id", campaignId).single(),
    db.from("leads").select("*").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: false }),
    db.from("agent_tasks").select("*").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: false }),
    db.from("agent_logs").select("*").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: false }).limit(50),
    db.from("personalized_emails").select("*").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: false }),
    db.from("campaign_learnings").select("*").eq("user_id", userId).eq("campaign_id", campaignId).maybeSingle(),
  ]);

  if (campaign.error) throw new Error(campaign.error.message);
  return {
    campaign: campaign.data,
    leads: leads.data ?? [],
    tasks: tasks.data ?? [],
    logs: logs.data ?? [],
    drafts: drafts.data ?? [],
    analytics: analytics.data,
  };
}
