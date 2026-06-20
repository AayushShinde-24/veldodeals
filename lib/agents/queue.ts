import { createServiceClient } from "@/lib/integrations/supabase";
import { runTask } from "@/lib/agents/agent-runner";

const MAX_ATTEMPTS = 3;

interface ClaimedTask {
  id: string;
  agent_name: string | null;
  task_type: string | null;
  input_json: unknown;
  user_id?: string | null;
  campaign_id?: string | null;
  lead_id?: string | null;
  retry_count?: number | null;
}

/**
 * Atomically claim the next runnable task. Selects the highest-priority oldest
 * queued/pending row, then flips it to "running" guarded by its prior status so two
 * concurrent workers can't grab the same task (loser gets null and moves on).
 */
export async function claimNextTask(): Promise<ClaimedTask | null> {
  const db = createServiceClient();

  const { data: candidate } = await db
    .from("agent_tasks")
    .select("id")
    .in("status", ["queued", "pending"])
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!candidate?.id) return null;

  const { data: claimed } = await db
    .from("agent_tasks")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", candidate.id)
    .in("status", ["queued", "pending"]) // guard: only claim if still unclaimed
    .select("id, agent_name, task_type, input_json, user_id, campaign_id, lead_id, retry_count")
    .maybeSingle();

  return (claimed as ClaimedTask | null) ?? null;
}

/**
 * Drain up to `limit` tasks. runTask marks completed/failed itself; on failure we
 * requeue with an incremented attempt count until MAX_ATTEMPTS is exhausted.
 */
export async function drainQueue(
  limit = 10,
  maxAttempts = MAX_ATTEMPTS
): Promise<{ processed: number; completed: number; failed: number; requeued: number }> {
  const db = createServiceClient();
  let processed = 0;
  let completed = 0;
  let failed = 0;
  let requeued = 0;

  for (let i = 0; i < limit; i += 1) {
    const task = await claimNextTask();
    if (!task) break;
    processed += 1;

    try {
      await runTask(task);
      completed += 1;
    } catch {
      // runTask already flipped this row to "failed" and recorded the message.
      const attempts = (task.retry_count ?? 0) + 1;
      if (attempts < maxAttempts) {
        await db
          .from("agent_tasks")
          .update({ status: "queued", retry_count: attempts, updated_at: new Date().toISOString() })
          .eq("id", task.id);
        requeued += 1;
      } else {
        failed += 1;
      }
    }
  }

  return { processed, completed, failed, requeued };
}
