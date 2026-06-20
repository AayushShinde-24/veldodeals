import { createServiceClient } from "@/lib/integrations/supabase";
import { runSendGates } from "@/lib/agents/send-gate-agent";
import { getConnectedGoogleAccessToken } from "@/src/lib/apis/google/connected-account";
import { sendGmailMessage } from "@/src/lib/apis/google/gmail-client";
import { appendComplianceFooter, buildUnsubscribeLink, isUnsubscribed } from "@/src/lib/mvp/unsubscribe";
import { deductCredits } from "@/lib/billing/credits";
import { checkSendCompliance } from "@/src/lib/mvp/compliance";
import { trackEvent } from "@/src/lib/analytics/events";
import { emitCustomerWebhook } from "@/lib/webhooks/customer";

export async function approveGeneratedEmail(
  userIdOrOptions: string | { userId: string; generatedEmailId?: string; draftId?: string; subject?: string; body?: string },
  draftId?: string
): Promise<{ approved: boolean; draftId: string }> {
  const userId = typeof userIdOrOptions === "string" ? userIdOrOptions : userIdOrOptions.userId;
  const id = typeof userIdOrOptions === "string" ? (draftId ?? "") : (userIdOrOptions.generatedEmailId ?? userIdOrOptions.draftId ?? "");
  const db = createServiceClient();

  const updates: Record<string, unknown> = { approval_status: "approved", approved_at: new Date().toISOString() };
  if (typeof userIdOrOptions === "object" && userIdOrOptions.subject) updates.subject = userIdOrOptions.subject;
  if (typeof userIdOrOptions === "object" && userIdOrOptions.body) updates.body = userIdOrOptions.body;

  const { error } = await db
    .from("generated_emails")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`Failed to approve draft: ${error.message}`);
  return { approved: true, draftId: id };
}

export async function sendGeneratedEmail(
  userIdOrOptions: string | { userId: string; generatedEmailId?: string; draftId?: string },
  draftId?: string
): Promise<{ success: boolean; messageId?: string; blocked?: string[] }> {
  const userId = typeof userIdOrOptions === "string" ? userIdOrOptions : userIdOrOptions.userId;
  const id = typeof userIdOrOptions === "string" ? (draftId ?? "") : (userIdOrOptions.generatedEmailId ?? userIdOrOptions.draftId ?? "");
  return sendApprovedDraft(userId, id);
}

export async function sendApprovedDraft(
  userId: string,
  draftId: string
): Promise<{ success: boolean; messageId?: string; blocked?: string[] }> {
  const gateResult = await runSendGates(userId, draftId);
  if (!gateResult.passed) {
    return { success: false, blocked: gateResult.blockers };
  }

  const db = createServiceClient();
  const { data: draft } = await db
    .from("email_drafts")
    .select("*")
    .eq("id", draftId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!draft) throw new Error("Draft not found.");

  // Check unsubscribe list
  const unsubscribed = await isUnsubscribed(draft.to_email, userId);
  if (unsubscribed) {
    return { success: false, blocked: ["Email address is on the unsubscribe list."] };
  }

  const compliance = await checkSendCompliance(userId, draft.to_email);
  if (!compliance.allowed) {
    return { success: false, blocked: [compliance.reason ?? "Compliance policy blocked this send."] };
  }

  // Deduct credits before sending
  const creditResult = await deductCredits(userId, "email_send", 1);
  if (!creditResult.success) {
    return { success: false, blocked: [creditResult.error ?? "Insufficient credits."] };
  }

  // Get sending access token
  const { accessToken } = await getConnectedGoogleAccessToken(userId);

  // Append compliance footer
  const unsubscribeUrl = buildUnsubscribeLink(draft.to_email, userId);
  const htmlBody = appendComplianceFooter({
    body: draft.html_body ?? draft.body ?? "",
    email: draft.to_email,
    userId,
    unsubscribeLink: unsubscribeUrl,
  });

  // Send via Gmail
  const result = await sendGmailMessage({
    accessToken,
    to: draft.to_email,
    subject: draft.subject,
    htmlBody,
    textBody: draft.text_body ?? undefined,
    listUnsubscribeUrl: unsubscribeUrl,
  });

  // Record the send
  await db.from("email_sends").insert({
    user_id: userId,
    draft_id: draftId,
    campaign_id: draft.campaign_id,
    lead_id: draft.lead_id,
    to_email: draft.to_email,
    subject: draft.subject,
    gmail_message_id: result.messageId,
    gmail_thread_id: result.threadId,
    status: "sent",
    sent_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });
  await trackEvent({ userId, event: "first_send", entityId: draftId, properties: { campaign_id: draft.campaign_id } });
  await emitCustomerWebhook({
    userId,
    event: "email.sent",
    payload: { draft_id: draftId, campaign_id: draft.campaign_id, lead_id: draft.lead_id, to: draft.to_email },
  });

  // Update draft status
  await db
    .from("email_drafts")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", draftId);

  return { success: true, messageId: result.messageId };
}
