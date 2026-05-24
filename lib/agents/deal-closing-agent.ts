import "server-only";

import { getDb, logAgent, saveDecision } from "@/lib/agents/agent-helpers";
import { type AgentContext, type DealClosingOutput, dealClosingOutputSchema } from "@/lib/agents/schemas";

export async function runDealClosingAgent(input: Record<string, unknown>, context: AgentContext): Promise<DealClosingOutput> {
  if (!context.campaignId || !context.leadId) throw new Error("campaign_id and lead_id are required for deal follow-up.");
  const db = getDb();
  const stage = normalizeStage(input.deal_stage);
  const output = dealClosingOutputSchema.parse({
    lead_id: context.leadId,
    campaign_id: context.campaignId,
    deal_stage: stage,
    next_action: nextActionForStage(stage),
    follow_up_plan: ["Confirm business priority", "Send concise recap", "Ask for the next scheduled commitment"],
    revenue_confidence: stage === "won" ? 100 : stage === "negotiation" ? 75 : 60,
    needs_review: stage === "lost",
  });
  await logAgent(db, { ...context, agentName: "deal_closing" }, "Deal follow-up action planned.", "info", output);
  await saveDecision(db, { ...context, agentName: "deal_closing" }, output, output.revenue_confidence, output.needs_review);
  return output;
}

function normalizeStage(value: unknown) {
  const stage = String(value ?? "interested");
  return ["interested", "meeting_booked", "demo_done", "proposal_sent", "negotiation", "won", "lost"].includes(stage)
    ? stage
    : "interested";
}

function nextActionForStage(stage: string) {
  switch (stage) {
    case "meeting_booked": return "Prepare meeting agenda and confirm calendar attendance.";
    case "demo_done": return "Send proposal tied to the stated business priority.";
    case "proposal_sent": return "Follow up on decision criteria and timeline.";
    case "negotiation": return "Clarify blocker, commercial terms, and close date.";
    case "won": return "Trigger onboarding and expansion tracking.";
    case "lost": return "Record loss reason and stop active selling sequence.";
    default: return "Qualify interest and book a meeting.";
  }
}
