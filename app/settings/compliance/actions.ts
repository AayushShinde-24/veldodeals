"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { saveUserCompliance } from "@/src/lib/mvp/compliance";

export async function saveComplianceAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await saveUserCompliance(user.id, {
    company_name: String(formData.get("company_name") ?? ""),
    business_website: String(formData.get("business_website") ?? ""),
    business_email: String(formData.get("business_email") ?? ""),
    physical_mailing_address: String(formData.get("physical_mailing_address") ?? ""),
    outreach_purpose: String(formData.get("outreach_purpose") ?? ""),
    target_audience: String(formData.get("target_audience") ?? ""),
    compliance_confirmation: formData.get("compliance_confirmation") === "on",
  });
  redirect("/settings/compliance?saved=1");
}
