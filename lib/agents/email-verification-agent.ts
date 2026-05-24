import "server-only";

import { fetchLeadBundle, getDb, logAgent, saveDecision, updateLeadStage } from "@/lib/agents/agent-helpers";
import { emailVerificationOutputSchema, type AgentContext, type EmailVerificationOutput } from "@/lib/agents/schemas";
import { mapZeroBounceDecision, verifyWithZeroBounce } from "@/lib/integrations/zerobounce";

export async function runEmailVerificationAgent(_input: Record<string, unknown>, context: AgentContext): Promise<EmailVerificationOutput> {
  if (!context.leadId) throw new Error("lead_id is required for email verification.");
  const db = getDb();
  const { lead } = await fetchLeadBundle(db, context.leadId);
  const provider = await verifyWithZeroBounce(lead.email, context.userId, context.campaignId, context.leadId);
  const decision = mapZeroBounceDecision(provider.status, provider.sub_status);

  const output = emailVerificationOutputSchema.parse({
    lead_id: context.leadId,
    email: lead.email,
    ...decision,
  });

  await db.from("email_verifications").upsert({
    user_id: context.userId,
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    email: output.email,
    status: output.status,
    send_decision: output.send_decision,
    reason: output.reason,
    provider_json: provider,
  }, { onConflict: "lead_id" });

  await updateLeadStage(db, context.leadId, output.status === "valid" ? "verified" : "needs_review");
  await logAgent(db, { ...context, agentName: "email_verification" }, "Email verification completed.", "info", { status: output.status });
  await saveDecision(db, { ...context, agentName: "email_verification" }, output, output.status === "valid" ? 90 : 40, output.status !== "valid");
  return output;
}
