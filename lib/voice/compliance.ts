import { createServiceClient } from "@/lib/integrations/supabase";

// Autonomous calling is heavily regulated (TCPA in the US, plus AI-disclosure rules).
// No call is placed unless every gate passes. These checks are deliberately strict.

export interface CallComplianceInput {
  consentBasis: string | null;
  toPhone: string | null;
  /** Local hour at the callee (0-23). */
  localHour: number | null;
  onDncList: boolean;
  disclosureGiven: boolean;
  recordingConsentRequired?: boolean;
  recordingConsentGiven?: boolean;
}

export interface CallComplianceResult {
  allowed: boolean;
  blockers: string[];
}

// TCPA permits calls 8am–9pm in the recipient's local time.
export const CALL_WINDOW_START_HOUR = 8;
export const CALL_WINDOW_END_HOUR = 21;

const PHONE_RE = /^\+?[1-9]\d{7,14}$/u;

/**
 * Pure call-compliance evaluation (unit-testable). Enforces: a valid phone, a stated
 * consent basis, the legal calling window, DNC scrub, AI disclosure, and recording
 * consent when recording.
 */
export function evaluateCallCompliance(input: CallComplianceInput): CallComplianceResult {
  const blockers: string[] = [];

  if (!input.toPhone || !PHONE_RE.test(input.toPhone.replace(/[\s()-]/gu, ""))) {
    blockers.push("A valid E.164 phone number is required.");
  }
  if (!input.consentBasis || !input.consentBasis.trim()) {
    blockers.push("A consent basis (e.g. prior business relationship) is required.");
  }
  if (input.onDncList) {
    blockers.push("Number is on the do-not-call list.");
  }
  if (input.localHour !== null && (input.localHour < CALL_WINDOW_START_HOUR || input.localHour >= CALL_WINDOW_END_HOUR)) {
    blockers.push(`Outside the permitted calling window (${CALL_WINDOW_START_HOUR}:00–${CALL_WINDOW_END_HOUR}:00 local).`);
  }
  if (!input.disclosureGiven) {
    blockers.push("AI-caller disclosure must be included.");
  }
  if (input.recordingConsentRequired && !input.recordingConsentGiven) {
    blockers.push("Recording consent is required before recording this call.");
  }

  return { allowed: blockers.length === 0, blockers };
}

/** Is this number on the user's / workspace's / global DNC list? */
export async function isOnDncList(input: { phone: string; userId?: string | null; workspaceId?: string | null }): Promise<boolean> {
  const phone = input.phone.replace(/[\s()-]/gu, "");
  if (!phone) return true;
  const db = createServiceClient();
  let query = db.from("dnc_list").select("id").eq("phone", phone).limit(1);
  if (input.userId || input.workspaceId) {
    query = query.or(
      [
        "scope.eq.global",
        input.userId ? `user_id.eq.${input.userId}` : "",
        input.workspaceId ? `workspace_id.eq.${input.workspaceId}` : "",
      ]
        .filter(Boolean)
        .join(",")
    );
  } else {
    query = query.eq("scope", "global");
  }
  const { data } = await query.maybeSingle();
  return !!data;
}
