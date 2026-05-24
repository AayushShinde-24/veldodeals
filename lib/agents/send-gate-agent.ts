import "server-only";

import { fetchLeadBundle, getDb, logAgent, saveDecision } from "@/lib/agents/agent-helpers";
import { sendGateOutputSchema, type AgentContext, type SendGateOutput } from "@/lib/agents/schemas";
import { getOptionalEnv } from "@/lib/security/env";
import { evaluateSendGates } from "@/src/lib/email/gates";
import { assertComplianceReady } from "@/src/lib/mvp/compliance";
import { getUsageSnapshot } from "@/src/lib/mvp/usage";
import { isUnsubscribed } from "@/src/lib/mvp/unsubscribe";

export async function runSendGateAgent(_input: Record<string, unknown>, context: AgentContext): Promise<SendGateOutput> {
  if (!context.leadId || !context.campaignId) throw new Error("campaign_id and lead_id are required for send gates.");
  const db = getDb();
  const bundle = await fetchLeadBundle(db, context.leadId);
  const { data: user } = await db.from("users").select("credits_balance").eq("id", context.userId).single();
  const { data: campaign } = await db.from("campaigns").select("workspace_id,sending_mode").eq("id", context.campaignId).single();
  if (!user) throw new Error("User not found.");
  if (!campaign) throw new Error("Campaign not found.");

  const email = String(bundle.lead.email ?? "");
  const [complianceReady, unsubscribed, usage, duplicateRecipient, connectedSendingAccount] = await Promise.all([
    assertComplianceReady(context.userId, context.campaignId).then(() => true).catch(() => false),
    email ? isUnsubscribed({ userId: context.userId, email }).catch(() => true) : Promise.resolve(true),
    getUsageSnapshot(context.userId).catch(() => ({ remainingToday: 0 })),
    hasDuplicateRecipient(context.userId, context.campaignId, context.leadId, email),
    hasConnectedGmailAccount(String(campaign.workspace_id ?? "")),
  ]);
  const allowlist = getSendAllowlist();
  const requireAllowlist = String(campaign.sending_mode ?? "") === "auto_send" || allowlist.length > 0;

  const gates = evaluateSendGates({
    lead: bundle.lead,
    icpScore: bundle.icpScore,
    research: bundle.companyResearch,
    emailScore: bundle.emailScore,
    verification: bundle.verification,
    strategy: bundle.personalization,
    draft: bundle.email,
    credits: Number(user.credits_balance ?? 0),
    notUnsubscribed: !unsubscribed,
    complianceReady,
    dailySendingRemaining: Number(usage.remainingToday ?? 0),
    duplicateRecipient,
    requireConnectedSendingAccount: true,
    connectedSendingAccount,
    requireAllowlist,
    sendAllowlisted: email ? isAllowlisted(email, allowlist) : false,
  });

  const output = sendGateOutputSchema.parse({
    lead_id: context.leadId,
    campaign_id: context.campaignId,
    eligible_to_send: gates.pass,
    checks: gates.checks,
    failures: gates.failures,
    needs_review: !gates.pass,
    decision: gates.pass ? "send" : gates.failures.some((failure) => /approval|review/i.test(failure)) ? "review" : "blocked",
  });

  await db.from("send_gate_results").upsert({
    user_id: context.userId,
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    eligible_to_send: output.eligible_to_send,
    checks: output.checks,
    failures: output.failures,
    needs_review: output.needs_review,
    decision: output.decision,
  }, { onConflict: "lead_id" });

  await logAgent(db, { ...context, agentName: "send_gate" }, "Send gates evaluated.", "info", { decision: output.decision, failures: output.failures.length });
  await saveDecision(db, { ...context, agentName: "send_gate" }, output, output.eligible_to_send ? 95 : 55, output.needs_review);
  return output;
}

async function hasDuplicateRecipient(userId: string, campaignId: string, leadId: string, email: string) {
  if (!email) return true;
  const { data } = await getDb()
    .from("leads")
    .select("id")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .ilike("email", email);
  return (data ?? []).some((lead) => String(lead.id) !== leadId);
}

async function hasConnectedGmailAccount(workspaceId: string) {
  if (!workspaceId) return false;
  const { data } = await getDb()
    .from("connected_accounts")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("provider", "gmail")
    .eq("status", "connected")
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

function getSendAllowlist() {
  return (getOptionalEnv()?.VELDO_SEND_ALLOWLIST ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowlisted(email: string, allowlist: string[]) {
  if (!allowlist.length) return true;
  const normalized = email.toLowerCase();
  const domain = normalized.split("@")[1] ?? "";
  return allowlist.some((item) => {
    const clean = item.startsWith("@") ? item.slice(1) : item;
    return normalized === item || domain === clean;
  });
}
