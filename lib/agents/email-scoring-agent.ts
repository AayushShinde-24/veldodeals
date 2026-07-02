import { createServiceClient } from "@/lib/integrations/supabase";
import { generateStructured, clampScore } from "@/lib/agents/structured";
import { GATE_THRESHOLDS } from "@/lib/agents/send-gate-agent";

export interface EmailScoreResult {
  draftId: string;
  score: number;
  issues: string[];
  passesThreshold: boolean;
}

interface ScorePayload {
  score: number;
  issues: string[];
  spammy: boolean;
}

/**
 * Score a generated email for quality + deliverability (clarity, relevance, length,
 * spam-trigger words, single CTA). Writes email_scores and stamps generated_emails.
 * Feeds the email-score send-gate (threshold 75).
 */
export async function scoreEmail(input: { userId: string; draftId: string }): Promise<EmailScoreResult> {
  const db = createServiceClient();

  const { data: draft } = await db
    .from("generated_emails")
    .select("lead_id, subject, body, email_body")
    .eq("id", input.draftId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!draft) throw new Error("Draft not found for scoring.");

  const body = draft.body ?? draft.email_body ?? "";

  const { data } = await generateStructured<ScorePayload>({
    system:
      "You are a cold-email QA reviewer. Score an email 0-100 on reply-worthiness AND deliverability. Penalize: vague value, multiple CTAs, length over ~120 words, hypey/spam-trigger language, broken personalization. Return concrete issues.",
    prompt: [
      `Subject: ${draft.subject ?? ""}`,
      `Body:\n${body}`,
      `\nReturn JSON: { "score": number 0-100, "issues": string[], "spammy": boolean }`,
    ].join("\n"),
    tier: "fast",
    maxTokens: 400,
  });

  const score = clampScore(data.score);
  const issues = Array.isArray(data.issues) ? data.issues.map(String).slice(0, 6) : [];

  await db.from("email_scores").insert({
    user_id: input.userId,
    lead_id: draft.lead_id,
    score,
    created_at: new Date().toISOString(),
  });

  await db
    .from("generated_emails")
    .update({ email_score: score, safety_status: score >= GATE_THRESHOLDS.emailScore ? "checked" : "needs_review" })
    .eq("id", input.draftId)
    .eq("user_id", input.userId);

  return { draftId: input.draftId, score, issues, passesThreshold: score >= GATE_THRESHOLDS.emailScore };
}
