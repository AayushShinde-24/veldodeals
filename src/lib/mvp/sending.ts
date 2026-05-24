import "server-only";

import { createServiceClient } from "@/lib/integrations/supabase";
import { assertCreditsAvailable, recordCreditUsage } from "@/lib/billing/credits";
import { getConnectedGoogleAccessToken } from "@/src/lib/apis/google/connected-account";
import { sendGmailMessage } from "@/src/lib/apis/google/gmail-client";
import { assertComplianceReady } from "@/src/lib/mvp/compliance";
import { logMvpError } from "@/src/lib/mvp/error-log";
import { assertCanSendByUsage, incrementUsage } from "@/src/lib/mvp/usage";
import { appendComplianceFooter, buildUnsubscribeLink, hasComplianceFooter, isUnsubscribed } from "@/src/lib/mvp/unsubscribe";
import { ensureDefaultWorkspace } from "@/src/lib/workspace/context";
import { runGeneratedEmailSafetyCheck } from "@/src/lib/mvp/email-queue";

export async function approveGeneratedEmail(input: { userId: string; generatedEmailId: string; subject?: string; body?: string }) {
  const db = createServiceClient();
  const { data: email, error } = await db
    .from("generated_emails")
    .select("*")
    .eq("id", input.generatedEmailId)
    .eq("user_id", input.userId)
    .single();
  if (error || !email) throw new Error("Generated email not found.");

  const update = {
    status: "approved",
    edited_subject: input.subject || email.subject,
    edited_body: input.body || email.body,
  };
  const { data, error: updateError } = await db
    .from("generated_emails")
    .update(update)
    .eq("id", input.generatedEmailId)
    .select("*")
    .single();
  if (updateError) throw new Error(updateError.message);
  return data;
}

export async function sendGeneratedEmail(input: { userId: string; generatedEmailId: string }) {
  const db = createServiceClient();
  const { data: generated, error } = await db
    .from("generated_emails")
    .select("*, leads(*), campaigns(*)")
    .eq("id", input.generatedEmailId)
    .eq("user_id", input.userId)
    .single();
  if (error || !generated) throw new Error("Generated email not found.");

  const lead = Array.isArray(generated.leads) ? generated.leads[0] : generated.leads;
  const campaign = Array.isArray(generated.campaigns) ? generated.campaigns[0] : generated.campaigns;
  const campaignId = String(generated.campaign_id);
  const leadId = String(generated.lead_id);

  const baseSendRecord = {
    user_id: input.userId,
    campaign_id: campaignId,
    lead_id: leadId,
    generated_email_id: input.generatedEmailId,
    provider: "gmail",
  };

  try {
    if (generated.status !== "approved") throw new Error("User approval is required before sending.");
    const safety = await runGeneratedEmailSafetyCheck({
      userId: input.userId,
      generatedEmailId: input.generatedEmailId,
      campaignId,
      mode: String(campaign?.sending_mode) === "auto_send" ? "auto_send" : "approval_required",
      requireConnectedAccount: true,
    });
    if (!safety.passed) throw new Error(safety.issues.join(" "));
    const compliance = await assertComplianceReady(input.userId, campaignId);
    if (!lead?.email) throw new Error("Lead email is required.");
    if (await isUnsubscribed({ userId: input.userId, email: String(lead.email) })) {
      await db.from("email_sends").insert({ ...baseSendRecord, status: "blocked_unsubscribed", failure_reason: "Lead unsubscribed." });
      throw new Error("Lead is unsubscribed.");
    }
    await assertCanSendByUsage(input.userId);
    await assertCreditsAvailable({ userId: input.userId, action: "email_send" });
    if (!["ready_to_send", "sending"].includes(String(campaign?.status))) {
      throw new Error("Campaign must be ready_to_send or sending.");
    }

    const workspaceId = String(campaign.workspace_id ?? (await ensureDefaultWorkspace(input.userId)).workspaceId);
    const google = await getConnectedGoogleAccessToken(workspaceId, "gmail");
    const subject = String(generated.edited_subject || generated.subject);
    const rawBody = String(generated.edited_body || generated.body);
    const bodyWithFooter = appendComplianceFooter({
      body: rawBody,
      compliance,
      unsubscribeLink: buildUnsubscribeLink({ email: String(lead.email), campaignId }),
    });
    if (!hasComplianceFooter(bodyWithFooter)) throw new Error("Email compliance footer is missing.");

    await db.from("campaigns").update({ status: "sending" }).eq("id", campaignId);
    const sent = await sendGmailMessage({
      accessToken: google.accessToken,
      to: String(lead.email),
      subject,
      body: bodyWithFooter,
    });
    const accounting = await recordCreditUsage({
      userId: input.userId,
      workspaceId,
      campaignId,
      leadId,
      action: "email_send",
      metadata: { provider: "gmail", provider_message_id: sent.id, generated_email_id: input.generatedEmailId },
    });
    const { data: sendRecord, error: sendError } = await db.from("email_sends").insert({
      ...baseSendRecord,
      workspace_id: workspaceId,
      provider_message_id: sent.id,
      status: "sent",
      sent_at: new Date().toISOString(),
      credits_used: accounting.creditsUsed,
    }).select("*").single();
    if (sendError) throw new Error(sendError.message);
    await db.from("generated_emails").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", input.generatedEmailId);
    await db.from("leads").update({ status: "sent", stage: "sent" }).eq("id", leadId);
    await incrementUsage(input.userId, "emails_sent", 1);
    return sendRecord;
  } catch (sendError) {
    const reason = sendError instanceof Error ? sendError.message : "Send failed.";
    const status = reason.includes("compliance") || reason.includes("Complete compliance") ? "blocked_compliance" :
      reason.includes("limit") ? "blocked_limit" :
        reason.includes("unsubscribed") ? "blocked_unsubscribed" : "failed";
    await db.from("email_sends").insert({ ...baseSendRecord, status, failure_reason: reason });
    await logMvpError({ userId: input.userId, campaignId, source: "gmail", errorCode: status, error: sendError });
    throw sendError;
  }
}
