import { createServiceClient } from "@/lib/integrations/supabase";
import { paygRates } from "@/lib/revenue-os/pricing";

/**
 * Dollar cost of N credits under pay-as-you-go. Hyper-personalized credits bill at the
 * higher rate ($0.125 vs $0.10). Rounded to cents.
 */
export function computePaygCost(credits: number, hyperPersonalization = false): number {
  if (!Number.isFinite(credits) || credits <= 0) return 0;
  const unit = hyperPersonalization ? paygRates.hyperPersonalizedCreditUsd : paygRates.creditUsd;
  return Math.round(credits * unit * 100) / 100;
}

export function paygUnitRate(hyperPersonalization = false): number {
  return hyperPersonalization ? paygRates.hyperPersonalizedCreditUsd : paygRates.creditUsd;
}

/** Accrue a billable PAYG line item for a Custom Enterprise user. */
export async function recordPaygUsage(input: {
  userId: string;
  workspaceId?: string | null;
  action: string;
  credits: number;
  hyperPersonalization?: boolean;
}): Promise<{ amountUsd: number }> {
  const amountUsd = computePaygCost(input.credits, input.hyperPersonalization);
  const db = createServiceClient();
  await db.from("payg_usage").insert({
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    action: input.action,
    credits: input.credits,
    hyper_personalized: !!input.hyperPersonalization,
    unit_usd: paygUnitRate(input.hyperPersonalization),
    amount_usd: amountUsd,
    status: "unbilled",
    created_at: new Date().toISOString(),
  });
  return { amountUsd };
}

/** Sum of unbilled PAYG accrual for a user — surfaced on billing + used for invoicing. */
export async function getPaygAccrued(userId: string): Promise<{ amountUsd: number; credits: number; count: number }> {
  const db = createServiceClient();
  const { data } = await db
    .from("payg_usage")
    .select("amount_usd, credits, status")
    .eq("user_id", userId)
    .eq("status", "unbilled");
  const rows = data ?? [];
  return {
    amountUsd: Math.round(rows.reduce((s, r) => s + Number(r.amount_usd ?? 0), 0) * 100) / 100,
    credits: rows.reduce((s, r) => s + Number(r.credits ?? 0), 0),
    count: rows.length,
  };
}
