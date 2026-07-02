import { createServiceClient } from "@/lib/integrations/supabase";
import { consumeCredits } from "@/lib/billing/consumption";
import { checkSendCompliance } from "@/src/lib/mvp/compliance";
import { getConnectedGoogleAccessToken } from "@/src/lib/apis/google/connected-account";
import { sendGmailMessage } from "@/src/lib/apis/google/gmail-client";
import { appendComplianceFooter, buildUnsubscribeLink } from "@/src/lib/mvp/unsubscribe";

// Days to wait before each follow-up step (index 0 = gap before follow-up #1).
export const STEP_DELAYS_DAYS = [3, 4, 5, 6, 7];

export interface StopSignals {
  replied: boolean;
  unsubscribed: boolean;
  meetingBooked: boolean;
  leadStage: string | null;
}

const STOP_STAGES = ["meeting_booked", "won", "closed_won", "demo_done", "negotiation", "proposal_sent"];

/** Pure: should the sequence stop, and why? */
export function evaluateStop(signals: StopSignals): { stop: boolean; reason: string | null } {
  if (signals.replied) return { stop: true, reason: "replied" };
  if (signals.unsubscribed) return { stop: true, reason: "unsubscribed" };
  if (signals.meetingBooked) return { stop: true, reason: "meeting_booked" };
  if (signals.leadStage && STOP_STAGES.includes(signals.leadStage)) return { stop: true, reason: `stage_${signals.leadStage}` };
  return { stop: false, reason: null };
}

/** Pure: when is the next step due after sending `stepJustSent` (0=initial)? null = done. */
export function planNextSendAt(stepJustSent: number, totalSteps: number, from: Date = new Date()): Date | null {
  if (stepJustSent >= totalSteps) return null;
  const delayDays = STEP_DELAYS_DAYS[Math.min(stepJustSent, STEP_DELAYS_DAYS.length - 1)];
  return new Date(from.getTime() + delayDays * 24 * 60 * 60 * 1000);
}

/** Pure: the credit action for a follow-up bundle (3 follow-ups = 2 credits, 5 = 3). */
export function followupBundleAction(totalSteps: number): string {
  return totalSteps <= 3 ? "followup_3" : "followup_5";
}

/**
 * Start a follow-up sequence for a lead. Charges the follow-up bundle up front
 * (idempotent per lead+campaign) and schedules the first follow-up.
 */
