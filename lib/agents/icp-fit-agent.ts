import "server-only";

import { fetchLeadBundle, getDb, logAgent, saveDecision, updateLeadStage } from "@/lib/agents/agent-helpers";
import { icpFitOutputSchema, type AgentContext, type IcpFitOutput } from "@/lib/agents/schemas";

export async function runIcpFitAgent(input: Record<string, unknown>, context: AgentContext): Promise<IcpFitOutput> {
  if (!context.leadId || !context.campaignId) throw new Error("campaign_id and lead_id are required for ICP scoring.");
  const db = getDb();
  const { lead, companyResearch, publicSignals } = await fetchLeadBundle(db, context.leadId);
  const { data: campaign } = await db.from("campaigns").select("*").eq("id", context.campaignId).single();
  if (!campaign) throw new Error("Campaign not found.");

  const icp = campaign.icp_json as Record<string, unknown>;
  const roleScore = containsAny(lead.title, icp.roles) ? 25 : lead.title ? 15 : 5;
  const industryScore = containsAny(lead.industry ?? companyResearch?.target_customers, icp.industries) ? 25 : 12;
  const painScore = companyResearch?.possible_pain_points?.length ? 22 : 8;
  const triggerScore = publicSignals?.confidence && publicSignals.confidence >= 60 ? 22 : publicSignals ? 12 : 0;
  const fitScore = Math.min(100, roleScore + industryScore + painScore + triggerScore);

  const output = icpFitOutputSchema.parse({
    lead_id: context.leadId,
    fit_score: fitScore,
    fit_level: fitScore >= 80 ? "high" : fitScore >= 65 ? "medium" : fitScore >= 50 ? "low" : "reject",
    reason: `Role ${roleScore}/25, company ${industryScore}/25, pain ${painScore}/25, trigger ${triggerScore}/25.`,
    should_continue: fitScore >= 50,
  });

  await db.from("icp_scores").upsert({
    user_id: context.userId,
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    fit_score: output.fit_score,
    fit_level: output.fit_level,
    reason: output.reason,
    should_continue: output.should_continue,
  }, { onConflict: "lead_id" });

  await updateLeadStage(db, context.leadId, output.should_continue ? "scored" : "rejected");
  await logAgent(db, { ...context, agentName: "icp_fit" }, "ICP fit scored.", "info", { fit_score: output.fit_score });
  await saveDecision(db, { ...context, agentName: "icp_fit" }, output, output.fit_score, !output.should_continue);
  return output;
}

function containsAny(value: unknown, targets: unknown) {
  const haystack = typeof value === "string" ? value.toLowerCase() : "";
  const needles = Array.isArray(targets) ? targets.filter((item): item is string => typeof item === "string") : [];
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}
