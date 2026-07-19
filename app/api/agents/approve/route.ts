import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { isDemoMode } from "@/lib/demo/mode";
import { getCurrentUser } from "@/lib/auth/server";

const schema = z.object({
  taskId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
});

// Record a human approval decision on an agent task. In demo mode the decision is
// acknowledged (nothing to persist); with a live DB it updates agent_tasks so the
// runner can proceed or halt.
export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());

    if (isDemoMode()) {
      return ok({ taskId: input.taskId, decision: input.decision, persisted: false, demo: true });
    }

    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in to review approvals.");
    const { createServiceClient } = await import("@/lib/integrations/supabase");
    const db = createServiceClient();
    const status = input.decision === "approve" ? "approved" : "rejected";
    const { error } = await db
      .from("agent_tasks")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", input.taskId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return ok({ taskId: input.taskId, decision: input.decision, persisted: true });
  } catch (error) {
    return fail(error);
  }
}
