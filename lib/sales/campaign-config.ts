import "server-only";
import { targetOutcomeRates } from "@/lib/revenue-os/pricing";

// ─────────────────────────────────────────────────────────
// Sales campaign configuration. The wizard writes this shape into
// campaigns.icp_json; the send worker and detail page read it back.
// ─────────────────────────────────────────────────────────

export interface SequenceStep {
  /** What this touch should accomplish — the writer agent turns it into copy. */
  goal: string;
  /** Days to wait after the previous step. Ignored on step 1. */
  waitDays: number;
}

export interface SendingConfig {
  dailyCap: number;
  windowStart: string; // "09:00"
  windowEnd: string; // "17:00"
  timezone: string;
  verify: boolean;
  sender: "managed" | "gmail";
}

export interface CampaignEstimate {
  contacts: number;
  credits: {
    verify: number;
    write: number;
    send: number;
    followups: number;
    total: number;
  };
  /** Result ranges shown to the user (already conservative). */
  shown: {
    repliesLo: number;
    repliesHi: number;
    meetingsLo: number;
    meetingsHi: number;
  };
}

export interface SalesCampaignConfig {
  description?: string;
  audienceSummary?: string;
  audienceSource?: "veldo_ai" | "crm";
  sequence: SequenceStep[];
  sending: SendingConfig;
  estimate?: CampaignEstimate;
  stagedCount?: number;
}

export const DEFAULT_SENDING: SendingConfig = {
  dailyCap: 50,
  windowStart: "09:00",
  windowEnd: "17:00",
  timezone: "America/New_York",
  verify: true,
  sender: "managed",
};

export const MAX_SEQUENCE_STEPS = 4;

/** Read the wizard config back off a campaign row's icp_json. */
export function readCampaignConfig(icpJson: unknown): SalesCampaignConfig {
  const raw = (icpJson ?? {}) as Record<string, unknown>;
  const sequence = Array.isArray(raw.sequence)
    ? (raw.sequence as SequenceStep[]).slice(0, MAX_SEQUENCE_STEPS).map((s) => ({
        goal: String(s?.goal ?? ""),
        waitDays: clampInt(Number(s?.waitDays), 3, 1, 30),
      }))
    : [];
  const sending = { ...DEFAULT_SENDING, ...((raw.sending ?? {}) as Partial<SendingConfig>) };
  return {
    description: typeof raw.description === "string" ? raw.description : undefined,
    audienceSummary: typeof raw.audienceSummary === "string" ? raw.audienceSummary : undefined,
    audienceSource: raw.audienceSource === "crm" ? "crm" : raw.audienceSource === "veldo_ai" ? "veldo_ai" : undefined,
    sequence: sequence.length ? sequence : [{ goal: "Introduce the offer and ask for a quick call", waitDays: 0 }],
    sending: {
      dailyCap: clampInt(Number(sending.dailyCap), DEFAULT_SENDING.dailyCap, 1, 500),
      windowStart: normalizeTime(sending.windowStart, DEFAULT_SENDING.windowStart),
      windowEnd: normalizeTime(sending.windowEnd, DEFAULT_SENDING.windowEnd),
      timezone: typeof sending.timezone === "string" && sending.timezone ? sending.timezone : DEFAULT_SENDING.timezone,
      verify: sending.verify !== false,
      sender: sending.sender === "gmail" ? "gmail" : "managed",
    },
    estimate: raw.estimate as CampaignEstimate | undefined,
    stagedCount: typeof raw.stagedCount === "number" ? raw.stagedCount : undefined,
  };
}

// ── Launch economics ──────────────────────────────────────

// Internal estimate factor: the UI always shows a deliberately conservative
// share of the modeled outcome so real results tend to beat the promise.
const SHOWN_RESULT_FACTOR = 0.7;

/** Itemized credit cost for launching a campaign. Mirrors creditCosts in pricing.ts. */
export function itemizeLaunchCost(contacts: number, steps: number, verify: boolean) {
  const verifyCredits = verify ? contacts : 0; // email_verify = 1/contact
  const writeCredits = contacts; // email_write = 1/contact
  const sendCredits = contacts; // email_send = 1/contact (step 1)
  const followupCredits = steps > 1 ? contacts * 3 : 0; // followup bundle = 3/contact
  return {
    verify: verifyCredits,
    write: writeCredits,
    send: sendCredits,
    followups: followupCredits,
    total: verifyCredits + writeCredits + sendCredits + followupCredits,
  };
}

/**
 * Model expected outcomes for a campaign and return only the ranges the UI is
 * allowed to show. The internal model and the shown/internal ratio never leave
 * the server.
 */
export function estimateCampaignResults(contacts: number, steps: number): CampaignEstimate["shown"] {
  const touchLift = Math.min(1.6, 1 + 0.2 * (steps - 1));
  const internalReplies = contacts * (targetOutcomeRates.replyRatePct / 100) * touchLift;
  const internalMeetings = contacts * (targetOutcomeRates.meetingRatePct / 100) * touchLift;

  const shownReplies = internalReplies * SHOWN_RESULT_FACTOR;
  const shownMeetings = internalMeetings * SHOWN_RESULT_FACTOR;

  return {
    repliesLo: Math.max(0, Math.floor(shownReplies * 0.75)),
    repliesHi: Math.max(1, Math.ceil(shownReplies * 1.25)),
    meetingsLo: Math.max(0, Math.floor(shownMeetings * 0.75)),
    meetingsHi: Math.max(1, Math.ceil(shownMeetings * 1.25)),
  };
}

export function buildEstimate(contacts: number, steps: number, verify: boolean): CampaignEstimate {
  return {
    contacts,
    credits: itemizeLaunchCost(contacts, steps, verify),
    shown: estimateCampaignResults(contacts, steps),
  };
}

// ── Send-window helpers (used by the worker) ─────────────

/** Current "HH:MM" in a timezone, tolerant of bad tz strings. */
export function localTimeHHMM(timezone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  }
}

export function isWithinSendWindow(sending: SendingConfig, now: Date = new Date()): boolean {
  const current = localTimeHHMM(sending.timezone, now);
  return current >= sending.windowStart && current <= sending.windowEnd;
}

function clampInt(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeTime(value: unknown, fallback: string): string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}
