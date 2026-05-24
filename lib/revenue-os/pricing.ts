export type PlanAudience = "individual" | "team" | "enterprise";
export type PlanKey =
  | "free"
  | "starter"
  | "go"
  | "pro"
  | "plus"
  | "grow"
  | "expand"
  | "advanced_expansion"
  | "custom_enterprise";

export type CreditAction =
  | "lead_scrape"
  | "lead_enrichment"
  | "hyper_personalization"
  | "email_send"
  | "ai_call_minute"
  | "meeting_booking"
  | "investor_outreach"
  | "crm_action";

export type RevenuePlan = {
  key: PlanKey;
  name: string;
  audience: PlanAudience;
  priceMonthlyUsd: number | null;
  monthlyCredits: number | null;
  hyperPersonalizationUsd: number | null;
  expectedUserSharePct: number;
  memberLimit: number | null;
  overageEnabled: boolean;
  description: string;
};

export const revenuePlans: RevenuePlan[] = [
  {
    key: "free",
    name: "Free",
    audience: "individual",
    priceMonthlyUsd: 0,
    monthlyCredits: 150,
    hyperPersonalizationUsd: null,
    expectedUserSharePct: 60,
    memberLimit: 1,
    overageEnabled: false,
    description: "Explore safe autonomous prospecting with approval-gated sends.",
  },
  {
    key: "starter",
    name: "Starter",
    audience: "individual",
    priceMonthlyUsd: 49,
    monthlyCredits: 500,
    hyperPersonalizationUsd: 19,
    expectedUserSharePct: 15,
    memberLimit: 1,
    overageEnabled: true,
    description: "For solo operators starting predictable outbound.",
  },
  {
    key: "go",
    name: "Go",
    audience: "individual",
    priceMonthlyUsd: 99,
    monthlyCredits: 1000,
    hyperPersonalizationUsd: 39,
    expectedUserSharePct: 8,
    memberLimit: 1,
    overageEnabled: true,
    description: "For founders and sellers running daily campaigns.",
  },
  {
    key: "pro",
    name: "Pro",
    audience: "individual",
    priceMonthlyUsd: 179,
    monthlyCredits: 2000,
    hyperPersonalizationUsd: 49,
    expectedUserSharePct: 5,
    memberLimit: 1,
    overageEnabled: true,
    description: "For high-volume individual pipeline building.",
  },
  {
    key: "plus",
    name: "Plus",
    audience: "individual",
    priceMonthlyUsd: 249,
    monthlyCredits: 3000,
    hyperPersonalizationUsd: 99,
    expectedUserSharePct: 3,
    memberLimit: 1,
    overageEnabled: true,
    description: "For operators scaling email, calls, and deal follow-up.",
  },
  {
    key: "grow",
    name: "Grow",
    audience: "team",
    priceMonthlyUsd: 499,
    monthlyCredits: 5000,
    hyperPersonalizationUsd: 149,
    expectedUserSharePct: 4,
    memberLimit: 100,
    overageEnabled: true,
    description: "For teams coordinating autonomous distribution and sales.",
  },
  {
    key: "expand",
    name: "Expand",
    audience: "team",
    priceMonthlyUsd: 999,
    monthlyCredits: 10000,
    hyperPersonalizationUsd: 199,
    expectedUserSharePct: 2.5,
    memberLimit: 100,
    overageEnabled: true,
    description: "For larger sales teams with meeting and deal automation.",
  },
  {
    key: "advanced_expansion",
    name: "Advanced Expansion",
    audience: "team",
    priceMonthlyUsd: 1999,
    monthlyCredits: 20000,
    hyperPersonalizationUsd: 349,
    expectedUserSharePct: 1.5,
    memberLimit: 100,
    overageEnabled: true,
    description: "For aggressive multi-channel revenue operations.",
  },
  {
    key: "custom_enterprise",
    name: "Custom Enterprise",
    audience: "enterprise",
    priceMonthlyUsd: null,
    monthlyCredits: null,
    hyperPersonalizationUsd: null,
    expectedUserSharePct: 1,
    memberLimit: null,
    overageEnabled: true,
    description: "Custom limits, controls, compliance, and support.",
  },
];

export const creditCosts: Record<CreditAction, number> = {
  lead_scrape: 1,
  lead_enrichment: 2,
  hyper_personalization: 4,
  email_send: 1,
  ai_call_minute: 3,
  meeting_booking: 5,
  investor_outreach: 6,
  crm_action: 1,
};

export const targetOutcomeRates = {
  meetingRatePct: 10,
  emailDealRatePct: 1,
  callDealRatePct: 5,
} as const;

export function getRevenuePlan(plan: string | null | undefined) {
  return revenuePlans.find((item) => item.key === plan) ?? revenuePlans[0];
}

export function getMonthlyCredits(plan: string | null | undefined) {
  return getRevenuePlan(plan).monthlyCredits ?? 0;
}

export function getCreditCost(action: CreditAction) {
  return creditCosts[action];
}
