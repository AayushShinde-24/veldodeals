import { createServiceClient } from "@/lib/integrations/supabase";
import { getRevenuePlan, isWithinPlan, type PlanKey } from "@/lib/revenue-os/pricing";

export type PlanLimitedResource = "campaigns" | "mailboxes" | "seats";

export class PlanLimitError extends Error {
  constructor(
    public readonly resource: PlanLimitedResource,
    public readonly plan: string,
    public readonly limit: number
  ) {
    super(`Your ${plan} plan limit for ${resource} has been reached.`);
    this.name = "PlanLimitError";
  }
}

export async function assertWithinPlan(userId: string, resource: PlanLimitedResource): Promise<void> {
  const db = createServiceClient();
  const { data: profile } = await db
    .from("profiles")
    .select("plan, workspace_id")
    .eq("id", userId)
    .maybeSingle();

  const planKey = normalizePlan(profile?.plan);
  const plan = getRevenuePlan(planKey);
  const workspaceId = profile?.workspace_id ? String(profile.workspace_id) : null;

  const usage = await getUsage(userId, workspaceId);
  if (resource === "campaigns") {
    if (!isWithinPlan(planKey, { campaigns: usage.campaigns, mailboxes: usage.mailboxes })) {
      throw new PlanLimitError(resource, plan.name, plan.maxCampaigns);
    }
    return;
  }

  if (resource === "mailboxes") {
    if (plan.maxMailboxes !== -1 && usage.mailboxes >= plan.maxMailboxes) {
      throw new PlanLimitError(resource, plan.name, plan.maxMailboxes);
    }
    return;
  }

  if (plan.maxTeamSeats !== -1 && usage.seats >= plan.maxTeamSeats) {
    throw new PlanLimitError(resource, plan.name, plan.maxTeamSeats);
  }
}

function normalizePlan(plan?: string | null): PlanKey {
  const key = plan ?? "solo";
  return (["solo", "team", "scale", "enterprise", "enterprise_plus", "enterprise_max", "custom"] as const).includes(key as PlanKey)
    ? (key as PlanKey)
    : "solo";
}

async function getUsage(userId: string, workspaceId: string | null): Promise<{
  campaigns: number;
  mailboxes: number;
  seats: number;
}> {
  const db = createServiceClient();
  const [{ count: campaigns }, { count: mailboxes }, { count: seats }] = await Promise.all([
    db.from("campaigns").select("id", { count: "exact", head: true }).eq("user_id", userId),
    db.from("google_tokens").select("user_id", { count: "exact", head: true }).eq("user_id", userId),
    workspaceId
      ? db.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId)
      : db.from("workspace_members").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  return {
    campaigns: campaigns ?? 0,
    mailboxes: mailboxes ?? 0,
    seats: seats ?? 0,
  };
}