export async function startSequence(input: {
  userId: string;
  campaignId: string;
  leadId: string;
  generatedEmailId?: string | null;
  totalSteps?: number;
}): Promise<{ started: boolean; reason?: string }> {
  const totalSteps = Math.min(5, Math.max(1, input.totalSteps ?? 3));
  const charge = await consumeCredits(input.userId, followupBundleAction(totalSteps), {
    idempotencyKey: `sequence:${input.campaignId}:${input.leadId}`,
    metadata: { campaignId: input.campaignId, leadId: input.leadId, totalSteps },
  });
  if (!charge.success) return { started: false, reason: charge.error ?? "Insufficient credits for follow-ups." };

  const db = createServiceClient();
  await db.from("email_sequences").upsert(
    {
      user_id: input.userId,
      campaign_id: input.campaignId,
      lead_id: input.leadId,
      generated_email_id: input.generatedEmailId ?? null,
      total_steps: totalSteps,
      current_step: 0,
      status: "active",
      next_send_at: planNextSendAt(0, totalSteps)?.toISOString() ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,campaign_id,lead_id" }
  );
  return { started: true };
}

/** Cron worker: advance every due sequence — stop if signaled, else send the next step. */
export async function advanceSequences(limit = 25): Promise<{ advanced: number; stopped: number; completed: number; skipped: number }> {
  const db = createServiceClient();
  const nowIso = new Date().toISOString();
  const { data: due } = await db
    .from("email_sequences")
    .select("*")
    .eq("status", "active")
    .lte("next_send_at", nowIso)
    .order("next_send_at", { ascending: true })
    .limit(limit);

  let advanced = 0;
  let stopped = 0;
  let completed = 0;
  let skipped = 0;

  for (const seq of due ?? []) {
    try {
      const signals = await gatherStopSignals(db, seq.user_id, seq.lead_id, seq.created_at);
      const decision = evaluateStop(signals);
      if (decision.stop) {
        await db.from("email_sequences").update({ status: "stopped", stop_reason: decision.reason, updated_at: nowIso }).eq("id", seq.id);
        stopped += 1;
        continue;
      }

      const nextStep = (seq.current_step ?? 0) + 1; // 1-based follow-up number
      const sent = await sendSequenceStep(db, seq, nextStep);
      if (!sent) { skipped += 1; continue; }

      const nextAt = planNextSendAt(nextStep, seq.total_steps ?? 3);
      await db
        .from("email_sequences")
        .update({
          current_step: nextStep,
          last_sent_at: nowIso,
          next_send_at: nextAt?.toISOString() ?? null,
          status: nextAt ? "active" : "completed",
          updated_at: nowIso,
        })
        .eq("id", seq.id);
      if (nextAt) advanced += 1;
      else completed += 1;
    } catch {
      skipped += 1;
    }
  }

  return { advanced, stopped, completed, skipped };
}

async function gatherStopSignals(
  db: ReturnType<typeof createServiceClient>,
  userId: string,
  leadId: string | null,
  since: string
): Promise<StopSignals> {
  if (!leadId) return { replied: false, unsubscribed: false, meetingBooked: false, leadStage: null };
  const [replies, meetings, lead] = await Promise.all([
    db.from("email_replies").select("id").eq("user_id", userId).eq("lead_id", leadId).gte("created_at", since).limit(1).maybeSingle(),
    db.from("meetings").select("id").eq("user_id", userId).eq("lead_id", leadId).limit(1).maybeSingle(),
    db.from("leads").select("stage, email").eq("id", leadId).eq("user_id", userId).maybeSingle(),
  ]);
  let unsubscribed = false;
  if (lead.data?.email) {
    const { data: unsub } = await db.from("unsubscribes").select("id").eq("user_id", userId).eq("email", String(lead.data.email).toLowerCase()).maybeSingle();
    unsubscribed = !!unsub;
  }
  return {
    replied: !!replies.data,
    unsubscribed,
    meetingBooked: !!meetings.data,
    leadStage: (lead.data?.stage as string) ?? null,
  };
}

async function sendSequenceStep(
  db: ReturnType<typeof createServiceClient>,
  seq: Record<string, unknown>,
  stepNumber: number
): Promise<boolean> {
  const userId = seq.user_id as string;
  const leadId = seq.lead_id as string | null;
  if (!leadId) return false;

  const { data: lead } = await db.from("leads").select("email").eq("id", leadId).maybeSingle();
  const toEmail = lead?.email as string | undefined;
  if (!toEmail) return false;

  // Compliance + suppression + limits all enforced here.
  const compliance = await checkSendCompliance(userId, toEmail);
  if (!compliance.allowed) return false;

  const { data: gen } = await db
    .from("generated_emails")
    .select("subject, follow_up_1, follow_up_2, follow_up_3")
    .eq("id", seq.generated_email_id as string)
    .maybeSingle();
  const body = (gen?.[`follow_up_${stepNumber}` as keyof typeof gen] as string | undefined) ?? gen?.follow_up_1;
  if (!body) return false;

  const { accessToken } = await getConnectedGoogleAccessToken(userId);
  const unsubscribeUrl = buildUnsubscribeLink(toEmail, userId);
  const htmlBody = appendComplianceFooter({ body, email: toEmail, userId, unsubscribeLink: unsubscribeUrl });

  const result = await sendGmailMessage({
    accessToken,
    to: toEmail,
    subject: `Re: ${gen?.subject ?? "Following up"}`,
    htmlBody,
    listUnsubscribeUrl: unsubscribeUrl,
  });

  await db.from("email_sends").insert({
    user_id: userId,
    campaign_id: seq.campaign_id,
    lead_id: leadId,
    generated_email_id: seq.generated_email_id,
    to_email: toEmail,
    provider: `followup_${stepNumber}`,
    gmail_message_id: result.messageId,
    status: "sent",
    sent_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });
  return true;
}
