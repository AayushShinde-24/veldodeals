// Marketing/display pricing for the public /pricing page.
// Kept separate from lib/revenue-os/pricing.ts (billing logic) so the storefront
// can be tuned for psychology without touching Stripe/credit wiring.

export type Accent = "blue" | "violet" | "indigo" | "slate";

export interface DisplayPlan {
  key: string;
  name: string;
  tagline: string;
  /** null = custom / pay-as-you-go, 0 = free */
  priceUsd: number | null;
  /** null = custom credit pool */
  credits: number | null;
  creditsLabel?: string;
  /**
   * Monthly price of the hyper-personalization add-on for this plan.
   * number = fixed add-on, null = custom (Contact sales), undefined = no hyper option.
   * The Normal/Hyper selector is shown for every tier EXCEPT Solo.
   */
  hyperUsd?: number | null;
  /** Free plans are excluded from "from $X" roll-ups on the landing page. */
  isFree?: boolean;
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
        key: "free",
        name: "Free",
        tagline: "Try Veldo — no card needed.",
        priceUsd: 0,
        credits: 100,
        isFree: true,
        seats: "1 seat",
        accent: "slate",
        cta: "Start free",
        ctaHref: "/signup",
        features: [
          "Lead finder + AI email writing",
          "Reply handling & CRM",
          "Community support",
        ],
      },
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
          "Lead finder + AI email writing",
          "Reply handling & CRM",
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
          "Everything in Launch",
          "Priority AI agents",
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
          "Everything in Momentum",
          "Highest send + research limits",
          "Priority support",
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
          "Marketing & fundraising included",
          "Shared across 1–10 seats",
          "Team roles & analytics",
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
          "Everything in Crew",
          "Shared across 1–10 seats",
          "Advanced team analytics",
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
          "Everything in Engine",
          "Shared across 1–10 seats",
          "Priority support & onboarding",
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
        credits: 110000,
        hyperUsd: 1499,
        seats: "1–200 seats",
        accent: "blue",
        cta: "Start free trial",
        ctaHref: "/signup",
        features: [
          "Shared across 1–200 seats",
          "Pay-as-you-go API access",
          "SSO & advanced security",
          "Dedicated onboarding",
        ],
      },
      {
        key: "ent-apex",
        name: "Apex",
        tagline: "Maximum reach, multi-region.",
        priceUsd: 19999,
        credits: 220000,
        hyperUsd: 2999,
        seats: "1–200+ seats",
        accent: "violet",
        badge: "Most popular",
        highlight: true,
        cta: "Start free trial",
        ctaHref: "/signup",
        features: [
          "Shared across your org",
          "Pay-as-you-go API access",
          "Priority SLA & success manager",
          "SSO, SCIM & audit logs",
        ],
      },
      {
        key: "ent-custom",
        name: "Custom Enterprise",
        tagline: "Unlimited scale, pay as you go.",
        priceUsd: null,
        credits: null,
        creditsLabel: "Pay as you go",
        hyperUsd: null,
        seats: "Unlimited seats",
        accent: "indigo",
        badge: "Unlimited",
        cta: "Contact sales",
        ctaHref: "/contact",
        features: [
          "Pay-as-you-go API access",
          "$20 / seat",
          "Custom security & data controls",
        ],
      },
    ],
  },
];

// Add-on credit top-ups. Buy on any plan; pick EITHER normal OR hyper credits.
// Formula: $1 → 10 normal credits, or $1 → 8 hyper-personalized credits.
// (Normal = more volume; hyper = fewer credits but higher-quality outcomes.)
export const addOnCredits = {
  minAnnualUsd: 1000,
  maxAnnualUsd: 100000,
  normalCreditsPerUsd: 10,
  hyperCreditsPerUsd: 8,
};

// Featured top-up ladder rendered as super-glowing stacked cards, each offering a
// selectable choice between normal (quantity) and hyper (quality) credits. Higher
// price = strictly more credits and a more premium treatment than the one before it.
export const topUpPlans: { annualUsd: number; best?: boolean }[] = [
  { annualUsd: 1000 },
  { annualUsd: 2500 },
  { annualUsd: 5000 },
  { annualUsd: 10000 },
  { annualUsd: 20000 },
  { annualUsd: 50000 },
  { annualUsd: 100000 },
  { annualUsd: 200000, best: true },
];
