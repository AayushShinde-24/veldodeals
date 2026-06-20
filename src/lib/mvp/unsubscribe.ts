import { createServiceClient } from "@/lib/integrations/supabase";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.veldo.ai";

export function buildUnsubscribeLink(email: string, userId: string): string;
export function buildUnsubscribeLink(options: { email: string; userId?: string; campaignId?: string }): string;
export function buildUnsubscribeLink(
  emailOrOptions: string | { email: string; userId?: string; campaignId?: string },
  userId?: string
): string {
  const email = typeof emailOrOptions === "string" ? emailOrOptions : emailOrOptions.email;
  const uid = typeof emailOrOptions === "string" ? (userId ?? "") : (emailOrOptions.userId ?? emailOrOptions.campaignId ?? "");
  const token = Buffer.from(`${uid}:${email}`).toString("base64url");
  return `${APP_URL}/unsubscribe?t=${token}`;
}

export async function isUnsubscribed(email: string, userId: string): Promise<boolean>;
export async function isUnsubscribed(options: { email: string; userId: string }): Promise<boolean>;
export async function isUnsubscribed(
  emailOrOptions: string | { email: string; userId: string },
  userId?: string
): Promise<boolean> {
  const email = typeof emailOrOptions === "string" ? emailOrOptions : emailOrOptions.email;
  const uid = typeof emailOrOptions === "string" ? (userId ?? "") : emailOrOptions.userId;
  const db = createServiceClient();
  const { data } = await db
    .from("unsubscribes")
    .select("id")
    .eq("user_id", uid)
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return !!data;
}

export async function recordUnsubscribe(
  emailOrOptions: string | { email: string; userId?: string | null; campaignId?: string | null; reason?: string },
  userId?: string
): Promise<void> {
  const email = typeof emailOrOptions === "string" ? emailOrOptions : emailOrOptions.email;
  const uid = typeof emailOrOptions === "string" ? (userId ?? "") : (emailOrOptions.userId ?? "");
  const campaignId = typeof emailOrOptions === "object" ? emailOrOptions.campaignId : undefined;
  const db = createServiceClient();
  await db
    .from("unsubscribes")
    .upsert(
      { user_id: uid, email: email.toLowerCase(), campaign_id: campaignId ?? null, created_at: new Date().toISOString() },
      { onConflict: "user_id,email" }
    );
}

export function appendComplianceFooter(html: string, email: string, userId: string): string;
export function appendComplianceFooter(options: { body: string; compliance?: unknown; unsubscribeLink?: string; email?: string; userId?: string }): string;
export function appendComplianceFooter(
  htmlOrOptions: string | { body: string; compliance?: unknown; unsubscribeLink?: string; email?: string; userId?: string },
  email?: string,
  userId?: string
): string {
  let html: string;
  let unsubscribeUrl: string;

  if (typeof htmlOrOptions === "string") {
    html = htmlOrOptions;
    unsubscribeUrl = buildUnsubscribeLink(email ?? "", userId ?? "");
  } else {
    html = htmlOrOptions.body;
    unsubscribeUrl = htmlOrOptions.unsubscribeLink ?? buildUnsubscribeLink(htmlOrOptions.email ?? "", htmlOrOptions.userId ?? "");
  }

  const footer = `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;line-height:1.5;">
  <p>You're receiving this email because your contact details were shared with us for outreach purposes.</p>
  <p><a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a> from future emails.</p>
</div>`;
  if (html.includes("</body>")) return html.replace("</body>", footer + "</body>");
  return html + footer;
}
