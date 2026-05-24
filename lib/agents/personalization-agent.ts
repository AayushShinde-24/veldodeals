import "server-only";

import { fetchLeadBundle, getDb, logAgent, saveDecision, updateLeadStage } from "@/lib/agents/agent-helpers";
import { generateValidatedJson, loadAgentPrompt } from "@/lib/agents/model-router";
import { personalizationOutputSchema, type AgentContext, type PersonalizationOutput } from "@/lib/agents/schemas";

export async function runPersonalizationAgent(input: Record<string, unknown>, context: AgentContext): Promise<PersonalizationOutput> {
  if (!context.leadId || !context.campaignId) throw new Error("campaign_id and lead_id are required for personalization.");
  const db = getDb();
  const bundle = await fetchLeadBundle(db, context.leadId);
  const { data: campaign } = await db.from("campaigns").select("*").eq("id", context.campaignId).single();
  if (!campaign) throw new Error("Campaign not found.");

  const prompt = await loadAgentPrompt("personalization.md");
  const output = await generateValidatedJson({
    route: "claude_premium",
    schema: personalizationOutputSchema,
    systemPrompt: prompt,
    userPrompt: JSON.stringify({
      task: "Create a safe personalization strategy.",
      lead_id: context.leadId,
      lead: bundle.lead,
      company_research: bundle.companyResearch,
      public_signals: bundle.publicSignals,
      campaign_offer: campaign.offer_json,
      campaign_goal: campaign.goal,
      input,
    }),
    context,
  });

  await db.from("personalization_strategies").upsert({
    user_id: context.userId,
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    business_priority: output.business_priority,
    pain_point: output.pain_point,
    public_trigger: output.public_trigger,
    personalization_angle: output.personalization_angle,
    opener: output.opener,
    risk_level: output.risk_level,
    confidence: output.confidence,
    needs_review: output.needs_review,
  }, { onConflict: "lead_id" });

  await updateLeadStage(db, context.leadId, output.needs_review || output.risk_level === "high" ? "needs_review" : "personalized");
  await logAgent(db, { ...context, agentName: "personalization_strategy" }, "Personalization strategy saved.", "info", { confidence: output.confidence, risk: output.risk_level });
  await saveDecision(db, { ...context, agentName: "personalization_strategy" }, output, output.confidence, output.needs_review || output.risk_level === "high");
  return output;
}
