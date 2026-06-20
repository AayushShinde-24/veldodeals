import { createServiceClient } from "@/lib/integrations/supabase";

export class InsufficientCreditsError extends Error {
  constructor(public readonly have: number, public readonly need: number) {
    super(`Insufficient credits. Have ${have}, need ${need}.`);
    this.name = "InsufficientCreditsError";
  }
}

export interface LedgerEntryInput {
  /** Positive = grant/refund; negative = consumption. */
  creditChange: number;
  reason: string;
  /** Provide a stable key to make the movement idempotent (safe to retry). */
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface LedgerResult {
  success: boolean;
  balance: number;
  error?: string;
}

/**
 * The ONE way credits move. Delegates to the atomic, idempotent Postgres function
 * `apply_credit_ledger` so balance + ledger row are always consistent and concurrent
 * callers can't race. Never let two code paths mutate `profiles.credits` directly.
 */
export async function applyLedgerEntry(userId: string, entry: LedgerEntryInput): Promise<LedgerResult> {
  const db = createServiceClient();
  const { data, error } = await db.rpc("apply_credit_ledger", {
    p_user: userId,
    p_change: entry.creditChange,
    p_reason: entry.reason,
    p_idem: entry.idempotencyKey ?? null,
    p_meta: entry.metadata ?? {},
  });

  if (error) {
    if (/INSUFFICIENT_CREDITS/u.test(error.message)) {
      const balance = await getBalance(userId);
      return { success: false, balance, error: "Insufficient credits." };
    }
    return { success: false, balance: 0, error: error.message };
  }

  return { success: true, balance: Number(data ?? 0) };
}

/** Debit credits (consumption). cost must be a positive integer. */
export async function debit(
  userId: string,
  cost: number,
  reason: string,
  opts?: { idempotencyKey?: string; metadata?: Record<string, unknown> }
): Promise<LedgerResult> {
  if (cost <= 0) return { success: true, balance: await getBalance(userId) };
  return applyLedgerEntry(userId, { creditChange: -Math.abs(cost), reason, ...opts });
}

/** Credit credits (grant/refund/purchase). amount must be a positive integer. */
export async function credit(
  userId: string,
  amount: number,
  reason: string,
  opts?: { idempotencyKey?: string; metadata?: Record<string, unknown> }
): Promise<LedgerResult> {
  return applyLedgerEntry(userId, { creditChange: Math.abs(amount), reason, ...opts });
}

export async function getBalance(userId: string): Promise<number> {
  const db = createServiceClient();
  const { data } = await db.from("profiles").select("credits").eq("id", userId).maybeSingle();
  return data?.credits ?? 0;
}
