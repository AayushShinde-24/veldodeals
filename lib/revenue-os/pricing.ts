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

// Pricing model (first-year spec). No free tier — the entry plan is "Solo".
// All tiers carry the 2.5% deal-close commission. Top-ups + Custom API bill at $0.10/credit.
// NOTE: enterprise credit allowances are taken verbatim from the spec and are
// non-monotonic vs price (e.g. Enterprise $8,999/1M vs Enterprise Plus $16,999/200k).
// Adjust the monthlyCredits values here if the intended numbers differ.
export const plans = {
  solo: {
    key: "solo",
    name: "Solo",
    description: "For solo operators getting serious about outbound. 1–10 shared seats.",
    audience: "solo",
    priceMonthlyUsd: 2499,
    monthlyCredits: 25000,
    hyperPersonalizationUsd: null,
    addOnUsd: null,
    memberLimit: 10,
    expectedUserSharePct: 30,
    maxCampaigns: 5,
    maxMailboxes: 3,
    maxTeamSeats: 10,
    dealFeePct: 2.5,
  },
  team: {
    key: "team",
    name: "Team",
    description: "For small teams replacing 1–2 SDRs. Credits pooled across 1–10 seats.",
    audience: "team",
    priceMonthlyUsd: 4999,
    monthlyCredits: 60000,
    hyperPersonalizationUsd: null,
    addOnUsd: null,
    memberLimit: 10,
    expectedUserSharePct: 22,
    maxCampaigns: -1,
    maxMailboxes: 6,
    maxTeamSeats: 10,
    dealFeePct: 2.5,
  },
  scale: {
    key: "scale",
    name: "Scale",
    description: "Full revenue-team outbound at volume. 1–10 shared seats.",
    audience: "team",
    priceMonthlyUsd: 9999,
    monthlyCredits: 150000,
    hyperPersonalizationUsd: null,
    addOnUsd: null,
    memberLimit: 10,
    expectedUserSharePct: 16,
    maxCampaigns: -1,
    maxMailboxes: 15,
    maxTeamSeats: 10,
    dealFeePct: 2.5,
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    description: "Done-for-you outbound for orgs.",
    audience: "enterprise",
    priceMonthlyUsd: 8999,
    monthlyCredits: 1000000,
    hyperPersonalizationUsd: 1999, // hyper-personalization add-on
    addOnUsd: 1999,
    memberLimit: -1,
    expectedUserSharePct: 8,
    maxCampaigns: -1,
    maxMailboxes: -1,
    maxTeamSeats: -1,
    dealFeePct: 2.5,
  },
  enterprise_plus: {
    key: "enterprise_plus",
    name: "Enterprise Plus",
    description: "Higher-touch enterprise outbound.",
    audience: "enterprise",
    priceMonthlyUsd: 16999,
    monthlyCredits: 200000,
    hyperPersonalizationUsd: 3499,
    addOnUsd: 3499,
    memberLimit: -1,
    expectedUserSharePct: 4,
    maxCampaigns: -1,
    maxMailboxes: -1,
    maxTeamSeats: -1,
    dealFeePct: 2.5,
  },
  enterprise_max: {
    key: "enterprise_max",
    name: "Enterprise Max",
    description: "Highest-volume, multi-region outbound.",
    audience: "enterprise",
    priceMonthlyUsd: 25999,
    monthlyCredits: 300000,
    hyperPersonalizationUsd: 599,
    addOnUsd: 599,
    memberLimit: -1,
    expectedUserSharePct: 2,
    maxCampaigns: -1,
    maxMailboxes: -1,
    maxTeamSeats: -1,
    dealFeePct: 2.5,
  },
  custom: {
    key: "custom",
    name: "Custom Enterprise",
    description: "Pay-as-you-go API: $49/seat (custom API) + $0.10/credit ($0.13 hyper-personalized).",
    audience: "enterprise",
    priceMonthlyUsd: null,
    monthlyCredits: null,
    hyperPersonalizationUsd: null,
    addOnUsd: null,
    memberLimit: null,
    expectedUserSharePct: 2,
    maxCampaigns: -1,
    maxMailboxes: -1,
    maxTeamSeats: -1,
    dealFeePct: 2.5,
  },
} as const satisfies Record<string, RevenuePlan>;

/** Custom-API per-seat fee (enhanced security; data not used to train models). */
export const CUSTOM_API_SEAT_USD = 49;
/** Custom-API extra security + delivery, per seat. */
export const CUSTOM_API_SECURITY_SEAT_USD = 14;

/** Add-on credits: sold in 1,000-credit increments, $1,000/yr → $100,000/yr (paid plans only). */
export const addOnCredits = {
  incrementCredits: 1000,
  minAnnualUsd: 1000,
  maxAnnualUsd: 100000,
  regularCreditsPerUsd: 10, // ~10 regular credits per $1
  hyperCreditsPerUsd: 7.5, // ~7.5 hyper-personalized credits per $1
};

/** Credit top-up price for any paid plan or the public API. */
export const TOPUP_CREDIT_USD = 0.1;

export type PlanKey = keyof typeof plans;

/** Pay-as-you-go rates for Custom Enterprise (regular $0.10, hyper-personalized $0.13). */
export const paygRates = {
  creditUsd: 0.1,
  hyperPersonalizedCreditUsd: 0.13,
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
export const DEFAULT_PLAN_KEY = "solo";

export function getRevenuePlan(planKey?: string | null): RevenuePlan {
  if (!planKey) return plans.solo;
  return (plans as Record<string, RevenuePlan>)[planKey] ?? plans.solo;
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
