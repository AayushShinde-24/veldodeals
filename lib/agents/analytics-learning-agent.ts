import "server-only";

import { getDb, logAgent, saveDecision } from "@/lib/agents/agent-helpers";
import { analyticsLearningOutputSchema, type AgentContext, type AnalyticsLearningOutput } from "@/lib/agents/schemas";

export async function runAnalyticsLearningAgent(_input: Record<string, unknown>, context: AgentContext): Promise<AnalyticsLearningOutput> {
  if (!context.campaignId) throw new Error("campaign_id is required for analytics learning.");
  const db = getDb();
  const [leads, sends, replies] = await Promise.all([
    db.from("leads").select("industry,stage").eq("campaign_id", context.campaignId),
    db.from("email_send_events").select("*").eq("campaign_id", context.campaignId),
    db.from("reply_events").select("*").eq("campaign_id", context.campaignId),
  ]);

  const sentCount = sends.data?.length ?? 0;
  const replyCount = replies.data?.length ?? 0;
  const positiveCount = replies.data?.filter((reply) => ["positive", "meeting_request"].includes(reply.reply_class)).length ?? 0;
  const output = analyticsLearningOutputSchema.parse({
    campaign_id: context.campaignId,
    summary: `${sentCount} emails sent, ${replyCount} replies, ${positiveCount} positive or meeting-request replies.`,
    best_performing_segment: inferBestSegment(leads.data ?? [], replies.data ?? []),
    weakness: sentCount > 0 && replyCount === 0 ? "No replies yet. Improve targeting or first-line relevance before scaling." : "Keep collecting data before making major changes.",
    recommended_change: positiveCount > 0 ? "Favor leads similar to positive responders and reuse their highest-scoring personalization angle." : "Review rejected and needs-review drafts for recurring weak signals.",
    risk_flags: [],
  });

  await db.from("campaign_learnings").upsert({
    user_id: context.userId,
    campaign_id: context.campaignId,
    summary: output.summary,
    best_performing_segment: output.best_performing_segment,
    weakness: output.weakness,
    recommended_change: output.recommended_change,
    risk_flags: output.risk_flags,
  }, { onConflict: "campaign_id" });

  await logAgent(db, { ...context, agentName: "analytics_learning" }, "Campaign learning updated.", "info", { sentCount, replyCount, positiveCount });
  await saveDecision(db, { ...context, agentName: "analytics_learning" }, output, 75, false);
  return output;
}

function inferBestSegment(leads: Array<Record<string, unknown>>, replies: Array<Record<string, unknown>>) {
  if (replies.length === 0) return "Insufficient reply data.";
  const industries = leads.map((lead) => (typeof lead.industry === "string" ? lead.industry : "")).filter(Boolean);
  return industries[0] ?? "Mixed segment";
}
