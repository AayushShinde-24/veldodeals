import "server-only";

import { getDb, logAgent, saveDecision } from "@/lib/agents/agent-helpers";
import { campaignSequenceOutputSchema, type AgentContext, type CampaignSequenceOutput } from "@/lib/agents/schemas";

export async function runCampaignSequenceAgent(input: Record<string, unknown>, context: AgentContext): Promise<CampaignSequenceOutput> {
  if (!context.campaignId) throw new Error("campaign_id is required for campaign sequence.");
  const db = getDb();
  const { data: campaign } = await db.from("campaigns").select("*").eq("id", context.campaignId).single();
  if (!campaign) throw new Error("Campaign not found.");

  const offer = campaign.offer_json as Record<string, unknown>;
  const offerName = typeof offer.name === "string" ? offer.name : "your offer";
  const output = campaignSequenceOutputSchema.parse({
    campaign_id: context.campaignId,
    steps: [
      {
        step_number: 1,
        delay_days: 0,
        subject: String(input.subject ?? "Quick question"),
        body: `Introduce ${offerName} with one public business reason and a low-pressure CTA.`,
        goal: "Start a relevant conversation.",
      },
      {
        step_number: 2,
        delay_days: 4,
        subject: "Worth exploring?",
        body: "Add one new practical value point without pressure or fake urgency.",
        goal: "Clarify value and invite a reply.",
      },
      {
        step_number: 3,
        delay_days: 8,
        subject: "Close the loop",
        body: "Politely close the loop, include unsubscribe-friendly language, and avoid guilt pressure.",
        goal: "Give the lead an easy yes/no path.",
      },
    ],
  });

  await db.from("campaign_steps").delete().eq("campaign_id", context.campaignId);
  await db.from("campaign_steps").insert(output.steps.map((step) => ({
    user_id: context.userId,
    campaign_id: context.campaignId,
    ...step,
  })));

  await logAgent(db, { ...context, agentName: "campaign_sequence" }, "Campaign sequence saved.", "info", { steps: output.steps.length });
  await saveDecision(db, { ...context, agentName: "campaign_sequence" }, output, 80, false);
  return output;
}
