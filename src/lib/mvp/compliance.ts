import "server-only";

import { z } from "zod";
import { createServiceClient } from "@/lib/integrations/supabase";
import { logMvpError } from "@/src/lib/mvp/error-log";

export const complianceInputSchema = z.object({
  company_name: z.string().min(1, "Company name is required."),
  business_website: z.string().min(1, "Business website is required."),
  business_email: z.string().email("Business email must be valid."),
  physical_mailing_address: z.string().min(1, "Business mailing address is required."),
  outreach_purpose: z.string().min(1, "Outreach purpose is required."),
  target_audience: z.string().min(1, "Target audience is required."),
  compliance_confirmation: z.coerce.boolean().refine(Boolean, "Compliance confirmation is required."),
});

export type UserCompliance = {
  id: string;
  user_id: string;
  company_name: string;
  business_website: string;
  business_email: string;
  physical_mailing_address: string;
  outreach_purpose: string;
  target_audience: string;
  compliance_confirmation: boolean;
  compliance_confirmed_at: string | null;
};

export async function getUserCompliance(userId: string) {
  const { data, error } = await createServiceClient()
    .from("user_compliance")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as UserCompliance | null;
}

export async function saveUserCompliance(userId: string, raw: unknown) {
  const input = complianceInputSchema.parse(raw);
  const { data, error } = await createServiceClient()
    .from("user_compliance")
    .upsert({
      user_id: userId,
      ...input,
      compliance_confirmed_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as UserCompliance;
}

export async function assertComplianceReady(userId: string, campaignId?: string) {
  const compliance = await getUserCompliance(userId);
  const missing: string[] = [];
  if (!compliance?.company_name) missing.push("company_name");
  if (!compliance?.business_website) missing.push("business_website");
  if (!compliance?.business_email) missing.push("business_email");
  if (!compliance?.physical_mailing_address) missing.push("physical_mailing_address");
  if (!compliance?.outreach_purpose) missing.push("outreach_purpose");
  if (!compliance?.target_audience) missing.push("target_audience");
  if (!compliance?.compliance_confirmation || !compliance.compliance_confirmed_at) missing.push("compliance_confirmation");

  if (missing.length) {
    await logMvpError({
      userId,
      campaignId,
      source: "compliance",
      errorCode: "compliance_incomplete",
      error: `Complete compliance setup before sending. Missing: ${missing.join(", ")}`,
    });
    throw new Error("Complete compliance setup before sending.");
  }

  return compliance as UserCompliance;
}
