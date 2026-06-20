import { fetchWithRetry, isTransientError } from "@/lib/integrations/retry";
import { getRevenuePlan, paygRates, plans, type PlanKey } from "@/lib/revenue-os/pricing";

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

export async function createCheckoutSession(options: CheckoutOptions) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Add it to your .env.local file to enable billing."
    );
  }

  const planKey = normalizePlanKey(options.plan);
  const plan = getRevenuePlan(planKey);
  const checkoutMode = options.mode ?? "subscription";
  const priceId = checkoutMode === "addon" ? addonPriceIdForPlan(planKey) : subscriptionPriceIdForPlan(planKey);

  if (checkoutMode === "subscription" && plan.priceMonthlyUsd === null) {
    throw new Error(`${plan.name} is not available through self-serve checkout.`);
  }

  if (!priceId) {
    throw new Error(`Stripe price ID is not configured for ${checkoutMode} checkout on plan: ${planKey}`);
  }

  const purchasedCredits = checkoutMode === "addon" && plan.addOnUsd
    ? Math.round(plan.addOnUsd / paygRates.creditUsd)
    : null;

  const params: Record<string, string> = {
    "payment_method_types[]": "card",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    mode: checkoutMode === "addon" ? "payment" : "subscription",
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    "metadata[user_id]": options.userId,
    "metadata[plan]": planKey,
    "metadata[kind]": checkoutMode,
  };
  if (purchasedCredits !== null) params["metadata[credits]"] = String(purchasedCredits);
  if (options.email) params.customer_email = options.email;
  const body = new URLSearchParams(params);

  const res = await fetchWithRetry(
    "https://api.stripe.com/v1/checkout/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
    { provider: "stripe", endpoint: "checkout.sessions", shouldRetry: isTransientError, timeoutMs: 15_000 }
  );

  if (!res.ok) {
    const err = (await res.json()) as { error?: { message?: string } };
    throw new Error(`Stripe error: ${err.error?.message ?? res.statusText}`);
  }

  const session = (await res.json()) as { id: string; url: string };
  return { ...session, checkoutUrl: session.url, plan: planKey, mode: checkoutMode };
}

function normalizePlanKey(plan: string): PlanKey {
  if (plan in plans) return plan as PlanKey;
  throw new Error(`Unknown plan: ${plan}`);
}

function subscriptionPriceIdForPlan(plan: PlanKey): string {
  const envKey = `STRIPE_${plan.toUpperCase()}_PRICE_ID`;
  return process.env[envKey] ?? "";
}

function addonPriceIdForPlan(plan: PlanKey): string {
  const envKey = `STRIPE_ADDON_${plan.toUpperCase()}_PRICE_ID`;
  return process.env[envKey] ?? "";
}
