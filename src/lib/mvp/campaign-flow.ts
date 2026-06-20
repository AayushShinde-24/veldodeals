import { createServiceClient } from "@/lib/integrations/supabase";
import { enqueueAgentTask } from "@/lib/agents/agent-helpers";

export async function createCampaignAndRun(
  userId: string,
  body: Record<string, unknown>
): Promise<{ campaignId: string; taskId: string; message: string }> {
  const db = createServiceClient();

  const name = String(body.name || body.product_offer || "Untitled campaign").slice(0, 120);
  const goal = String(body.goal || body.target_niche || "Generate qualified leads");

  const { data: campaign, error: campaignError } = await db
    .from("campaigns")
    .insert({
      user_id: userId,
      name,
      goal,
      offer_json: body.product_offer ? { description: body.product_offer } : null,
      icp_json: body.target_niche
        ? { description: body.target_niche, number_of_leads: body.number_of_leads ?? 50 }
        : null,
      status: "draft",
      created_at: new Date().toISOString(),
    })
    .select("id, name")
    .single();

  if (campaignError || !campaign) {
    throw new Error(`Failed to create campaign: ${campaignError?.message ?? "Unknown error"}`);
  }

  const task = await enqueueAgentTask({
    userId,
    campaignId: campaign.id,
    agentName: "campaign_leader",
    taskType: "initialize_campaign",
    priority: 1,
    inputJson: body,
  });

  return {
    campaignId: campaign.id,
    taskId: task.id,
    message: `Campaign "${campaign.name}" created. Campaign Leader will initialize the workflow.`,
  };
}
