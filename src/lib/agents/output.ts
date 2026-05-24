import "server-only";

import { z } from "zod";
import { createServiceClient } from "@/lib/integrations/supabase";

export const agentOutputEnvelopeSchema = z.object({
  agentName: z.string(),
  task: z.string(),
  status: z.enum(["success", "failed", "needs_user_confirmation", "needs_more_data"]),
  confidence: z.number().int().min(0).max(100),
  summary: z.string(),
  recommendations: z.array(z.unknown()).default([]),
  nextActions: z.array(z.unknown()).default([]),
  data: z.record(z.string(), z.unknown()).default({}),
  risks: z.array(z.unknown()).default([]),
  logs: z.array(z.unknown()).default([]),
});

export type AgentOutputEnvelope = z.infer<typeof agentOutputEnvelopeSchema>;

export async function persistAgentRun(input: {
  workspaceId?: string | null;
  userId?: string | null;
  taskId?: string | null;
  output: AgentOutputEnvelope;
  input?: Record<string, unknown>;
}) {
  const output = agentOutputEnvelopeSchema.parse(input.output);
  await createServiceClient().from("agent_runs").insert({
    workspace_id: input.workspaceId ?? null,
    user_id: input.userId ?? null,
    task_id: input.taskId ?? null,
    agent_name: output.agentName,
    task: output.task,
    status: output.status,
    input: input.input ?? {},
    output,
    confidence: output.confidence,
  });
  return output;
}

export function wrapAgentOutput(input: {
  agentName: string;
  task: string;
  status?: AgentOutputEnvelope["status"];
  confidence?: number;
  summary: string;
  recommendations?: unknown[];
  nextActions?: unknown[];
  data?: Record<string, unknown>;
  risks?: unknown[];
  logs?: unknown[];
}) {
  return agentOutputEnvelopeSchema.parse({
    agentName: input.agentName,
    task: input.task,
    status: input.status ?? "success",
    confidence: input.confidence ?? 75,
    summary: input.summary,
    recommendations: input.recommendations ?? [],
    nextActions: input.nextActions ?? [],
    data: input.data ?? {},
    risks: input.risks ?? [],
    logs: input.logs ?? [],
  });
}
