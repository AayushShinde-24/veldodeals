"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { generateLeadsWithApollo } from "@/lib/leads/generation";

export async function findLeadsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const campaignId = String(formData.get("campaign_id") ?? "");
  if (!campaignId) return;
  await generateLeadsWithApollo({
    userId: user.id,
    campaignId,
    count: Number(formData.get("count") ?? 20),
    keywords: [formData.get("industry"), formData.get("company_size")].filter(Boolean).join(" "),
    titles: String(formData.get("role") ?? "Founder, VP Sales, Head of Growth"),
    location: String(formData.get("location") ?? "America"),
  });
  revalidatePath("/lead-finder");
  revalidatePath("/leads");
  revalidatePath(`/campaigns/${campaignId}`);
}
