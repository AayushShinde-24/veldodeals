import "server-only";

import { getDb, logAgent, saveDecision } from "@/lib/agents/agent-helpers";
import { type AgentContext, type FundraisingOutput, fundraisingOutputSchema } from "@/lib/agents/schemas";

export async function runFundraisingAgent(input: Record<string, unknown>, context: AgentContext): Promise<FundraisingOutput> {
  if (!context.campaignId) throw new Error("campaign_id is required for fundraising work.");
  const db = getDb();
  const legalApproved = input.approved_securities_language === true;
  const output = fundraisingOutputSchema.parse({
    campaign_id: context.campaignId,
    investor_id: typeof input.investor_id === "string" ? input.investor_id : undefined,
    status: legalApproved ? "drafted" : "needs_review",
    pitch_angle: String(input.pitch_angle ?? "Match the investor thesis to verified product traction and market timing."),
    email_subject: String(input.email_subject ?? "Investor intro"),
    email_body: String(input.email_body ?? "Sharing a concise, verified overview for review. Happy to send details if this fits your thesis."),
    compliance_checks: legalApproved ? [] : ["Approved fundraising and securities language is required before outreach."],
    needs_legal_review: !legalApproved,
  });
  await logAgent(db, { ...context, agentName: "fundraising" }, "Fundraising outreach drafted with compliance gate.", "info", output);
  await saveDecision(db, { ...context, agentName: "fundraising" }, output, output.needs_legal_review ? 45 : 78, output.needs_legal_review);
  return output;
}
