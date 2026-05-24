import "server-only";

import { fetchLeadBundle, getDb, logAgent, saveDecision, updateLeadStage, wordCount } from "@/lib/agents/agent-helpers";
import { generateValidatedJson, loadAgentPrompt } from "@/lib/agents/model-router";
import { emailWriterOutputSchema, type AgentContext, type EmailWriterOutput } from "@/lib/agents/schemas";

export async function runEmailWriterAgent(input: Record<string, unknown>, context: AgentContext): Promise<EmailWriterOutput> {
  if (!context.leadId || !context.campaignId) throw new Error("campaign_id and lead_id are required for email writing.");
  const db = getDb();
  const bundle = await fetchLeadBundle(db, context.leadId);
  const { data: campaign } = await db.from("campaigns").select("*").eq("id", context.campaignId).single();
  if (!campaign) throw new Error("Campaign not found.");

  const prompt = await loadAgentPrompt("email-writer.md");
  const output = await generateValidatedJson({
    route: input.cheap_variant === true ? "openai_control" : "claude_premium",
    schema: emailWriterOutputSchema,
    systemPrompt: prompt,
    userPrompt: JSON.stringify({
      task: "Write a short cold email.",
      lead_id: context.leadId,
      lead: bundle.lead,
      personalization: bundle.personalization,
      email_strategy: bundle.emailStrategy,
      company_research: bundle.companyResearch,
      public_signals: bundle.publicSignals,
      campaign_offer: campaign.offer_json,
      campaign_goal: campaign.goal,
    }),
    context,
  });

  const normalized = emailWriterOutputSchema.parse({ ...output, word_count: wordCount(output.email_body) });
  await db.from("personalized_emails").upsert({
    user_id: context.userId,
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    subject_1: normalized.subject_1,
    subject_2: normalized.subject_2,
    email_body: normalized.email_body,
    cta: normalized.cta,
    tone: normalized.tone,
    personalization_used: normalized.personalization_used,
    assumptions: normalized.assumptions,
    word_count: normalized.word_count,
    approval_status: "needs_review",
  }, { onConflict: "lead_id" });

  await updateLeadStage(db, context.leadId, "drafted");
  await logAgent(db, { ...context, agentName: "email_writer" }, "Email draft saved for review.", "info", { word_count: normalized.word_count });
  await saveDecision(db, { ...context, agentName: "email_writer" }, normalized, normalized.word_count <= 110 ? 80 : 55, true);
  return normalized;
}
