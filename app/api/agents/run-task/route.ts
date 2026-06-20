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
    if (!taskId) {
      // Process the next queued task for this user
      const db = createServiceClient();
      const { data: nextTask } = await db
        .from("agent_tasks")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "queued")
        .order("priority", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!nextTask) return ok({ message: "No queued tasks." });
      return ok(await processQueuedTask(nextTask.id));
    }

    return ok(await processQueuedTask(taskId));
  } catch (error) {
    return fail(error);
  }
}
