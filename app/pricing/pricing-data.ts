// Marketing/display pricing for the public /pricing page.
// Kept separate from lib/revenue-os/pricing.ts (billing logic) so the storefront
// can be tuned for psychology without touching Stripe/credit wiring.

export type Accent = "blue" | "violet" | "indigo";

export interface DisplayPlan {
  key: string;
  name: string;
  tagline: string;
  /** null = custom / pay-as-you-go */
  priceUsd: number | null;
  /** null = custom credit pool */
  credits: number | null;
  creditsLabel?: string;
  hyperUsd?: number | null;
  seats: string;
  badge?: string;
  highlight?: boolean;
  features: string[];
  cta: string;
  ctaHref: string;
  accent: Accent;
}

export interface DisplayTier {
  id: "solo" | "team" | "enterprise";
  label: string;
  sub: string;
  plans: DisplayPlan[];
}

export const pricingTiers: DisplayTier[] = [
  {
    id: "solo",
    label: "Solo",
    sub: "For founders and solo operators. Your own private credit balance.",
    plans: [
      {
        key: "solo-launch",
        name: "Launch",
        tagline: "Get your first pipeline moving.",
        priceUsd: 199,
        credits: 2000,
        seats: "1 seat",
        accent: "blue",
        cta: "Start free trial",
        ctaHref: "/signup",
        features: [
          "2,000 credits / month",
          "Lead finder + AI email writing",
          "Reply handling & CRM",
          "2.5% deal fee",
        ],
      },
      {
        key: "solo-momentum",
        name: "Momentum",
        tagline: "Double the volume, find your rhythm.",
        priceUsd: 399,
        credits: 4000,
        seats: "1 seat",
        accent: "violet",
        badge: "Most popular",
        highlight: true,
        cta: "Start free trial",
        ctaHref: "/signup",
        features: [
          "4,000 credits / month",
          "Everything in Launch",
          "Priority AI agents",
          "Hyper-personalization ready",
          "2.5% deal fee",
        ],
      },
      {
        key: "solo-velocity",
        name: "Velocity",
        tagline: "Go all-out as a one-person revenue team.",
        priceUsd: 699,
        credits: 8000,
        seats: "1 seat",
        accent: "indigo",
        badge: "Best value",
        cta: "Start free trial",
        ctaHref: "/signup",
        features: [
          "8,000 credits / month",
          "Everything in Momentum",
          "Highest send + research limits",
          "Priority support",
          "2.5% deal fee",
        ],
      },
    ],
  },
  {
    id: "team",
    label: "Team",
    sub: "Credits pooled across 1–10 seats — no per-person juggling.",
    plans: [
      {
        key: "team-crew",
        name: "Crew",
        tagline: "Your first shared revenue engine.",
        priceUsd: 999,
        credits: 10000,
        hyperUsd: 199,
        seats: "1–10 shared seats",
        accent: "blue",
        cta: "Start free trial",
        ctaHref: "/signup",
        features: [
          "10,000 pooled credits / month",
          "Shared across 1–10 seats",
          "Hyper-personalization +$199",
          "Team roles & analytics",
          "2.5% deal fee",
        ],
      },
      {
        key: "team-engine",
        name: "Engine",
        tagline: "Replace 1–2 SDRs with Vel.",
        priceUsd: 2499,
        credits: 25000,
        hyperUsd: 399,
        seats: "1–10 shared seats",
        accent: "violet",
        badge: "Most popular",
        highlight: true,
        cta: "Start free trial",
        ctaHref: "/signup",
        features: [
          "25,000 pooled credits / month",
          "Shared across 1–10 seats",
          "Hyper-personalization +$399",
          "Advanced team analytics",
          "2.5% deal fee",
        ],
      },
      {
        key: "team-powerhouse",
        name: "Powerhouse",
        tagline: "A full revenue team, on autopilot.",
        priceUsd: 4999,
        credits: 55000,
        hyperUsd: 799,
        seats: "1–10 shared seats",
        accent: "indigo",
        badge: "Best value",
        cta: "Start free trial",
        ctaHref: "/signup",
        features: [
          "55,000 pooled credits / month",
          "Shared across 1–10 seats",
          "Hyper-personalization +$799",
          "Priority support & onboarding",
          "2.5% deal fee",
        ],
      },
    ],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    sub: "Org-scale credit pools shared across your whole company.",
    plans: [
      {
        key: "ent-scale",
        name: "Scale",
        tagline: "Done-for-you outbound at org scale.",
        priceUsd: 9999,
        credits: 105000,
        seats: "1–200 seats",
        accent: "blue",
        cta: "Start free trial",
        ctaHref: "/signup",
        features: [
          "105,000 credits / month",
          "Shared across 1–200 seats",
          "Dedicated onboarding",
          "SSO & advanced security",
          "2.5% deal fee",
        ],
      },
      {
        key: "ent-apex",
        name: "Apex",
        tagline: "Maximum reach, multi-region.",
        priceUsd: 19999,
        credits: 220000,
        seats: "1–200+ seats",
        accent: "violet",
        badge: "Most popular",
        highlight: true,
        cta: "Start free trial",
        ctaHref: "/signup",
        features: [
          "220,000 credits / month",
          "Shared across your org",
          "Priority SLA & success manager",
          "SSO, SCIM & audit logs",
          "2.5% deal fee",
        ],
      },
      {
        key: "ent-custom",
        name: "Custom Enterprise",
        tagline: "Unlimited scale, pay as you go.",
        priceUsd: null,
        credits: null,
        creditsLabel: "Pay as you go",
        seats: "Unlimited seats",
        accent: "indigo",
        badge: "Unlimited",
        cta: "Contact sales",
        ctaHref: "/contact",
        features: [
          "$20 / seat + API usage",
          "$0.12 per credit",
          "$0.15 per hyper-personalized credit",
          "Custom security & data controls",
          "2.5% deal fee",
        ],
      },
    ],
  },
];

export const addOnCredits = {
  minAnnualUsd: 1000,
  maxAnnualUsd: 200000,
  regularCentsPerCredit: 10,
  hyperCentsPerCredit: 12.5,
};
