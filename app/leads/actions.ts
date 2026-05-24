"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { generateLeadsWithApollo } from "@/lib/leads/generation";

export async function generateLeadsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const selected = String(formData.get("lead_count") ?? "10");
  const custom = Number(formData.get("custom_count") ?? 0);
  const count = selected === "custom" ? custom : Number(selected);

  try {
    const result = await generateLeadsWithApollo({
      userId: user.id,
      count,
      keywords: String(formData.get("keywords") ?? "B2B SaaS revenue leaders"),
      location: String(formData.get("location") ?? "America"),
      companySize: String(formData.get("company_size") ?? ""),
      titles: String(formData.get("titles") ?? "Founder, VP Sales, Head of Growth"),
    });
    redirect(`/leads?generated=${result.saved}`);
  } catch (error) {
    redirect(`/leads?error=${encodeURIComponent(error instanceof Error ? error.message : "Lead generation failed")}`);
  }
}
