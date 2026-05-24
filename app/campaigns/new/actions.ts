"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { createCampaignAndRun } from "@/src/lib/mvp/campaign-flow";

const DEFAULT_TONE = "clear, direct, professional";
const DEFAULT_CALL_TO_ACTION = "Open to a quick conversation?";

export async function createMvpCampaignAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const campaign = await createCampaignAndRun(user.id, {
    name: String(formData.get("name") ?? ""),
    product_offer: String(formData.get("product_offer") ?? ""),
    goal: String(formData.get("goal") ?? ""),
    target_niche: String(formData.get("target_niche") ?? ""),
    industry: mergeCommaValues("", formData.getAll("market_sector")),
    location: String(formData.get("location") ?? ""),
    company_size: String(formData.get("company_size") ?? ""),
    job_titles: mergeCommaValues(String(formData.get("job_titles") ?? ""), formData.getAll("job_title_preset")),
    number_of_leads: String(formData.get("number_of_leads") ?? "10"),
    tone: String(formData.get("tone") ?? DEFAULT_TONE),
    call_to_action: String(formData.get("call_to_action") ?? DEFAULT_CALL_TO_ACTION),
    campaign_type: String(formData.get("campaign_type") ?? "sales"),
    hyper_personalization: formData.get("hyper_personalization") === "true",
  });
  redirect(`/campaigns/${campaign.id}`);
}

function mergeCommaValues(primary: string, ...groups: FormDataEntryValue[][]) {
  return [primary, ...groups.flat().map(String)]
    .join(",")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)
    .join(", ");
}
