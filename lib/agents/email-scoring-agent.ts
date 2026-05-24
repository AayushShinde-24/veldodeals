import "server-only";

import { fetchLeadBundle, getDb, logAgent, saveDecision, updateLeadStage, wordCount } from "@/lib/agents/agent-helpers";
import { emailQualityOutputSchema, type AgentContext, type EmailQualityOutput } from "@/lib/agents/schemas";

export async function runEmailScoringAgent(_input: Record<string, unknown>, context: AgentContext): Promise<EmailQualityOutput> {
  if (!context.leadId) throw new Error("lead_id is required for email scoring.");
  const db = getDb();
  const bundle = await fetchLeadBundle(db, context.leadId);
  if (!bundle.email) throw new Error("Email draft not found.");

  const body = String(bundle.email.email_body ?? "");
  const wc = wordCount(body);
  const fixes: string[] = [];
  let score = 0;

  if (bundle.publicSignals?.best_signal && !/no strong/i.test(bundle.publicSignals.best_signal)) score += 25;
  else fixes.push("Use a real public business signal or send to review.");
  if (bundle.lead.title) score += 20;
  else fixes.push("Confirm role relevance.");
  if (bundle.personalization?.pain_point) score += 20;
  else fixes.push("Add a clear business pain point.");
  if (!/(guaranteed|act now|last chance|urgent|free money|limited time)/iu.test(body)) score += 15;
  else fixes.push("Remove spammy or misleading wording.");
  if (wc <= 110) score += 10;
  else fixes.push("Reduce email below 110 words.");
  if (String(bundle.email.cta ?? body).length > 0 && /\?/.test(body)) score += 10;
  else fixes.push("Add one simple question-based CTA.");

  const inventedOrPrivate = /(saw you liked|watched your|private|DM|direct message|browsing history)/iu.test(body);
  if (inventedOrPrivate) {
    score = 0;
    fixes.unshift("Remove invented, private, or surveillance-like claims.");
  }

  const pass = score >= 75 && !inventedOrPrivate;
  const output = emailQualityOutputSchema.parse({
    lead_id: context.leadId,
    score,
    pass,
    fail_reason: pass ? "" : fixes[0] ?? "Email score below sending threshold.",
    fixes,
    final_verdict: pass ? "send" : score >= 50 ? "revise" : "reject",
  });

  await db.from("email_scores").upsert({
    user_id: context.userId,
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    score: output.score,
    pass: output.pass,
    fail_reason: output.fail_reason,
    fixes: output.fixes,
    final_verdict: output.final_verdict,
  }, { onConflict: "lead_id" });

  await updateLeadStage(db, context.leadId, output.pass ? "scored_email" : "needs_review");
  await logAgent(db, { ...context, agentName: "email_quality_scoring" }, "Email quality scored.", "info", { score: output.score, verdict: output.final_verdict });
  await saveDecision(db, { ...context, agentName: "email_quality_scoring" }, output, output.score, !output.pass);
  return output;
}
