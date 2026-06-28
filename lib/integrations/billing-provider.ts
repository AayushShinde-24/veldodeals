import { fetchWithRetry, isTransientError } from "@/lib/integrations/retry";
import { getRevenuePlan, paygRates, plans, type PlanKey } from "@/lib/revenue-os/pricing";

// ─────────────────────────────────────────────────────────────────────────
// Payments provider: Dodo Payments (merchant-of-record). Replaces Stripe.
// Creates a hosted Checkout Session (POST /checkouts) and returns checkout_url.
// Fetch-based (no SDK) to match the rest of the integrations layer.
// ─────────────────────────────────────────────────────────────────────────

interface CheckoutOptions {
  userId: string;
  email?: string;
  plan: string;
  successUrl: string;
  cancelUrl: string;
  hyperPersonalization?: boolean;
  mode?: "subscription" | "addon";
  [key: string]: unknown;
}

function dodoBaseUrl(): string {
  if (process.env.DODO_API_BASE) return process.env.DODO_API_BASE.replace(/\/$/, "");
  return process.env.DODO_ENVIRONMENT === "live"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

function normalizePlanKey(plan: string): PlanKey {
  if (plan in plans) return plan as PlanKey;
  throw new Error(`Unknown plan: ${plan}`);
}

/** Dodo product id for a plan, by checkout mode. Configure per plan in env. */
function productIdForPlan(plan: PlanKey, mode: "subscription" | "addon"): string {
  const prefix = mode === "addon" ? "DODO_ADDON_" : "DODO_PRODUCT_";
  return process.env[`${prefix}${plan.toUpperCase()}_ID`] ?? "";
}

export async function createCheckoutSession(options: CheckoutOptions) {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DODO_PAYMENTS_API_KEY is not configured. Add it to your .env.local file to enable billing."
    );
  }

  const planKey = normalizePlanKey(options.plan);
  const plan = getRevenuePlan(planKey);
  const checkoutMode = options.mode ?? "subscription";
  const productId = productIdForPlan(planKey, checkoutMode);

  if (checkoutMode === "subscription" && plan.priceMonthlyUsd === null) {
    throw new Error(`${plan.name} is not available through self-serve checkout.`);
  }
  if (!productId) {
    throw new Error(`Dodo product ID is not configured for ${checkoutMode} checkout on plan: ${planKey}`);
  }

  const purchasedCredits =
    checkoutMode === "addon" && plan.addOnUsd ? Math.round(plan.addOnUsd / paygRates.creditUsd) : null;

  const body: Record<string, unknown> = {
    product_cart: [{ product_id: productId, quantity: 1 }],
    return_url: options.successUrl,
    metadata: {
      user_id: options.userId,
      plan: planKey,
      kind: checkoutMode,
      ...(purchasedCredits !== null ? { credits: String(purchasedCredits) } : {}),
      ...(options.hyperPersonalization ? { hyper_personalization: "true" } : {}),
    },
    ...(options.email ? { customer: { email: options.email } } : {}),
  };

  const res = await fetchWithRetry(
    `${dodoBaseUrl()}/checkouts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    { provider: "dodo", endpoint: "checkouts", shouldRetry: isTransientError, timeoutMs: 15_000 }
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new Error(`Dodo error: ${err.message ?? err.error ?? res.statusText}`);
  }

  const session = (await res.json()) as { session_id?: string; checkout_url?: string };
  return {
    id: session.session_id ?? "",
    checkoutUrl: session.checkout_url ?? "",
    url: session.checkout_url ?? "",
    plan: planKey,
    mode: checkoutMode,
  };
}
