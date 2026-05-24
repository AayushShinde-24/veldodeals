import "server-only";

import { enqueueAgentTask } from "@/lib/agents/agent-helpers";
import { runTask } from "@/lib/agents/agent-runner";
import type { AgentName } from "@/lib/agents/schemas";

export async function enqueueAndRun(input: {
  userId: string;
  campaignId?: string;
  leadId?: string;
  agentName: AgentName;
  taskType: string;
  inputJson?: Record<string, unknown>;
  priority?: number;
}) {
  const task = await enqueueAgentTask({
    userId: input.userId,
    campaignId: input.campaignId,
    leadId: input.leadId,
    agentName: input.agentName,
    taskType: input.taskType,
    priority: input.priority,
    inputJson: input.inputJson,
  });

  return runTask(task);
}
