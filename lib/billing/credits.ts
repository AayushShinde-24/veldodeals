import { creditCosts } from "@/lib/revenue-os/pricing";
import { applyLedgerEntry, getBalance } from "@/lib/billing/ledger";

// NOTE: credit movement is delegated to the atomic, idempotent ledger
// (lib/billing/ledger.ts → apply_credit_ledger). These wrappers preserve the
// historical call signatures used across the app.

export async function getCredits(userId: string): Promise<number> {
  return getBalance(userId);
}

export async function deductCredits(
  userId: string,
  operation: string,
  count = 1
): Promise<{ success: boolean; remaining: number; error?: string }> {
  const cost = (creditCosts[operation] ?? 1) * count;
  const result = await applyLedgerEntry(userId, {
    creditChange: -Math.abs(cost),
    reason: operation,
    metadata: { operation, count },
  });
  return { success: result.success, remaining: result.balance, error: result.error };
}

export async function recordCreditUsage(
  userIdOrOptions: string | { userId: string; workspaceId?: string; campaignId?: string | null; action?: string; operation?: string; quantity?: number; amount?: number; metadata?: unknown },
  operation?: string,
  amount?: number
): Promise<void> {
  let userId: string;
  let op: string;
  let amt: number;
  let meta: Record<string, unknown> = {};

  if (typeof userIdOrOptions === "string") {
    userId = userIdOrOptions;
    op = operation ?? "unknown";
    amt = amount ?? 1;
  } else {
    userId = userIdOrOptions.userId;
    op = userIdOrOptions.action ?? userIdOrOptions.operation ?? "unknown";
    amt = userIdOrOptions.quantity ?? userIdOrOptions.amount ?? 1;
    meta = {
      workspaceId: userIdOrOptions.workspaceId,
      campaignId: userIdOrOptions.campaignId,
      ...(typeof userIdOrOptions.metadata === "object" && userIdOrOptions.metadata ? userIdOrOptions.metadata : {}),
    };
  }

  await applyLedgerEntry(userId, { creditChange: -Math.abs(amt), reason: op, metadata: meta });
}

export async function addCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; newBalance: number }> {
  const result = await applyLedgerEntry(userId, { creditChange: Math.abs(amount), reason, metadata: { reason } });
  return { success: result.success, newBalance: result.balance };
}
