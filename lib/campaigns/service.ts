import { createServiceClient } from "@/lib/integrations/supabase";

export interface CreateCampaignInput {
  userId: string;
  name: string;
  goal: string;
  offer?: Record<string, unknown>;
  icp?: Record<string, unknown>;
}

export async function createCampaign(input: CreateCampaignInput) {
  const db = createServiceClient();

  const { data, error } = await db
    .from("campaigns")
    .insert({
      user_id: input.userId,
      name: input.name,
      goal: input.goal,
      offer_json: input.offer ?? null,
      icp_json: input.icp ?? null,
      status: "draft",
      created_at: new Date().toISOString(),
    })
    .select("id, name, status, goal, created_at")
    .single();

  if (error) throw new Error(`Failed to create campaign: ${error.message}`);
  return data;
}

export async function getCampaign(campaignId: string, userId: string) {
  const db = createServiceClient();
  const { data, error } = await db
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Campaign not found.");
  return data;
}

export async function updateCampaignStatus(
  campaignId: string,
  userId: string,
  status: string
) {
  const db = createServiceClient();
  const { data, error } = await db
    .from("campaigns")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("user_id", userId)
    .select("id, status")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function startCampaign(campaignId: string, userId: string) {
  return updateCampaignStatus(campaignId, userId, "running");
}

export async function pauseCampaign(campaignId: string, userId: string) {
  return updateCampaignStatus(campaignId, userId, "paused");
}
