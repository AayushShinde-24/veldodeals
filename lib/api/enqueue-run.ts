import { createServiceClient } from "@/lib/integrations/supabase";

export interface EnqueueRunOptions {
  userId: string;
  campaignId?: string | null;
  leadId?: string | null;
  agentName: string;
  taskType: string;
  inputJson?: unknown;
  priority?: number;
}

export async function enqueueAndRun(options: EnqueueRunOptions) {
  const db = createServiceClient();

  const { data: task, error } = await db
    .from("agent_tasks")
    .insert({
      user_id: options.userId,
      campaign_id: options.campaignId,
      lead_id: options.leadId ?? null,
      agent_name: options.agentName,
      task_type: options.taskType,
      status: "queued",
      priority: options.priority ?? 1,
      input_json: options.inputJson ?? null,
      created_at: new Date().toISOString(),
    })
    .select("id, agent_name, task_type, status, created_at")
    .single();

  if (error) throw new Error(`Failed to queue task: ${error.message}`);

  return {
    taskId: task.id,
    agentName: task.agent_name,
    taskType: task.task_type,
    status: task.status,
    message: `Task queued for ${task.agent_name}. Check /agents for execution status.`,
  };
}
