import "server-only";

import { getDb, logAgent, saveDecision } from "@/lib/agents/agent-helpers";
import { generateValidatedJson, loadAgentPrompt } from "@/lib/agents/model-router";
import { replyClassificationOutputSchema, type AgentContext, type ReplyClassificationOutput } from "@/lib/agents/schemas";

export async function runReplyClassificationAgent(input: Record<string, unknown>, context: AgentContext): Promise<ReplyClassificationOutput> {
  if (!context.leadId) throw new Error("lead_id is required for reply classification.");
  const db = getDb();
  const rawReply = typeof input.raw_reply === "string" ? input.raw_reply : "";
  const prompt = await loadAgentPrompt("reply-classifier.md");

  const output = await generateValidatedJson({
    route: "openai_control",
    schema: replyClassificationOutputSchema,
    systemPrompt: prompt,
    userPrompt: JSON.stringify({ lead_id: context.leadId, raw_reply: rawReply }),
    context,
  });

  await db.from("reply_events").insert({
    user_id: context.userId,
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    raw_reply: rawReply,
    reply_class: output.reply_class,
    sentiment: output.sentiment,
    next_action: output.next_action,
    should_stop_sequence: output.should_stop_sequence,
    should_create_deal: output.should_create_deal,
  });

  await logAgent(db, { ...context, agentName: "reply_classification" }, "Reply triaged.", "info", { reply_class: output.reply_class });
  await saveDecision(db, { ...context, agentName: "reply_classification" }, output, 80, ["spam_complaint", "spam_complaint_risk", "angry", "unsubscribe"].includes(output.reply_class));
  return output;
}
