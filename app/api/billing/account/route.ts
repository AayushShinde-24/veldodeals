import { ok, fail } from "@/lib/api/responses";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { resolveCreditAccount } from "@/lib/billing/account";
import { getBalance } from "@/lib/billing/ledger";
import { getPaygAccrued } from "@/lib/billing/payg";
import { getOutstandingDealFees } from "@/lib/billing/deal-fees";

// Billing summary: balance / plan / pay-as-you-go accrual / outstanding deal fees.
export async function GET() {
  try {
    const context = await getWorkspaceContext();
    if (!context) return fail(new Error("Sign in to view billing."), 401);

    const account = await resolveCreditAccount(context.userId);
    const [balance, payg, dealFees] = await Promise.all([
      getBalance(account.billingUserId),
      getPaygAccrued(account.billingUserId),
      getOutstandingDealFees(context.userId),
    ]);

    return ok({
      plan: account.plan,
      pooled: account.pooled,
      payg: account.payg,
      balance: account.payg ? null : balance,
      paygAccruedUsd: account.payg ? payg.amountUsd : 0,
      paygUsageCount: payg.count,
      dealFeesOutstandingUsd: dealFees.total,
      dealFeesCount: dealFees.count,
    });
  } catch (error) {
    return fail(error);
  }
}
