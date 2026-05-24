import "server-only";

import { getDb, logAgent, saveDecision } from "@/lib/agents/agent-helpers";
import { type AgentContext, type InvestorPipelineOutput, investorPipelineOutputSchema } from "@/lib/agents/schemas";

export async function runInvestorPipelineAgent(input: Record<string, unknown>, context: AgentContext): Promise<InvestorPipelineOutput> {
  if (!context.campaignId) throw new Error("campaign_id is required for investor pipeline work.");
  const db = getDb();
  const candidates = Array.isArray(input.investors) ? input.investors : [];
  const matched = candidates.slice(0, 20).map((candidate) => {
    const record = candidate && typeof candidate === "object" ? candidate as Record<string, unknown> : {};
    return {
      name: String(record.name ?? "Investor"),
      firm: String(record.firm ?? ""),
      match_score: Number(record.match_score ?? 50),
      source_url: typeof record.source_url === "string" ? record.source_url : undefined,
      allowed_channels: ["email"] as Array<"email" | "call">,
    };
  });
  const output = investorPipelineOutputSchema.parse({
    campaign_id: context.campaignId,
    investors_found: candidates.length,
    matched_investors: matched,
    provenance_complete: matched.every((item) => Boolean(item.source_url)),
    needs_review: !matched.length || matched.some((item) => item.match_score < 60),
  });
  await logAgent(db, { ...context, agentName: "investor_pipeline" }, "Investor pipeline evaluated.", "info", output);
  await saveDecision(db, { ...context, agentName: "investor_pipeline" }, output, output.provenance_complete ? 80 : 45, output.needs_review);
  return output;
}
