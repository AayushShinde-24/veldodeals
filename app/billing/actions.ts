"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { createCheckoutSession } from "@/lib/integrations/billing-provider";
import type { PlanKey } from "@/lib/revenue-os/pricing";

export async function startCheckoutAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const plan = String(formData.get("plan") ?? "free") as PlanKey;
  const baseUrl = process.env.VELDO_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";
  const checkout = await createCheckoutSession({
    userId: user.id,
    plan,
    hyperPersonalization: formData.get("hyper_personalization") === "true",
    successUrl: `${baseUrl}/billing?checkout=success`,
    cancelUrl: `${baseUrl}/pricing?checkout=cancelled`,
  });
  redirect(checkout.checkoutUrl);
}
