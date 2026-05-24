import "server-only";

import { getDb, logAgent, saveDecision } from "@/lib/agents/agent-helpers";
import { adminQaOutputSchema, type AdminQaOutput, type AgentContext } from "@/lib/agents/schemas";

export async function runAdminQaAgent(input: Record<string, unknown>, context: AgentContext): Promise<AdminQaOutput> {
  const db = getDb();
  const issue = typeof input.issue === "string" ? input.issue : "Workflow task needs attention.";
  const output = adminQaOutputSchema.parse({
    issue,
    root_cause: typeof input.root_cause === "string" ? input.root_cause : "External API, validation, or approval gate failure.",
    severity: input.severity === "critical" || input.severity === "high" || input.severity === "medium" ? input.severity : "low",
    fix: typeof input.fix === "string" ? input.fix : "Review task logs, repair inputs, then retry the blocked stage.",
    developer_task: typeof input.developer_task === "string" ? input.developer_task : `Investigate: ${issue}`,
  });

  await logAgent(db, { ...context, agentName: "admin_qa" }, output.issue, output.severity === "critical" ? "error" : "warn", output);
  await saveDecision(db, { ...context, agentName: "admin_qa" }, output, 80, output.severity !== "low");
  return output;
}
