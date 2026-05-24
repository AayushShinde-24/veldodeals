import "server-only";

import { createServiceClient } from "@/lib/integrations/supabase";
import { type CreditAction, getCreditCost, getMonthlyCredits, getRevenuePlan } from "@/lib/revenue-os/pricing";

export async function assertCreditsAvailable(input: { userId: string; action: CreditAction; quantity?: number }) {
  const db = createServiceClient();
  const creditsNeeded = getCreditCost(input.action) * (input.quantity ?? 1);
  const { data, error } = await db.from("users").select("credits_balance").eq("id", input.userId).maybeSingle();
  if (error) throw new Error(error.message);
  const balance = Number(data?.credits_balance ?? 0);
  if (balance < creditsNeeded) throw new Error(`Insufficient credits. ${creditsNeeded} credit(s) required.`);
  return { balance, creditsNeeded };
}

export async function recordCreditUsage(input: {
  userId: string;
  workspaceId?: string | null;
  campaignId?: string | null;
  leadId?: string | null;
  action: CreditAction;
  quantity?: number;
  metadata?: Record<string, unknown>;
}) {
  const db = createServiceClient();
  const quantity = input.quantity ?? 1;
  const credits = getCreditCost(input.action) * quantity;
  const { data: user, error: userError } = await db.from("users").select("credits_balance").eq("id", input.userId).maybeSingle();
  if (userError) throw new Error(userError.message);
  const currentBalance = Number(user?.credits_balance ?? 0);
  const newBalance = currentBalance - credits;
  if (newBalance < 0) throw new Error(`Insufficient credits. ${credits} credit(s) required.`);

  const { data: usageEvent, error: usageError } = await db.from("usage_events").insert({
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    campaign_id: input.campaignId ?? null,
    lead_id: input.leadId ?? null,
    event_type: input.action,
    credits,
    metadata: { quantity, ...(input.metadata ?? {}) },
  }).select("*").single();
  if (usageError || !usageEvent) throw new Error(usageError?.message ?? "Usage event could not be recorded.");

  const { data: updated, error: updateError } = await db
    .from("users")
    .update({ credits_balance: newBalance })
    .eq("id", input.userId)
    .eq("credits_balance", currentBalance)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) throw new Error(updateError?.message ?? "Credits changed during usage accounting.");

  const { data: ledger, error: ledgerError } = await db.from("credits_ledger").insert({
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    usage_event_id: usageEvent.id,
    credit_change: -credits,
    reason: input.action,
    new_balance: newBalance,
  }).select("*").single();
  if (ledgerError) throw new Error(ledgerError.message);

  return { usageEvent, ledger, creditsUsed: credits, newBalance };
}

export async function resetMonthlyCreditsIfDue(userId: string) {
  const db = createServiceClient();
  const { data: user, error } = await db.from("users").select("plan,credits_balance,credit_reset_at").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  const plan = getRevenuePlan(String(user?.plan ?? "free"));
  const monthlyCredits = getMonthlyCredits(plan.key);
  if (!monthlyCredits) return { reset: false, credits: Number(user?.credits_balance ?? 0), plan };

  const resetAt = user?.credit_reset_at ? new Date(String(user.credit_reset_at)) : null;
  if (resetAt && resetAt.getTime() > Date.now()) return { reset: false, credits: Number(user?.credits_balance ?? 0), plan };

  const nextReset = new Date();
  nextReset.setUTCMonth(nextReset.getUTCMonth() + 1);
  const { error: updateError } = await db.from("users").update({
    credits_balance: monthlyCredits,
    credit_reset_at: nextReset.toISOString(),
  }).eq("id", userId);
  if (updateError) throw new Error(updateError.message);

  await db.from("credits_ledger").insert({
    user_id: userId,
    credit_change: monthlyCredits,
    reason: "monthly_credit_reset",
    new_balance: monthlyCredits,
  });

  return { reset: true, credits: monthlyCredits, plan };
}
