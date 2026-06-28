// ─────────────────────────────────────────────────────────────────────────
// Autonomy modes — how much Vel does on its own. Single source of truth shared
// by onboarding, settings, and (later) the commander's requiresApproval gate.
// User-facing names: Manual / Semi-automatic / Automatic. "auto" is the hero.
// ─────────────────────────────────────────────────────────────────────────

export type AutonomyMode = "manual" | "semi" | "auto";

export interface AutonomyModeMeta {
  id: AutonomyMode;
  name: string;
  tagline: string;
  description: string;
  accent: "slate" | "blue" | "violet";
  recommended: boolean;
  features: string[];
}

export const AUTONOMY_MODES: AutonomyModeMeta[] = [
  {
    id: "manual",
    name: "Manual",
    tagline: "You drive. Vel assists.",
    description: "Vel researches, drafts, and advises — but never acts on its own. You approve every step.",
    accent: "slate",
    recommended: false,
    features: [
      "AI answers, analyses, and drafts",
      "Nothing runs without your click",
      "Best for easing in",
    ],
  },
  {
    id: "semi",
    name: "Semi-automatic",
    tagline: "Vel does the work. You call the big shots.",
    description: "Vel runs all the prep — sourcing, research, scoring, drafting — and pauses for your OK before anything goes out or spends.",
    accent: "blue",
    recommended: false,
    features: [
      "Auto research, scoring & drafting",
      "Approval required for sends & spend",
      "One-click batch approvals",
    ],
  },
  {
    id: "auto",
    name: "Automatic",
    tagline: "Vel runs your Sales & Fundraising for you, 24/7.",
    description: "Tell Vel the goal — it sources, writes, gates, sends, follows up, and learns on its own, inside your guardrails. The way Veldo is meant to run.",
    accent: "violet",
    recommended: true,
    features: [
      "End-to-end, always-on autonomy",
      "Proactive opportunity radar",
      "Self-optimising from results",
      "Budget caps + instant kill switch",
    ],
  },
];

/** The recommended default new users start on. */
export const DEFAULT_AUTONOMY_MODE: AutonomyMode = "auto";

const BY_ID: Record<AutonomyMode, AutonomyModeMeta> = Object.fromEntries(
  AUTONOMY_MODES.map((m) => [m.id, m])
) as Record<AutonomyMode, AutonomyModeMeta>;

export function getAutonomyMode(id?: string | null): AutonomyModeMeta {
  if (id && id in BY_ID) return BY_ID[id as AutonomyMode];
  return BY_ID[DEFAULT_AUTONOMY_MODE];
}

export function isAutonomyMode(value: unknown): value is AutonomyMode {
  return value === "manual" || value === "semi" || value === "auto";
}
