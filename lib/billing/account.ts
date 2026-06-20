import { createServiceClient } from "@/lib/integrations/supabase";
import { planIsPayg, planHasSeatSharing } from "@/lib/revenue-os/pricing";

export interface CreditAccount {
  /** Whose balance/usage this user's spend draws from. */
  billingUserId: string;
  plan: string;
  /** Pay-as-you-go: accrue dollars instead of debiting a balance. */
  payg: boolean;
  /** Team plan: credits pooled at the workspace owner. */
  pooled: boolean;
  workspaceId: string | null;
}

/**
 * Resolve which account a user's credit spend hits. On team plans (Scale/Enterprise),
 * all seats draw from a single pooled balance held by the workspace owner. On PAYG
 * (Custom Enterprise), spend accrues dollars rather than depleting a balance.
 */
export async function resolveCreditAccount(userId: string): Promise<CreditAccount> {
  const db = createServiceClient();
  const { data: profile } = await db
    .from("profiles")
    .select("plan, workspace_id")
    .eq("id", userId)
    .maybeSingle();

  const plan = profile?.plan ?? "free";
  const workspaceId = profile?.workspace_id ?? null;
  const payg = planIsPayg(plan);
  const pooled = planHasSeatSharing(plan);

  let billingUserId = userId;
  if (pooled && workspaceId) {
    const { data: workspace } = await db
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .maybeSingle();
    if (workspace?.owner_id) billingUserId = workspace.owner_id;
  }

  return { billingUserId, plan, payg, pooled, workspaceId };
}

/** Seat usage vs the plan's seat cap — used to enforce the 1-5 Scale limit. */
export async function getSeatUsage(workspaceId: string): Promise<{ used: number }> {
  const db = createServiceClient();
  const { count } = await db
    .from("workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  return { used: count ?? 0 };
}
