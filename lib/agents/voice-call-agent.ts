import "server-only";

import { fetchLeadBundle, getDb, logAgent, saveDecision } from "@/lib/agents/agent-helpers";
import { type AgentContext, type VoiceCallOutput, voiceCallOutputSchema } from "@/lib/agents/schemas";
import { evaluateAiVoiceCallCompliance } from "@/lib/revenue-os/compliance";
import { checkDncStatus } from "@/lib/integrations/dnc-provider";
import { queueVoiceCall } from "@/lib/integrations/voice-provider";

export async function runVoiceCallAgent(input: Record<string, unknown>, context: AgentContext): Promise<VoiceCallOutput> {
  if (!context.campaignId || !context.leadId) throw new Error("campaign_id and lead_id are required for voice calls.");
  const db = getDb();
  const bundle = await fetchLeadBundle(db, context.leadId);
  const dnc = await checkDncStatus({ phone: typeof bundle.lead.phone === "string" ? bundle.lead.phone : null, country: String(input.jurisdiction ?? "US") });
  const compliance = evaluateAiVoiceCallCompliance({
    consent_basis: input.consent_basis === "express_written" || input.consent_basis === "existing_business_relationship" ? input.consent_basis : "manual_review_required",
    jurisdiction: typeof input.jurisdiction === "string" ? input.jurisdiction : "US",
    dnc_checked: dnc.status === "clear" || input.dnc_checked === true,
    call_time_allowed: input.call_time_allowed === true,
    ai_disclosure_required: true,
    ai_disclosure_script: "Hi, this is Veldo calling with an AI assistant on behalf of the sender. You can opt out at any time.",
    recording_consent_required: input.recording_consent_required !== false,
    recording_consent_obtained: input.recording_consent_obtained === true,
    opt_out_supported: input.opt_out_supported === true,
    user_approved_campaign_purpose: input.user_approved_campaign_purpose === true,
  });

  const output = voiceCallOutputSchema.parse({
    lead_id: context.leadId,
    campaign_id: context.campaignId,
    status: compliance.passed ? "queued" : "needs_review",
    consent_basis: input.consent_basis === "express_written" || input.consent_basis === "existing_business_relationship" ? input.consent_basis : "manual_review_required",
    compliance_checks: [...compliance.issues, ...(dnc.allowed ? [] : [dnc.reason])],
    script: `Open with disclosure, confirm ${bundle.lead.company ?? "the company"} context, ask one qualifying question, and offer a meeting slot only after interest is clear.`,
    needs_review: !compliance.passed,
  });
  const provider = output.needs_review ? null : await queueVoiceCall({
    to: String(bundle.lead.phone ?? ""),
    script: output.script,
    disclosure: "This is an AI assistant calling on behalf of the sender. You can opt out at any time.",
  });

  await db.from("call_tasks").insert({
    user_id: context.userId,
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    status: output.status,
    consent_basis: output.consent_basis,
    compliance_json: { checks: output.compliance_checks, dnc, provider },
    script: output.script,
  });
  await logAgent(db, { ...context, agentName: "voice_call" }, "Voice call compliance evaluated.", "info", output);
  await saveDecision(db, { ...context, agentName: "voice_call" }, output, output.needs_review ? 55 : 85, output.needs_review);
  return output;
}
