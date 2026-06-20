import { createServiceClient } from "@/lib/integrations/supabase";
import { consumeCredits } from "@/lib/billing/consumption";
import { getVoiceProvider } from "@/lib/voice/provider";
import { evaluateCallCompliance, isOnDncList } from "@/lib/voice/compliance";

export interface PrepareCallInput {
  userId: string;
  leadId?: string | null;
  campaignId?: string | null;
  toPhone: string;
  script: string;
  consentBasis: string;
  localHour?: number | null;
  disclosureGiven?: boolean;
  recordingConsentRequired?: boolean;
  recordingConsentGiven?: boolean;
}

export interface CallTaskResult {
  callTaskId: string;
  status: "queued" | "needs_review";
  blockers: string[];
}

/**
 * Prepare a call: run every compliance gate and persist a call_task. The task is only
 * "queued" (eligible to dial) when all gates pass; otherwise it parks as "needs_review"
 * with the blockers recorded — no call is ever placed from prepare().
 */
export async function prepareCall(input: PrepareCallInput): Promise<CallTaskResult> {
  const db = createServiceClient();

  const onDnc = await isOnDncList({ phone: input.toPhone, userId: input.userId });
  const compliance = evaluateCallCompliance({
    consentBasis: input.consentBasis,
    toPhone: input.toPhone,
    localHour: input.localHour ?? null,
    onDncList: onDnc,
    disclosureGiven: input.disclosureGiven ?? false,
    recordingConsentRequired: input.recordingConsentRequired,
    recordingConsentGiven: input.recordingConsentGiven,
  });

  const status = compliance.allowed ? "queued" : "needs_review";
  const { data: task } = await db
    .from("call_tasks")
    .insert({
      user_id: input.userId,
      lead_id: input.leadId ?? null,
      campaign_id: input.campaignId ?? null,
      to_phone: input.toPhone,
      script: input.script,
      consent_basis: input.consentBasis,
      disclosure_given: input.disclosureGiven ?? false,
      status,
      blockers: compliance.blockers,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return { callTaskId: task?.id ?? "", status, blockers: compliance.blockers };
}

export interface PlaceCallResult {
  success: boolean;
  status: string;
  providerCallId?: string;
  creditsCharged?: number;
  blocked?: string[];
}

/**
 * Place a queued call: re-verify compliance, charge 5 credits (idempotent per task),
 * dial via the configured provider (or mock), and record the attempt.
 */
export async function placeCall(userId: string, callTaskId: string): Promise<PlaceCallResult> {
  const db = createServiceClient();
  const { data: task } = await db
    .from("call_tasks")
    .select("*")
    .eq("id", callTaskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!task) throw new Error("Call task not found.");
  if (task.status === "completed") return { success: true, status: "completed" };

  // Defense-in-depth: re-check compliance immediately before dialing.
  const onDnc = await isOnDncList({ phone: task.to_phone ?? "", userId });
  const compliance = evaluateCallCompliance({
    consentBasis: task.consent_basis ?? null,
    toPhone: task.to_phone ?? null,
    localHour: new Date().getUTCHours(),
    onDncList: onDnc,
    disclosureGiven: task.disclosure_given === true,
  });
  if (!compliance.allowed) {
    await db.from("call_tasks").update({ status: "needs_review", blockers: compliance.blockers }).eq("id", callTaskId);
    return { success: false, status: "needs_review", blocked: compliance.blockers };
  }

  // Charge 5 credits, idempotent per call task.
  const charge = await consumeCredits(userId, "voice_call", {
    idempotencyKey: `voice_call:${callTaskId}`,
    metadata: { callTaskId, leadId: task.lead_id },
  });
  if (!charge.success) {
    await db.from("call_tasks").update({ status: "needs_review", blockers: ["Insufficient credits."] }).eq("id", callTaskId);
    return { success: false, status: "needs_review", blocked: [charge.error ?? "Insufficient credits."] };
  }

  const provider = getVoiceProvider();
  try {
    const handle = await provider.placeCall({
      toPhone: task.to_phone,
      script: task.script ?? "",
      leadName: undefined,
      metadata: { callTaskId },
    });
    await db
      .from("call_tasks")
      .update({
        status: handle.mock ? "mock_placed" : "in_progress",
        provider: provider.name,
        provider_call_id: handle.providerCallId,
        credits_used: charge.cost,
      })
      .eq("id", callTaskId);
    return { success: true, status: handle.mock ? "mock_placed" : "in_progress", providerCallId: handle.providerCallId, creditsCharged: charge.cost };
  } catch (err) {
    await db.from("call_tasks").update({ status: "failed", blockers: [err instanceof Error ? err.message : "Provider error"] }).eq("id", callTaskId);
    throw err;
  }
}

/** Handle a provider webhook with the call result: transcript, recording, outcome. */
export async function handleCallResult(input: {
  providerCallId: string;
  transcript?: string;
  recordingUrl?: string;
  durationSeconds?: number;
  outcome?: string;
}): Promise<{ updated: boolean }> {
  const db = createServiceClient();
  const { data: task } = await db
    .from("call_tasks")
    .select("id")
    .eq("provider_call_id", input.providerCallId)
    .maybeSingle();

  if (!task?.id) return { updated: false };

  await db
    .from("call_tasks")
    .update({
      transcript: input.transcript ?? null,
      recording_url: input.recordingUrl ?? null,
      duration_seconds: input.durationSeconds ?? null,
      outcome: input.outcome ?? "completed",
      status: "completed",
    })
    .eq("id", task.id);

  return { updated: true };
}
