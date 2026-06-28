export const targetOutcomeRates = {
  meetingRatePct: 3.5,
  emailDealRatePct: 0.8,
  replyRatePct: 12,
  deliverabilityPct: 97,
  icpFitThreshold: 50,
  researchConfidenceThreshold: 60,
  emailScoreThreshold: 75,
};

export interface RevenuePlan {
  key: string;
  name: string;
  description: string;
  audience: "solo" | "team" | "enterprise";
  priceMonthlyUsd: number | null;
  monthlyCredits: number | null;
  hyperPersonalizationUsd: number | null;
  addOnUsd: number | null;
  memberLimit: number | null;
  expectedUserSharePct: number;
  maxCampaigns: number;
  maxMailboxes: number;
  maxTeamSeats: number;
  /** Veldo takes a % of every deal closed through it, on every tier. */
  dealFeePct: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Pricing model. Three tiers — Solo, Team, Enterprise — each with three plans.
// Solo plans bill a private balance (1 seat). Team plans pool credits across
// 1–10 seats. Enterprise plans pool org-wide; Custom Enterprise is pay-as-you-go.
// All tiers carry the 2.5% deal-close commission. This is the single source of
// truth shared by the storefront (/pricing), the dashboard, billing, and Stripe.
// ─────────────────────────────────────────────────────────────────────────
export const plans = {
  // ── Solo (your own private credit balance) ──
  solo_launch: {
    key: "solo_launch",
    name: "Launch",
    description: "For founders getting their first pipeline moving. Your own private credit balance.",
    audience: "solo",
    priceMonthlyUsd: 199,
    monthlyCredits: 2000,
    hyperPersonalizationUsd: null,
    addOnUsd: null,
    memberLimit: 1,
    expectedUserSharePct: 18,
    maxCampaigns: 3,
    maxMailboxes: 1,
    maxTeamSeats: 1,
    dealFeePct: 2.5,
  },
  solo_momentum: {
    key: "solo_momentum",
    name: "Momentum",
    description: "Double the volume and find your rhythm as a solo operator.",
    audience: "solo",
    priceMonthlyUsd: 399,
    monthlyCredits: 4000,
    hyperPersonalizationUsd: null,
    addOnUsd: null,
    memberLimit: 1,
    expectedUserSharePct: 14,
    maxCampaigns: 6,
    maxMailboxes: 2,
    maxTeamSeats: 1,
    dealFeePct: 2.5,
  },
  solo_velocity: {
    key: "solo_velocity",
    name: "Velocity",
    description: "Go all-out as a one-person revenue team.",
    audience: "solo",
    priceMonthlyUsd: 699,
    monthlyCredits: 8000,
    hyperPersonalizationUsd: null,
    addOnUsd: null,
    memberLimit: 1,
    expectedUserSharePct: 10,
    maxCampaigns: 12,
    maxMailboxes: 3,
    maxTeamSeats: 1,
    dealFeePct: 2.5,
  },
  // ── Team (credits pooled across 1–10 seats) ──
  team_crew: {
    key: "team_crew",
    name: "Crew",
    description: "Your first shared revenue engine. Credits pooled across 1–10 seats.",
    audience: "team",
    priceMonthlyUsd: 999,
    monthlyCredits: 10000,
    hyperPersonalizationUsd: 199,
    addOnUsd: null,
    memberLimit: 10,
    expectedUserSharePct: 12,
    maxCampaigns: -1,
    maxMailboxes: 6,
    maxTeamSeats: 10,
    dealFeePct: 2.5,
  },
  team_engine: {
    key: "team_engine",
    name: "Engine",
    description: "Replace 1–2 SDRs. Credits pooled across 1–10 seats.",
    audience: "team",
    priceMonthlyUsd: 2499,
    monthlyCredits: 25000,
    hyperPersonalizationUsd: 399,
    addOnUsd: null,
    memberLimit: 10,
    expectedUserSharePct: 8,
    maxCampaigns: -1,
    maxMailboxes: 10,
    maxTeamSeats: 10,
    dealFeePct: 2.5,
  },
  team_powerhouse: {
    key: "team_powerhouse",
    name: "Powerhouse",
    description: "A full revenue team on autopilot. Credits pooled across 1–10 seats.",
    audience: "team",
    priceMonthlyUsd: 4999,
    monthlyCredits: 55000,
    hyperPersonalizationUsd: 799,
    addOnUsd: null,
    memberLimit: 10,
    expectedUserSharePct: 6,
    maxCampaigns: -1,
    maxMailboxes: 15,
    maxTeamSeats: 10,
    dealFeePct: 2.5,
  },
  // ── Enterprise (org-scale pools; Custom is pay-as-you-go) ──
  enterprise_scale: {
    key: "enterprise_scale",
    name: "Scale",
    description: "Done-for-you outbound at org scale. Shared across 1–200 seats.",
    audience: "enterprise",
    priceMonthlyUsd: 9999,
    monthlyCredits: 105000,
    hyperPersonalizationUsd: null,
    addOnUsd: null,
    memberLimit: 200,
    expectedUserSharePct: 4,
    maxCampaigns: -1,
    maxMailboxes: -1,
    maxTeamSeats: 200,
    dealFeePct: 2.5,
  },
  enterprise_apex: {
    key: "enterprise_apex",
    name: "Apex",
    description: "Maximum reach, multi-region, shared across your whole org.",
    audience: "enterprise",
    priceMonthlyUsd: 19999,
    monthlyCredits: 220000,
    hyperPersonalizationUsd: null,
    addOnUsd: null,
    memberLimit: 200,
    expectedUserSharePct: 3,
    maxCampaigns: -1,
    maxMailboxes: -1,
    maxTeamSeats: 200,
    dealFeePct: 2.5,
  },
  enterprise_custom: {
    key: "enterprise_custom",
    name: "Custom Enterprise",
    description: "Unlimited scale, pay-as-you-go API: $20/seat + $0.12/credit ($0.15 hyper-personalized).",
    audience: "enterprise",
    priceMonthlyUsd: null,
    monthlyCredits: null,
    hyperPersonalizationUsd: null,
    addOnUsd: null,
    memberLimit: -1,
    expectedUserSharePct: 2,
    maxCampaigns: -1,
    maxMailboxes: -1,
    maxTeamSeats: -1,
    dealFeePct: 2.5,
  },
} as const satisfies Record<string, RevenuePlan>;

/** Custom-API per-seat fee (enhanced security; data not used to train models). */
export const CUSTOM_API_SEAT_USD = 20;
/** Custom-API extra security + delivery, per seat. */
export const CUSTOM_API_SECURITY_SEAT_USD = 14;

/** Add-on credits: sold in 1,000-credit increments, $1,000/yr → $200,000/yr (paid plans only). */
export const addOnCredits = {
  incrementCredits: 1000,
  minAnnualUsd: 1000,
  maxAnnualUsd: 200000,
  regularCreditsPerUsd: 10, // 10¢ per regular credit
  hyperCreditsPerUsd: 8, // 12.5¢ per hyper-personalized credit
};

/** Add-on credit top-up price (regular credit). */
export const TOPUP_CREDIT_USD = 0.1;

export type PlanKey = keyof typeof plans;

/** Pay-as-you-go rates for Custom Enterprise (regular $0.12, hyper-personalized $0.15). */
export const paygRates = {
  creditUsd: 0.12,
  hyperPersonalizedCreditUsd: 0.15,
  dealFeePct: 2.5,
};

// Credit consumption (2026 spec): 1 credit = 1 lead or 1 email. A follow-up (3–5
// emails per lead) costs 3. AI voice calls (agent "WAPI") cost 10 each; a 3–5 call
// bundle is 25; calls + emails combined is ~30.
export const creditCosts: Record<string, number> = {
  lead: 1,
  email_write: 1,
  email_send: 1,
  followup_3: 3,
  followup_5: 3,
  voice_call: 10,
  voice_calls_3: 25,
  combined_calls_emails: 30,
  lead_enrich: 1,
  company_research: 1,
  email_verify: 1,
  icp_score: 1,
  reply_classify: 1,
  // ── Marketing (ad generation + publishing) ──
  ad_copy: 2,
  ad_image: 6,
  ad_video: 30,
  ad_publish: 3,
};

export function creditsRequired(operation: keyof typeof creditCosts | string): number {
  return creditCosts[operation] ?? 1;
}

/** Hyper-personalized credits cost 25% more ($0.125 vs $0.10 per credit). */
export const HYPER_PERSONALIZATION_MULTIPLIER = 1.25;

export interface CostOptions {
  hyperPersonalization?: boolean;
  quantity?: number;
}

/**
 * Authoritative per-action credit cost. The single place consumption is priced so the
 * ledger, UI, and agents never diverge. Returns a whole number of credits.
 */
export function computeCreditCost(
  operation: keyof typeof creditCosts | string,
  options: CostOptions = {}
): number {
  const base = creditsRequired(operation);
  const quantity = Math.max(1, Math.floor(options.quantity ?? 1));
  const multiplier = options.hyperPersonalization ? HYPER_PERSONALIZATION_MULTIPLIER : 1;
  return Math.ceil(base * quantity * multiplier);
}

export function isWithinPlan(plan: PlanKey, usage: { campaigns: number; mailboxes: number }): boolean {
  const p = plans[plan];
  if (p.maxCampaigns !== -1 && usage.campaigns >= p.maxCampaigns) return false;
  if (p.maxMailboxes !== -1 && usage.mailboxes > p.maxMailboxes) return false;
  return true;
}

/** Array form used by billing/pricing UIs. */
export const revenuePlans: RevenuePlan[] = Object.values(plans);

/** The entry plan used as a fallback when a plan key is unknown/missing (no free tier). */
export const DEFAULT_PLAN_KEY = "solo_launch";

export function getRevenuePlan(planKey?: string | null): RevenuePlan {
  if (!planKey) return plans.solo_launch;
  return (plans as Record<string, RevenuePlan>)[planKey] ?? plans.solo_launch;
}

/** Pay-as-you-go (no fixed monthly credits — bills per credit used). */
export function planIsPayg(planKey?: string | null): boolean {
  return getRevenuePlan(planKey).monthlyCredits === null;
}

/** Plans that pool one credit balance across multiple seats (-1 = unlimited). */
export function planHasSeatSharing(planKey?: string | null): boolean {
  const seats = getRevenuePlan(planKey).maxTeamSeats;
  return seats === -1 || seats > 1;
}
