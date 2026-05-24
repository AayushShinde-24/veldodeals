import "server-only";

import { fetchLeadBundle, getDb, logAgent, saveDecision, updateLeadStage } from "@/lib/agents/agent-helpers";
import { generateValidatedJson, loadAgentPrompt } from "@/lib/agents/model-router";
import { emailStrategyOutputSchema, type AgentContext, type EmailStrategyOutput } from "@/lib/agents/schemas";

export async function runEmailStrategyAgent(input: Record<string, unknown>, context: AgentContext): Promise<EmailStrategyOutput> {
  if (!context.leadId || !context.campaignId) throw new Error("campaign_id and lead_id are required for email strategy.");
  const db = getDb();
  const bundle = await fetchLeadBundle(db, context.leadId);
  const { data: campaign } = await db.from("campaigns").select("*").eq("id", context.campaignId).single();
  if (!campaign) throw new Error("Campaign not found.");

  const prompt = await loadAgentPrompt("email-strategy.md");
  const output = await generateValidatedJson({
    route: "claude_premium",
    schema: emailStrategyOutputSchema,
    systemPrompt: prompt,
    userPrompt: JSON.stringify({
      task: "Create the safe email strategy before the writer drafts copy.",
      lead_id: context.leadId,
      lead: bundle.lead,
      company_research: bundle.companyResearch,
      public_signals: bundle.publicSignals,
      personalization: bundle.personalization,
      campaign_offer: campaign.offer_json ?? campaign.offer ?? campaign.product_offer,
      campaign_goal: campaign.goal,
      input,
    }),
    context,
  });

  await db.from("email_strategies").upsert({
    user_id: context.userId,
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    angle: output.angle,
    pain_hypothesis: output.pain_hypothesis,
    offer: output.offer,
    cta: output.cta,
    tone: output.tone,
    objection_risk: output.objection_risk,
    facts_allowed: output.facts_allowed,
    facts_blocked: output.facts_blocked,
    confidence: output.confidence,
    needs_review: output.needs_review,
  }, { onConflict: "lead_id" });

  await updateLeadStage(db, context.leadId, output.needs_review ? "needs_review" : "personalized");
  await logAgent(db, { ...context, agentName: "email_strategy" }, "Email strategy saved.", "info", { confidence: output.confidence });
  await saveDecision(db, { ...context, agentName: "email_strategy" }, output, output.confidence, output.needs_review);
  return output;
}
