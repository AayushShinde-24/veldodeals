import "server-only";

import { fetchLeadBundle, getDb, logAgent, saveDecision } from "@/lib/agents/agent-helpers";
import { type AgentContext, type MeetingBookingOutput, meetingBookingOutputSchema } from "@/lib/agents/schemas";

export async function runMeetingBookingAgent(input: Record<string, unknown>, context: AgentContext): Promise<MeetingBookingOutput> {
  if (!context.campaignId || !context.leadId) throw new Error("campaign_id and lead_id are required for meeting booking.");
  const db = getDb();
  const bundle = await fetchLeadBundle(db, context.leadId);
  const positiveIntent = input.positive_intent === true || ["interested", "meeting_request", "positive"].includes(String(input.reply_class ?? ""));
  const output = meetingBookingOutputSchema.parse({
    lead_id: context.leadId,
    campaign_id: context.campaignId,
    status: positiveIntent ? "suggested" : "needs_review",
    meeting_goal: `Qualify ${bundle.lead.company ?? "the account"} and map the next revenue step.`,
    suggested_slots: positiveIntent ? [new Date(Date.now() + 86_400_000).toISOString(), new Date(Date.now() + 172_800_000).toISOString()] : [],
    crm_stage: "meeting_booked",
    needs_review: !positiveIntent,
  });
  await logAgent(db, { ...context, agentName: "meeting_booking" }, "Meeting booking path evaluated.", "info", output);
  await saveDecision(db, { ...context, agentName: "meeting_booking" }, output, positiveIntent ? 82 : 50, output.needs_review);
  return output;
}
