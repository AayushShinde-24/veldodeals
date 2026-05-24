import "server-only";

import { fetchLeadBundle, getDb, logAgent, saveDecision, updateLeadStage } from "@/lib/agents/agent-helpers";
import { publicSignalOutputSchema, type AgentContext, type PublicSignalOutput } from "@/lib/agents/schemas";
import { searchPublicSignals } from "@/lib/integrations/tavily";

export async function runPublicSignalAgent(input: Record<string, unknown>, context: AgentContext): Promise<PublicSignalOutput> {
  if (!context.leadId) throw new Error("lead_id is required for public signal research.");
  const db = getDb();
  const { lead } = await fetchLeadBundle(db, context.leadId);
  const query = (input.query as string | undefined) ?? `${lead.company} funding hiring product launch customer news`;
  const search = await searchPublicSignals(query, context.userId, context.campaignId, context.leadId);
  const results = Array.isArray(search.results) ? search.results : [];

  const signals = results
    .filter((result): result is Record<string, unknown> => typeof result === "object" && result !== null)
    .slice(0, 5)
    .map((result, index) => ({
      signal: stringValue(result.content) || stringValue(result.title) || "Public business signal",
      source_title: stringValue(result.title) || "Public source",
      source_url: stringValue(result.url) || "",
      why_it_matters: "May indicate a current business priority worth referencing carefully.",
      strength: Math.max(35, 80 - index * 10),
    }))
    .filter((signal) => signal.source_url);

  const output = publicSignalOutputSchema.parse({
    lead_id: context.leadId,
    signals,
    best_signal: signals[0]?.signal ?? "No strong public buying signal found.",
    confidence: signals.length >= 3 ? 72 : signals.length > 0 ? 55 : 20,
  });

  await db.from("public_signals").upsert({
    user_id: context.userId,
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    signals: output.signals,
    best_signal: output.best_signal,
    confidence: output.confidence,
  }, { onConflict: "lead_id" });

  await updateLeadStage(db, context.leadId, output.confidence >= 50 ? "signals_found" : "needs_review");
  await logAgent(db, { ...context, agentName: "public_signal_research" }, "Public signals saved.", "info", { signal_count: output.signals.length });
  await saveDecision(db, { ...context, agentName: "public_signal_research" }, output, output.confidence, output.confidence < 50);
  return output;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
