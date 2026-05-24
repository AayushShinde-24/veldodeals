"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { prepareCampaignSendQueue, sendQueuedCampaignEmails } from "@/src/lib/mvp/email-queue";
import { approveGeneratedEmail, sendGeneratedEmail } from "@/src/lib/mvp/sending";

export async function approveDraftAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("generated_email_id") ?? "");
  const campaignId = String(formData.get("campaign_id") ?? "");
  await approveGeneratedEmail({
    userId: user.id,
    generatedEmailId: id,
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  redirect(`/campaigns/${campaignId}/drafts?approved=1`);
}

export async function sendDraftAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("generated_email_id") ?? "");
  const campaignId = String(formData.get("campaign_id") ?? "");
  await sendGeneratedEmail({ userId: user.id, generatedEmailId: id });
  redirect(`/campaigns/${campaignId}/drafts?sent=1`);
}

export async function queueCampaignAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const campaignId = String(formData.get("campaign_id") ?? "");
  try {
    await prepareCampaignSendQueue({ userId: user.id, campaignId });
  } catch (error) {
    redirect(`/campaigns/${campaignId}/drafts?error=${encodeURIComponent(error instanceof Error ? error.message : "Queue failed")}`);
  }
  redirect(`/campaigns/${campaignId}/drafts?queued=1`);
}

export async function sendQueuedCampaignAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const campaignId = String(formData.get("campaign_id") ?? "");
  try {
    await sendQueuedCampaignEmails({ userId: user.id, campaignId, limit: 5 });
  } catch (error) {
    redirect(`/campaigns/${campaignId}/drafts?error=${encodeURIComponent(error instanceof Error ? error.message : "Send failed")}`);
  }
  redirect(`/campaigns/${campaignId}/drafts?sent_queued=1`);
}
