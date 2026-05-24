import "server-only";

import { createServiceClient } from "@/lib/integrations/supabase";
import type { UserCompliance } from "@/src/lib/mvp/compliance";
import { getEnv } from "@/lib/security/env";

export async function isUnsubscribed(input: { userId: string; email: string }) {
  const domain = input.email.split("@")[1]?.toLowerCase() ?? "";
  let query = createServiceClient()
    .from("unsubscribes")
    .select("id")
    .eq("user_id", input.userId)
    .limit(1);
  query = domain ? query.or(`email.ilike.${input.email},domain.eq.${domain}`) : query.ilike("email", input.email);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.id);
}

export async function recordUnsubscribe(input: { userId?: string | null; campaignId?: string | null; email: string; reason?: string }) {
  const { data, error } = await createServiceClient()
    .from("unsubscribes")
    .upsert({
      user_id: input.userId ?? null,
      campaign_id: input.campaignId ?? null,
      email: input.email.trim().toLowerCase(),
      domain: input.email.split("@")[1]?.trim().toLowerCase() ?? null,
      reason: input.reason ?? null,
      source: "public_link",
    }, { onConflict: "user_id,email" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export function buildUnsubscribeLink(input: { email: string; campaignId: string }) {
  const base = (getEnv().APP_URL ?? getEnv().VELDO_APP_URL).replace(/\/$/u, "");
  const url = new URL(`${base}/unsubscribe`);
  url.searchParams.set("email", input.email);
  url.searchParams.set("campaign_id", input.campaignId);
  return url.toString();
}

export function appendComplianceFooter(input: { body: string; compliance: UserCompliance; unsubscribeLink: string }) {
  const footer = [
    "",
    "--",
    "You are receiving this email because it may be relevant to your business role/company.",
    `Sent by ${input.compliance.company_name}.`,
    `Mailing address: ${input.compliance.physical_mailing_address}.`,
    `Unsubscribe: ${input.unsubscribeLink}`,
  ].join("\n");
  return `${input.body.trim()}\n${footer}`;
}

export function hasComplianceFooter(body: string) {
  return body.includes("You are receiving this email because it may be relevant to your business role/company.") &&
    body.includes("Mailing address:") &&
    body.includes("Unsubscribe:");
}
