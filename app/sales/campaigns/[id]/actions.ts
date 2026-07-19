"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import { createServiceClient } from "@/lib/integrations/supabase";
import { launchCampaign } from "@/lib/sales/launch";
import { processCampaignSends } from "@/lib/sales/send-worker";
import { generateStructured } from "@/lib/agents/structured";
import { readCampaignConfig } from "@/lib/sales/campaign-config";

// Server actions for the campaign detail page. Status changes, the launch
// gate for saved drafts, draft copy edits, and a manual queue kick — all real
// mutations against the workspace's rows.

async function requireUserCampaign(campaignId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = createServiceClient();
  const { data: campaign } = await db
    .from("campaigns")
    .select("id,user_id,name,status,goal,product_offer,icp_json")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!campaign) redirect("/sales/campaigns");
  return { user, db, campaign };
}

export async function setCampaignStatusAction(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!campaignId || !["running", "paused"].includes(status)) return;
  const { db, campaign } = await requireUserCampaign(campaignId);
  // Only flip between running and paused — drafts launch through the gate.
  if (campaign.status !== "running" && campaign.status !== "paused") return;
  await db.from("campaigns").update({ status, updated_at: new Date().toISOString() }).eq("id", campaignId);
  revalidatePath(`/sales/campaigns/${campaignId}`);
}

export async function launchDraftAction(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  if (!campaignId) return;
  const { user } = await requireUserCampaign(campaignId);
  const result = await launchCampaign(user.id, campaignId);
  if (!result.ok) {
    redirect(`/sales/campaigns/${campaignId}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/sales/campaigns/${campaignId}?launched=1`);
}

/** Process this campaign's due sends right now instead of waiting for the scheduler. */
export async function processQueueAction(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  if (!campaignId) return;
  const { user } = await requireUserCampaign(campaignId);
  const result = await processCampaignSends({ userId: user.id, campaignId, limit: 10 });
  const note = `sent ${result.sent}, skipped ${result.skipped}, waiting ${result.deferred}${result.failed ? `, failed ${result.failed}` : ""}`;
  redirect(`/sales/campaigns/${campaignId}?processed=${encodeURIComponent(note)}`);
}

/** Pre-write copy for upcoming queued sends so it can be reviewed/edited before the send slot. */
export async function prepareDraftsAction(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  if (!campaignId) return;
  const { user, db, campaign } = await requireUserCampaign(campaignId);
  const config = readCampaignConfig(campaign.icp_json);

  const { data: queued } = await db
    .from("email_sends")
    .select("id,lead_id,provider,generated_email_id")
    .eq("user_id", user.id)
    .eq("campaign_id", campaignId)
    .eq("status", "queued")
    .is("generated_email_id", null)
    .order("scheduled_at", { ascending: true })
    .limit(5);

  for (const send of queued ?? []) {
    if (!send.lead_id) continue;
    const { data: lead } = await db
      .from("leads")
      .select("id,first_name,title,company")
      .eq("id", send.lead_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!lead) continue;
    const stepMatch = /^step_(\d+)$/.exec(send.provider ?? "");
    const step = stepMatch ? Number(stepMatch[1]) : 1;
    const stepGoal = config.sequence[step - 1]?.goal ?? "Follow up briefly.";

    try {
      const { data } = await generateStructured<{ subject: string; body: string }>({
        system:
          "You are an elite B2B outbound email writer. Write a short, specific, non-salesy email (60-110 words) that earns a reply. Use only facts provided — never invent metrics, names, or events. One clear CTA.",
        prompt: [
          `Sequence step: ${step} of ${config.sequence.length}`,
          `Step goal: ${stepGoal}`,
          `Recipient: ${lead.first_name ?? "there"}${lead.title ? `, ${lead.title}` : ""}${lead.company ? ` at ${lead.company}` : ""}`,
          campaign.product_offer ? `Offer: ${campaign.product_offer}` : "",
          campaign.goal ? `Campaign goal: ${campaign.goal}` : "",
          `Return JSON: { "subject": string, "body": string }`,
        ]
          .filter(Boolean)
          .join("\n"),
        tier: "deep",
        maxTokens: 700,
      });
      const subject = (data.subject ?? "").trim();
      const body = (data.body ?? "").trim();
      if (!subject || !body) continue;
      const { data: inserted } = await db
        .from("generated_emails")
        .insert({
          user_id: user.id,
          campaign_id: campaignId,
          lead_id: lead.id,
          subject,
          subject_1: subject,
          body,
          email_body: body,
          status: "generated",
          approval_status: "pending",
          safety_status: "not_checked",
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (inserted?.id) {
        await db.from("email_sends").update({ generated_email_id: inserted.id }).eq("id", send.id);
      }
    } catch {
      // A failed generation just means this send falls back to write-at-send-time.
    }
  }
  redirect(`/sales/campaigns/${campaignId}?tab=drafts&prepared=1`);
}

export async function saveDraftEditAction(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  const draftId = String(formData.get("draft_id") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!campaignId || !draftId || !subject || !body) return;
  const { user, db } = await requireUserCampaign(campaignId);
  await db
    .from("generated_emails")
    .update({ edited_subject: subject, edited_body: body, approval_status: "approved", approved_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("user_id", user.id)
    .eq("campaign_id", campaignId);
  redirect(`/sales/campaigns/${campaignId}?tab=drafts&saved=1`);
}

/** Remove a contact whose sends haven't gone out yet. */
export async function removeContactAction(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  const leadId = String(formData.get("lead_id") ?? "");
  if (!campaignId || !leadId) return;
  const { user, db } = await requireUserCampaign(campaignId);

  const { data: sentAlready } = await db
    .from("email_sends")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("lead_id", leadId)
    .eq("status", "sent")
    .limit(1)
    .maybeSingle();
  if (sentAlready) {
    redirect(`/sales/campaigns/${campaignId}?tab=contacts&error=${encodeURIComponent("Already contacted — can't remove.")}`);
  }

  await db.from("email_sends").delete().eq("campaign_id", campaignId).eq("lead_id", leadId).eq("user_id", user.id).in("status", ["queued", "sending"]);
  await db.from("leads").update({ campaign_id: null, updated_at: new Date().toISOString() }).eq("id", leadId).eq("user_id", user.id);
  redirect(`/sales/campaigns/${campaignId}?tab=contacts&removed=1`);
}
