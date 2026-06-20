import { createServiceClient } from "@/lib/integrations/supabase";
import { applyLedgerEntry } from "@/lib/billing/ledger";
import { plans } from "@/lib/revenue-os/pricing";

// Legacy free-tier grant (the current ladder has no free tier; retained as a no-op
// safety net for any historical plan='free' rows).
const FREE_MONTHLY_CREDITS = 2000;
void plans;

/**
 * Refill free-tier users to their monthly allowance (200 credits). Idempotent per
 * calendar month via the ledger idempotency key, so double-firing the cron is safe.
 * Only tops UP (never removes) so any purchased add-on credits survive the refill.
 */
export async function grantMonthlyFreeCredits(): Promise<{ granted: number; scanned: number }> {
  const db = createServiceClient();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM

  const { data: due } = await db
    .from("profiles")
    .select("id, credits, credits_period_start")
    .eq("plan", "free")
    .or(`credits_period_start.is.null,credits_period_start.lt.${monthAgo}`)
    .limit(1000);

  let granted = 0;
  for (const profile of due ?? []) {
    const balance = profile.credits ?? 0;
    const topUp = Math.max(0, FREE_MONTHLY_CREDITS - balance);
    if (topUp > 0) {
      const result = await applyLedgerEntry(profile.id, {
        creditChange: topUp,
        reason: "monthly_free_grant",
        idempotencyKey: `free_grant:${profile.id}:${period}`,
        metadata: { period },
      });
      if (result.success) granted += 1;
    }
    await db.from("profiles").update({ credits_period_start: new Date().toISOString() }).eq("id", profile.id);
  }

  return { granted, scanned: due?.length ?? 0 };
}
