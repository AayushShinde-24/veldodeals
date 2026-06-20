import { createServiceClient } from "@/lib/integrations/supabase";
import { generateStructured, clampScore } from "@/lib/agents/structured";
import { GATE_THRESHOLDS } from "@/lib/agents/send-gate-agent";

export interface IcpResult {
  leadId: string;
  fitScore: number;
  reasoning: string;
  passesThreshold: boolean;
}

interface IcpPayload {
  fit_score: number;
  reasoning: string;
}

/**
 * Score a lead against the campaign's ICP. Writes fit_score + reasoning to icp_scores
 * and stamps leads.icp_score. Feeds the ICP send-gate (threshold 50).
 */
export async function scoreIcpFit(input: {
  userId: string;
  leadId: string;
  campaignId: string;
}): Promise<IcpResult> {
  const db = createServiceClient();

  const [{ data: lead }, { data: campaign }] = await Promise.all([
    db
      .from("leads")
      .select("company, title, first_name, last_name, location")
      .eq("id", input.leadId)
      .eq("user_id", input.userId)
      .maybeSingle(),
    db
      .from("campaigns")
      .select("name, goal, target_audience, target_niche, location, icp_json, offer_json, product_offer")
      .eq("id", input.campaignId)
      .eq("user_id", input.userId)
      .maybeSingle(),
  ]);

  if (!lead) throw new Error("Lead not found for ICP scoring.");

  const icp = describeIcp(campaign);

  const { data } = await generateStructured<IcpPayload>({
    system:
      "You are a B2B qualification analyst. Score how well a lead matches an Ideal Customer Profile from 0-100, where 100 is a perfect fit. Weigh role seniority/relevance, company/industry fit, and geography. Be strict: weak title or off-segment company should score below 50. Give a one-sentence reason.",
    prompt: [
      `ICP / campaign target:\n${icp}`,
      `\nLead:`,
      `- Name: ${[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "(unknown)"}`,
      `- Title: ${lead.title ?? "(unknown)"}`,
      `- Company: ${lead.company ?? "(unknown)"}`,
      `- Location: ${lead.location ?? "(unknown)"}`,
      `\nReturn JSON: { "fit_score": number 0-100, "reasoning": string }`,
    ].join("\n"),
    tier: "fast",
    maxTokens: 400,
  });

  const fitScore = clampScore(data.fit_score);
  const reasoning = (data.reasoning ?? "").trim();

  await db.from("icp_scores").insert({
    user_id: input.userId,
    lead_id: input.leadId,
    score: fitScore,
    fit_score: fitScore,
    reasoning,
    created_at: new Date().toISOString(),
  });

  await db.from("leads").update({ icp_score: fitScore, score: fitScore }).eq("id", input.leadId).eq("user_id", input.userId);

  return { leadId: input.leadId, fitScore, reasoning, passesThreshold: fitScore >= GATE_THRESHOLDS.icpFit };
}

function describeIcp(campaign: Record<string, unknown> | null): string {
  if (!campaign) return "(no campaign context available)";
  const icpJson = campaign.icp_json && typeof campaign.icp_json === "object" ? JSON.stringify(campaign.icp_json) : "";
  return [
    campaign.target_audience ? `Audience: ${campaign.target_audience}` : "",
    campaign.target_niche ? `Niche: ${campaign.target_niche}` : "",
    campaign.location ? `Geography: ${campaign.location}` : "",
    campaign.goal ? `Goal: ${campaign.goal}` : "",
    campaign.product_offer ? `Offer: ${campaign.product_offer}` : "",
    icpJson ? `ICP detail: ${icpJson}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
