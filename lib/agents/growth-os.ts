import { createServiceClient } from "@/lib/integrations/supabase";

export async function analyzeBusiness(
  userId: string,
  input?: Record<string, unknown>
) {
  return {
    analysis: {},
    message: "Business analysis requires agent implementation. Configure ANTHROPIC_API_KEY.",
    userId,
    input: input ?? {},
  };
}

export async function getAgentStatus(userId: string) {
  const db = createServiceClient();
  const [tasks, campaigns] = await Promise.all([
    db
      .from("agent_tasks")
      .select("status, agent_name, task_type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("campaigns")
      .select("id, name, status")
      .eq("user_id", userId)
      .in("status", ["running", "fetching_leads", "generating_emails", "sending"])
      .limit(5),
  ]);

  const taskData = tasks.data ?? [];
  const running = taskData.filter((t) => t.status === "running").length;
  const queued = taskData.filter((t) => t.status === "queued").length;
  const failed = taskData.filter((t) => t.status === "failed").length;

  return {
    status: running > 0 ? "active" : queued > 0 ? "queued" : "idle",
    running,
    queued,
    failed,
    activeCampaigns: campaigns.data ?? [],
    recentTasks: taskData.slice(0, 10),
  };
}

export async function orchestrateGrowthTask(
  userId: string,
  input: Record<string, unknown>
) {
  return {
    taskId: null,
    message: "Growth orchestration requires agent implementation. Connect ANTHROPIC_API_KEY.",
    input,
  };
}

export async function generateGrowthPlan(
  userId: string,
  input: Record<string, unknown>
) {
  return {
    plan: [],
    summary: "Growth plan generation requires ANTHROPIC_API_KEY to be configured.",
    userId,
    input,
  };
}

export async function findExpansionOpportunities(
  userId: string,
  input: Record<string, unknown>
) {
  return {
    opportunities: [],
    message: "Expansion analysis requires agent system configuration.",
    userId,
    input,
  };
}
