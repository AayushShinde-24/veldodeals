import "server-only";

import { fetchLeadBundle, getDb, logAgent, saveDecision, updateLeadStage } from "@/lib/agents/agent-helpers";
import { sendingOutputSchema, type AgentContext, type SendingOutput } from "@/lib/agents/schemas";
import { getConnectedGoogleAccessToken } from "@/src/lib/apis/google/connected-account";
import { sendGmailMessage } from "@/src/lib/apis/google/gmail-client";
import { evaluateSendGates } from "@/src/lib/email/gates";
import { assertComplianceReady } from "@/src/lib/mvp/compliance";
import { getUsageSnapshot } from "@/src/lib/mvp/usage";
import { appendComplianceFooter, buildUnsubscribeLink, hasComplianceFooter, isUnsubscribed } from "@/src/lib/mvp/unsubscribe";
import { recordCreditUsage } from "@/lib/billing/credits";

export async function runSendingAgent(_input: Record<string, unknown>, context: AgentContext): Promise<SendingOutput> {
  if (!context.leadId || !context.campaignId) throw new Error("campaign_id and lead_id are required for sending.");
  const db = getDb();
  const bundle = await fetchLeadBundle(db, context.leadId);
  const { data: user } = await db.from("users").select("*").eq("id", context.userId).single();
  const { data: campaign } = await db.from("campaigns").select("workspace_id").eq("id", context.campaignId).maybeSingle();
  const workspaceId = campaign?.workspace_id ?? null;
  if (!user) throw new Error("User not found.");
  if (!bundle.email || !bundle.emailScore || !bundle.verification) throw new Error("Draft, score, and verification are required before sending.");
  const { data: existingSend } = await db
    .from("email_send_events")
    .select("provider_message_id,status,provider_json")
    .eq("user_id", context.userId)
    .eq("campaign_id", context.campaignId)
    .eq("lead_id", context.leadId)
    .eq("status", "sent")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingSend?.provider_message_id) {
    return sendingOutputSchema.parse({
      sent: true,
      lead_id: context.leadId,
      campaign_id: context.campaignId,
      provider_message_id: String(existingSend.provider_message_id),
      credits_used: 0,
      status: "already_sent",
    });
  }

  const compliance = await assertComplianceReady(context.userId, context.campaignId);
  const gmail = workspaceId ? await getConnectedGoogleAccessToken(String(workspaceId), "gmail") : null;
  if (!gmail) throw new Error("A connected Gmail sending account is required.");
  const [unsubscribed, usageSnapshot, duplicateRecipient] = await Promise.all([
    isUnsubscribed({ userId: context.userId, email: bundle.lead.email }),
    getUsageSnapshot(context.userId),
    hasDuplicateRecipient(context.userId, context.campaignId, context.leadId, bundle.lead.email),
  ]);
  const gates = evaluateSendGates({
    lead: bundle.lead,
    icpScore: bundle.icpScore,
    research: bundle.companyResearch,
    emailScore: bundle.emailScore,
    verification: bundle.verification,
    strategy: bundle.personalization,
    draft: bundle.email,
    credits: user.credits_balance,
    notUnsubscribed: !unsubscribed,
    complianceReady: true,
    dailySendingRemaining: usageSnapshot.remainingToday,
    duplicateRecipient,
    requireConnectedSendingAccount: true,
    connectedSendingAccount: true,
  });
  if (!gates.pass) throw new Error(`Sending gates failed: ${gates.failures.join(" ")}`);

  const body = appendComplianceFooter({
    body: bundle.email.email_body,
    compliance,
    unsubscribeLink: buildUnsubscribeLink({ email: bundle.lead.email, campaignId: context.campaignId }),
  });
  if (!hasComplianceFooter(body)) throw new Error("Email compliance footer is missing.");
  const provider = "gmail";
  const sent = await sendGmailMessage({
    accessToken: gmail.accessToken,
    from: gmail.account.email,
    to: bundle.lead.email,
    subject: bundle.email.subject_1,
    body,
  }) as Record<string, unknown>;

  const providerMessageId = String(sent?.id ?? `${provider}_unknown`);
  const accounting = await recordCreditUsage({
    userId: context.userId,
    workspaceId,
    campaignId: context.campaignId,
    leadId: context.leadId,
    action: "email_send",
    metadata: { provider, provider_message_id: providerMessageId, provider_thread_id: sent.threadId ?? null },
  });

  const output = sendingOutputSchema.parse({
    sent: true,
    lead_id: context.leadId,
    campaign_id: context.campaignId,
    provider_message_id: providerMessageId,
    credits_used: accounting.creditsUsed,
    status: "sent",
  });

  await db.from("email_send_events").insert({
    user_id: context.userId,
    workspace_id: workspaceId,
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    provider_message_id: output.provider_message_id,
    credits_used: output.credits_used,
    status: output.status,
    provider_json: sent ?? {},
  });
  await db.from("emails").insert({
    workspace_id: workspaceId,
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    subject: bundle.email.subject_1,
    body,
    status: "sent",
    provider,
    provider_message_id: output.provider_message_id,
    sent_at: new Date().toISOString(),
    metadata: sent ?? {},
  });
  await db.from("personalized_emails").update({ approval_status: "sent" }).eq("lead_id", context.leadId);
  await updateLeadStage(db, context.leadId, "sent");
  await logAgent(db, { ...context, agentName: "sending" }, "Approved email sent and credits deducted.", "info", { provider, provider_message_id: providerMessageId });
  await saveDecision(db, { ...context, agentName: "sending" }, output, 95, false);
  return output;
}

async function hasDuplicateRecipient(userId: string, campaignId: string, leadId: string, email: string) {
  const { data } = await getDb()
    .from("leads")
    .select("id")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .ilike("email", email);
  return (data ?? []).some((lead) => String(lead.id) !== leadId);
}
