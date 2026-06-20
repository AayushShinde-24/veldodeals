import { createServiceClient } from "@/lib/integrations/supabase";

export interface QueuedEmail {
  id: string;
  userId: string;
  draftId: string;
  leadId: string;
  campaignId: string;
  status: "queued" | "sending" | "sent" | "failed" | "cancelled";
  scheduledAt: string | null;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export async function enqueueEmail(
  userId: string,
  draftId: string,
  leadId: string,
  campaignId: string,
  scheduledAt?: Date
): Promise<QueuedEmail> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("email_queue")
    .insert({
      user_id: userId,
      draft_id: draftId,
      lead_id: leadId,
      campaign_id: campaignId,
      status: "queued",
      scheduled_at: scheduledAt?.toISOString() ?? null,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`Failed to queue email: ${error?.message}`);
  return mapQueuedEmail(data);
}

export async function getQueuedEmails(
  userId: string,
  campaignId?: string
): Promise<QueuedEmail[]> {
  const db = createServiceClient();
  let q = db.from("email_queue").select("*").eq("user_id", userId).eq("status", "queued");
  if (campaignId) q = q.eq("campaign_id", campaignId);
  const { data } = await q.order("created_at", { ascending: true }).limit(100);
  return (data ?? []).map(mapQueuedEmail);
}

export async function markEmailSent(queueId: string): Promise<void> {
  const db = createServiceClient();
  await db
    .from("email_queue")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", queueId);
}

export async function markEmailFailed(queueId: string, errorMessage: string): Promise<void> {
  const db = createServiceClient();
  await db
    .from("email_queue")
    .update({ status: "failed", error_message: errorMessage })
    .eq("id", queueId);
}

export async function prepareCampaignSendQueue(
  userIdOrOptions: string | { userId: string; campaignId: string; mode?: string; taskId?: string },
  campaignId?: string
): Promise<{ queued: number; skipped: number }> {
  const userId = typeof userIdOrOptions === "string" ? userIdOrOptions : userIdOrOptions.userId;
  const cid = typeof userIdOrOptions === "string" ? (campaignId ?? "") : userIdOrOptions.campaignId;
  const db = createServiceClient();
  const { data: approvedDrafts } = await db
    .from("generated_emails")
    .select("id, lead_id")
    .eq("user_id", userId)
    .eq("campaign_id", cid)
    .eq("approval_status", "approved")
    .eq("status", "approved");

  let queued = 0;
  let skipped = 0;

  for (const draft of approvedDrafts ?? []) {
    const { data: existing } = await db
      .from("email_queue")
      .select("id")
      .eq("draft_id", draft.id)
      .maybeSingle();
    if (existing) { skipped++; continue; }
    const { error } = await db.from("email_queue").insert({
      user_id: userId,
      draft_id: draft.id,
      lead_id: draft.lead_id,
      campaign_id: cid,
      status: "queued",
      created_at: new Date().toISOString(),
    });
    if (!error) queued++;
    else skipped++;
  }

  return { queued, skipped };
}

export async function sendQueuedCampaignEmails(
  userIdOrOptions: string | { userId: string; campaignId: string; limit?: number; taskId?: string },
  campaignId?: string
): Promise<{ sent: number; failed: number }> {
  const userId = typeof userIdOrOptions === "string" ? userIdOrOptions : userIdOrOptions.userId;
  const cid2 = typeof userIdOrOptions === "string" ? (campaignId ?? "") : userIdOrOptions.campaignId;
  const limit = typeof userIdOrOptions === "object" ? (userIdOrOptions.limit ?? 20) : 20;
  const queued = await getQueuedEmails(userId, cid2);
  let sent = 0;
  let failed = 0;

  for (const item of queued.slice(0, limit)) {
    try {
      const { sendApprovedDraft } = await import("@/src/lib/mvp/sending");
      const result = await sendApprovedDraft(userId, item.draftId);
      if (result.success) { await markEmailSent(item.id); sent++; }
      else { await markEmailFailed(item.id, result.blocked?.join("; ") ?? "blocked"); failed++; }
    } catch (err) {
      await markEmailFailed(item.id, err instanceof Error ? err.message : "send failed");
      failed++;
    }
  }

  return { sent, failed };
}

function mapQueuedEmail(row: Record<string, unknown>): QueuedEmail {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    draftId: row.draft_id as string,
    leadId: row.lead_id as string,
    campaignId: row.campaign_id as string,
    status: (row.status as QueuedEmail["status"]) ?? "queued",
    scheduledAt: (row.scheduled_at as string) ?? null,
    sentAt: (row.sent_at as string) ?? null,
    errorMessage: (row.error_message as string) ?? null,
    createdAt: row.created_at as string,
  };
}
