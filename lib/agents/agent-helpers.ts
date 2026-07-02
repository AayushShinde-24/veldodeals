import { createServiceClient } from "@/lib/integrations/supabase";

export interface EnqueueTaskInput {
  userId: string;
  campaignId?: string;
  leadId?: string;
  agentName: string;
  taskType: string;
  inputJson?: unknown;
  priority?: number;
}

export async function enqueueAgentTask(input: EnqueueTaskInput) {
  const db = createServiceClient();
  const { data, error } = await db
    .from("agent_tasks")
    .insert({
      user_id: input.userId,
      campaign_id: input.campaignId ?? null,
      lead_id: input.leadId ?? null,
      agent_name: input.agentName,
      task_type: input.taskType,
      status: "queued",
      priority: input.priority ?? 1,
      input_json: input.inputJson ?? null,
      created_at: new Date().toISOString(),
    })
    .select("id, agent_name, task_type, status, created_at, input_json")
    .single();

  if (error) throw new Error(`Failed to enqueue task: ${error.message}`);
  return data;
}

export async function updateTaskStatus(
  taskId: string,
  status: string,
  outputJson?: unknown,
  errorMessage?: string
) {
  const db = createServiceClient();
  await db
    .from("agent_tasks")
    .update({
      status,
      output_json: outputJson ?? null,
      error_message: errorMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);
}

export async function logAgentDecision(
  userId: string,
  taskId: string | null,
  agentName: string,
  decision: string,
  reasoning: string,
  metadata?: unknown
) {
  const db = createServiceClient();
  await db.from("agent_decisions").insert({
    user_id: userId,
    task_id: taskId,
    agent_name: agentName,
    decision,
    reasoning,
    metadata: metadata ?? null,
    created_at: new Date().toISOString(),
  });
}
