import { createServiceClient } from "@/lib/integrations/supabase";

export interface SendGateResult {
  passed: boolean;
  gates: {
    icpFit: { passed: boolean; score: number; threshold: number };
    researchConfidence: { passed: boolean; score: number; threshold: number };
    emailScore: { passed: boolean; score: number; threshold: number };
    emailVerified: { passed: boolean };
    humanApproved: { passed: boolean };
    creditsAvailable: { passed: boolean; credits: number };
    personalizationRisk: { passed: boolean; risk: string };
  };
  blockers: string[];
}

export interface GateInput {
  credits: number;
  icpScore: number;
  researchScore: number;
  emailScore: number;
  emailVerified: boolean;
  humanApproved: boolean;
  personalizationRisk: string;
}

export const GATE_THRESHOLDS = { icpFit: 50, researchConfidence: 60, emailScore: 75 } as const;

/**
 * Pure send-gate evaluation — the 7 gates that must ALL pass before any email sends.
 * Side-effect-free so it can be unit-tested without a database.
 */
export function evaluateSendGates(input: GateInput): SendGateResult {
  const gates = {
    icpFit: { passed: input.icpScore >= GATE_THRESHOLDS.icpFit, score: input.icpScore, threshold: GATE_THRESHOLDS.icpFit },
    researchConfidence: { passed: input.researchScore >= GATE_THRESHOLDS.researchConfidence, score: input.researchScore, threshold: GATE_THRESHOLDS.researchConfidence },
    emailScore: { passed: input.emailScore >= GATE_THRESHOLDS.emailScore, score: input.emailScore, threshold: GATE_THRESHOLDS.emailScore },
    emailVerified: { passed: input.emailVerified },
    humanApproved: { passed: input.humanApproved },
    creditsAvailable: { passed: input.credits > 0, credits: input.credits },
    personalizationRisk: { passed: input.personalizationRisk !== "high", risk: input.personalizationRisk },
  };

  const blockers: string[] = [];
  if (!gates.icpFit.passed) blockers.push(`ICP fit score ${input.icpScore} below ${GATE_THRESHOLDS.icpFit} threshold.`);
  if (!gates.researchConfidence.passed) blockers.push(`Research confidence ${input.researchScore} below ${GATE_THRESHOLDS.researchConfidence} threshold.`);
  if (!gates.emailScore.passed) blockers.push(`Email score ${input.emailScore} below ${GATE_THRESHOLDS.emailScore} threshold.`);
  if (!gates.emailVerified.passed) blockers.push("Email address not verified.");
  if (!gates.humanApproved.passed) blockers.push("Draft pending human approval.");
  if (!gates.creditsAvailable.passed) blockers.push("Insufficient credits.");
  if (!gates.personalizationRisk.passed) blockers.push("Personalization risk is too high.");

  return { passed: blockers.length === 0, gates, blockers };
}

/** Context-form entry: resolves the draft for a campaign/lead, then runs the gates. */
export async function runSendGateAgent(
  _input: unknown,
  ctx: { userId: string; campaignId: string; leadId: string }
): Promise<SendGateResult> {
  const db = createServiceClient();
  const { data: draft } = await db
    .from("email_drafts")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("campaign_id", ctx.campaignId)
    .eq("lead_id", ctx.leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!draft?.id) {
    return {
      passed: false,
      gates: {
        icpFit: { passed: false, score: 0, threshold: 50 },
        researchConfidence: { passed: false, score: 0, threshold: 60 },
        emailScore: { passed: false, score: 0, threshold: 75 },
        emailVerified: { passed: false },
        humanApproved: { passed: false },
        creditsAvailable: { passed: false, credits: 0 },
        personalizationRisk: { passed: false, risk: "high" },
      },
      blockers: ["No draft found for this lead yet."],
    };
  }

  return runSendGates(ctx.userId, draft.id);
}

export async function runSendGates(
  userId: string,
  draftId: string
): Promise<SendGateResult> {
  const db = createServiceClient();

  // MVP path: a self-contained email_drafts row carries its own gate fields.
  const { data: draft } = await db
    .from("email_drafts")
    .select("*")
    .eq("id", draftId)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: profile } = await db
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .maybeSingle();
  const credits = profile?.credits ?? 0;

  if (draft) {
    return evaluateSendGates({
      credits,
      icpScore: draft.icp_score ?? 0,
      researchScore: draft.research_confidence ?? 0,
      emailScore: draft.email_score ?? 0,
      emailVerified: draft.email_verified === true,
      humanApproved: draft.approved === true,
      personalizationRisk: draft.personalization_risk ?? "high",
    });
  }

  // Agent pipeline path: gate inputs live across generated_emails + the lead's score
  // tables (icp_scores / company_research / email_scores / email_verifications).
  return runSendGatesForGeneratedEmail(userId, draftId, credits);
}

/**
 * Gather the 7 gate inputs for an agent-produced draft from the canonical tables and
 * evaluate them. This is what enforces the gates on the autonomous outbound pipeline.
 */
export async function runSendGatesForGeneratedEmail(
  userId: string,
  generatedEmailId: string,
  knownCredits?: number
): Promise<SendGateResult> {
  const db = createServiceClient();

  const { data: gen } = await db
    .from("generated_emails")
    .select("lead_id, approval_status, personalization_risk, email_score")
    .eq("id", generatedEmailId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!gen) throw new Error(`Draft ${generatedEmailId} not found.`);
  const leadId = gen.lead_id;

  const [credits, icp, research, score, verification] = await Promise.all([
    knownCredits !== undefined
      ? Promise.resolve(knownCredits)
      : db.from("profiles").select("credits").eq("id", userId).maybeSingle().then((r) => r.data?.credits ?? 0),
    latest(db, "icp_scores", "fit_score", userId, leadId),
    latest(db, "company_research", "confidence", userId, leadId),
    latest(db, "email_scores", "score", userId, leadId),
    db
      .from("email_verifications")
      .select("status")
      .eq("user_id", userId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r) => r.data?.status ?? null),
  ]);

  return evaluateSendGates({
    credits: typeof credits === "number" ? credits : 0,
    icpScore: icp,
    researchScore: research,
    emailScore: gen.email_score ?? score,
    emailVerified: verification === "valid" || verification === "verified",
    humanApproved: gen.approval_status === "approved",
    personalizationRisk: gen.personalization_risk ?? "high",
  });
}

async function latest(
  db: ReturnType<typeof createServiceClient>,
  table: string,
  column: string,
  userId: string,
  leadId: string | null
): Promise<number> {
  if (!leadId) return 0;
  const { data } = await db
    .from(table)
    .select(column)
    .eq("user_id", userId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const value = (data as Record<string, unknown> | null)?.[column];
  return typeof value === "number" ? value : Number(value ?? 0) || 0;
}
