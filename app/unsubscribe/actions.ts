"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/integrations/supabase";
import { recordUnsubscribe } from "@/src/lib/mvp/unsubscribe";

export async function unsubscribeAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const campaignId = String(formData.get("campaign_id") ?? "").trim();
  if (!email || !campaignId) redirect("/unsubscribe?error=missing");

  const { data: campaign } = await createServiceClient()
    .from("campaigns")
    .select("user_id")
    .eq("id", campaignId)
    .maybeSingle();

  await recordUnsubscribe({
    userId: campaign?.user_id ?? null,
    campaignId,
    email,
    reason: String(formData.get("reason") ?? ""),
  });
  redirect(`/unsubscribe/confirmed?email=${encodeURIComponent(email)}`);
}
