import { computeCreditCost, type CostOptions } from "@/lib/revenue-os/pricing";
import { debit, getBalance, type LedgerResult } from "@/lib/billing/ledger";
import { resolveCreditAccount } from "@/lib/billing/account";
import { recordPaygUsage } from "@/lib/billing/payg";

export interface ConsumeOptions extends CostOptions {
  /** Stable key so a retried action doesn't double-charge (e.g. `send:<draftId>`). */
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface ConsumeResult extends LedgerResult {
  cost: number;
  /** Set on pay-as-you-go plans: dollars accrued for this action. */
  paygAmountUsd?: number;
}

/**
 * Charge a user for an action using the authoritative consumption rules.
 * - Team plans: debits the workspace's pooled balance (resolved owner).
 * - Pay-as-you-go (Custom Enterprise): accrues dollars instead of depleting a balance.
 * - Everyone else: atomic, idempotent debit through the credit ledger.
 * This is the function every agent/route should call before doing paid work.
 */
export async function consumeCredits(
  userId: string,
  action: string,
  options: ConsumeOptions = {}
): Promise<ConsumeResult> {
  const cost = computeCreditCost(action, options);
  if (cost <= 0) {
    return { success: true, balance: await getBalance(userId), cost: 0 };
  }

  const account = await resolveCreditAccount(userId);

  if (account.payg) {
    const { amountUsd } = await recordPaygUsage({
      userId: account.billingUserId,
      workspaceId: account.workspaceId,
      action,
      credits: cost,
      hyperPersonalization: options.hyperPersonalization,
    });
    return { success: true, balance: -1, cost, paygAmountUsd: amountUsd };
  }

  const result = await debit(account.billingUserId, cost, action, {
    idempotencyKey: options.idempotencyKey,
    metadata: {
      action,
      onBehalfOf: account.billingUserId !== userId ? userId : undefined,
      hyperPersonalization: !!options.hyperPersonalization,
      quantity: options.quantity ?? 1,
      ...options.metadata,
    },
  });
  return { ...result, cost };
}

/** Check affordability without charging. PAYG is always affordable (billed in arrears). */
export async function canAfford(userId: string, action: string, options: CostOptions = {}): Promise<boolean> {
  const cost = computeCreditCost(action, options);
  if (cost <= 0) return true;
  const account = await resolveCreditAccount(userId);
  if (account.payg) return true;
  return (await getBalance(account.billingUserId)) >= cost;
}
