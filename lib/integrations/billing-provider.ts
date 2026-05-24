import "server-only";

import { getOptionalEnv } from "@/lib/security/env";
import { revenuePlans, type PlanKey } from "@/lib/revenue-os/pricing";

export type CheckoutInput = {
  userId: string;
  plan: PlanKey;
  hyperPersonalization?: boolean;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutResult = {
  provider: "stripe" | "mock";
  checkoutUrl: string;
  mode: "live" | "mock";
  plan: PlanKey;
};

const placeholderPriceIds: Record<PlanKey, string> = {
  free: "free",
  starter: "price_starter_monthly",
  go: "price_go_monthly",
  pro: "price_pro_monthly",
  plus: "price_plus_monthly",
  grow: "price_grow_monthly",
  expand: "price_expand_monthly",
  advanced_expansion: "price_advanced_expansion_monthly",
  custom_enterprise: "contact_sales",
};

export function getBillingCatalog() {
  return revenuePlans.map((plan) => ({
    ...plan,
    priceId: process.env[`STRIPE_PRICE_${plan.key.toUpperCase()}`] ?? placeholderPriceIds[plan.key],
  }));
}

export async function createCheckoutSession(input: CheckoutInput): Promise<CheckoutResult> {
  const env = getOptionalEnv();
  const plan = revenuePlans.find((item) => item.key === input.plan);
  if (!plan) throw new Error("Unknown billing plan.");
  if (plan.key === "free") return { provider: "mock", checkoutUrl: input.successUrl, mode: "mock", plan: input.plan };
  if (plan.key === "custom_enterprise") return { provider: "mock", checkoutUrl: "/pricing#contact-sales", mode: "mock", plan: input.plan };

  if (!env?.STRIPE_SECRET_KEY) {
    return {
      provider: "mock",
      checkoutUrl: `/billing?checkout=mock&plan=${input.plan}`,
      mode: "mock",
      plan: input.plan,
    };
  }

  const price = process.env[`STRIPE_PRICE_${input.plan.toUpperCase()}`];
  if (typeof price !== "string" || !price.trim()) throw new Error(`Stripe price id is missing for ${input.plan}.`);

  const body = new URLSearchParams({
    mode: "subscription",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    "metadata[user_id]": input.userId,
    "metadata[plan]": input.plan,
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) throw new Error("Billing checkout could not be created.");
  const json = await response.json() as { url?: string };
  if (!json.url) throw new Error("Billing checkout did not return a URL.");
  return { provider: "stripe", checkoutUrl: json.url, mode: "live", plan: input.plan };
}
