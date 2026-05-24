import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { processQueuedTask, runTask } from "@/lib/agents/agent-runner";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";
import type { AgentTaskRow } from "@/lib/agents/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    const taskId = typeof body.task_id === "string" ? body.task_id : null;
    if (!taskId) return ok(await processQueuedTask(userId));

    const { data, error } = await createServiceClient()
      .from("agent_tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("id", taskId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Task not found.");
    return ok(await runTask(data as AgentTaskRow));
  } catch (error) {
    return fail(error);
  }
}
