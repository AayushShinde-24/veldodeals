import { ok, fail } from "@/lib/api/responses";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { invoiceDealFees } from "@/lib/billing/deal-fees";

// Aggregate the signed-in user's pending deal success fees into an invoice.
export async function POST() {
  try {
    const context = await getWorkspaceContext();
    if (!context) return fail(new Error("Sign in to invoice deal fees."), 401);
    return ok(await invoiceDealFees(context.userId));
  } catch (error) {
    return fail(error);
  }
}
