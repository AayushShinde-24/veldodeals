import { createServiceClient } from "@/lib/integrations/supabase";

// Veldo takes a percentage of every deal closed through it — on EVERY tier, free or
// paid (see memory: veldo-pricing-model). Kept configurable via env for flexibility.
export const DEFAULT_DEAL_FEE_PCT = Number(process.env.VELDO_DEAL_FEE_PCT ?? 2.5);

export type DealType = "sales" | "fundraising" | "distribution";

/** Pure fee calculation. Rounded to cents. */
export function computeDealFee(dealValue: number, feePct: number = DEFAULT_DEAL_FEE_PCT): number {
  if (!Number.isFinite(dealValue) || dealValue <= 0) return 0;
  return Math.round(dealValue * (feePct / 100) * 100) / 100;
}

export interface RecordDealCloseInput {
  userId: string;
  workspaceId?: string | null;
  dealId?: string | null;
  dealType?: DealType;
  dealValue: number;
  feePct?: number;
  currency?: string;
}

export interface DealFee {
  id: string;
  dealValue: number;
  feePct: number;
  feeAmount: number;
  status: string;
}

/**
 * Record the 2.5% (configurable) fee owed on a closed deal. Called when a deal reaches
 * a won/closed stage in any pillar. The fee row feeds invoicing (Phase 4).
 */
export async function recordDealClose(input: RecordDealCloseInput): Promise<DealFee> {
  const feePct = input.feePct ?? DEFAULT_DEAL_FEE_PCT;
  const feeAmount = computeDealFee(input.dealValue, feePct);
  const db = createServiceClient();

  const { data, error } = await db
    .from("deal_fees")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      deal_id: input.dealId ?? null,
      deal_type: input.dealType ?? "sales",
      deal_value: input.dealValue,
      fee_pct: feePct,
      fee_amount: feeAmount,
      currency: input.currency ?? "usd",
      status: "pending",
      created_at: new Date().toISOString(),
    })
    .select("id, deal_value, fee_pct, fee_amount, status")
    .single();

  if (error || !data) throw new Error(`Failed to record deal fee: ${error?.message}`);
  return {
    id: data.id,
    dealValue: Number(data.deal_value),
    feePct: Number(data.fee_pct),
    feeAmount: Number(data.fee_amount),
    status: data.status,
  };
}

/** Sum of outstanding (pending/invoiced) fees for a user — feeds the billing surface. */
export async function getOutstandingDealFees(userId: string): Promise<{ total: number; count: number }> {
  const db = createServiceClient();
  const { data } = await db
    .from("deal_fees")
    .select("fee_amount, status")
    .eq("user_id", userId)
    .in("status", ["pending", "invoiced"]);
  const rows = data ?? [];
  return { total: rows.reduce((sum, r) => sum + Number(r.fee_amount ?? 0), 0), count: rows.length };
}

/**
 * Aggregate a user's pending deal fees and mark them invoiced. Creates a Stripe invoice
 * item when Stripe is configured (best-effort); otherwise just transitions status so the
 * amount is owed and surfaced. Idempotent-ish: only acts on currently-pending rows.
 */
export async function invoiceDealFees(userId: string): Promise<{ invoiced: number; amount: number }> {
  const db = createServiceClient();
  const { data: pending } = await db
    .from("deal_fees")
    .select("id, fee_amount, currency")
    .eq("user_id", userId)
    .eq("status", "pending");

  const rows = pending ?? [];
  if (rows.length === 0) return { invoiced: 0, amount: 0 };

  const amount = Math.round(rows.reduce((s, r) => s + Number(r.fee_amount ?? 0), 0) * 100) / 100;
  const currency = (rows[0]?.currency as string) ?? "usd";

  // Best-effort Stripe invoice item (skipped without a key or customer mapping).
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (secretKey && amount > 0) {
    const { data: profile } = await db.from("profiles").select("stripe_customer_id").eq("id", userId).maybeSingle();
    const customer = (profile as { stripe_customer_id?: string } | null)?.stripe_customer_id;
    if (customer) {
      const { fetchWithRetry, isTransientError } = await import("@/lib/integrations/retry");
      await fetchWithRetry(
        "https://api.stripe.com/v1/invoiceitems",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            customer,
            amount: String(Math.round(amount * 100)),
            currency,
            description: `Veldo deal success fee (${rows.length} deal${rows.length === 1 ? "" : "s"})`,
          }).toString(),
        },
        { provider: "stripe", endpoint: "invoiceitems", shouldRetry: isTransientError, timeoutMs: 15_000 }
      ).catch(() => {});
    }
  }

  await db.from("deal_fees").update({ status: "invoiced" }).in("id", rows.map((r) => r.id));
  return { invoiced: rows.length, amount };
}
