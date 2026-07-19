import "server-only";
import { createServiceClient } from "@/lib/integrations/supabase";
import { consumeCredits } from "@/lib/billing/consumption";
import { getBalance } from "@/lib/billing/ledger";
import { resolveCreditAccount } from "@/lib/billing/account";
import { buildEstimate, readCampaignConfig } from "@/lib/sales/campaign-config";

// ─────────────────────────────────────────────────────────
// The launch gate. Approving a launch card is the ONLY place a campaign spends
// credits: the full itemized cost is debited here in one idempotent ledger
// entry, then step-1 sends are queued. The worker never charges again.
// ─────────────────────────────────────────────────────────

export type LaunchResult =
  | { ok: true; queued: number; charged: number }
  | { ok: false; error: string; needed?: number; balance?: number };

export async function launchCampaign(userId: string, campaignId: string): Promise<LaunchResult> {
  const db = createServiceClient();

  const { data: campaign } = await db
    .from("campaigns")
    .select("id,status,icp_json")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!campaign) return { ok: false, error: "Campaign not found." };
  if (campaign.status === "running") return { ok: false, error: "Campaign is already running." };

  const config = readCampaignConfig(campaign.icp_json);

  const { data: leads } = await db
    .from("leads")
    .select("id,email")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .not("email", "is", null)
    .limit(2000);
  const contacts = (leads ?? []).filter((l) => (l.email ?? "").includes("@"));
  if (!contacts.length) return { ok: false, error: "No contacts are staged for this campaign yet." };

  const estimate = buildEstimate(contacts.length, config.sequence.length, config.sending.verify);

  const charge = await consumeCredits(userId, "campaign_launch", {
    quantity: estimate.credits.total,
    idempotencyKey: `launch:${campaignId}`,
    metadata: { campaignId, contacts: contacts.length, steps: config.sequence.length },
  });
  if (!charge.success) {
    const account = await resolveCreditAccount(userId);
    const balance = await getBalance(account.billingUserId);
    return {
      ok: false,
      error: `You need ${(estimate.credits.total - balance).toLocaleString()} more credits to launch.`,
      needed: estimate.credits.total,
      balance,
    };
  }

  // Queue the first touch for every staged contact that doesn't have one yet
  // (idempotent — relaunching after a partial failure won't double-queue).
  const { data: existing } = await db
    .from("email_sends")
    .select("lead_id")
    .eq("campaign_id", campaignId)
    .eq("provider", "step_1")
    .limit(5000);
  const alreadyQueued = new Set((existing ?? []).map((r) => r.lead_id));

  const now = Date.now();
  const cap = Math.max(1, config.sending.dailyCap);
  const nowIso = new Date().toISOString();
  const rows = contacts
    .filter((l) => !alreadyQueued.has(l.id))
    .map((lead, i) => ({
      user_id: userId,
      campaign_id: campaignId,
      lead_id: lead.id,
      to_email: (lead.email ?? "").trim().toLowerCase(),
      provider: "step_1",
      status: "queued",
      scheduled_at: new Date(now + Math.floor(i / cap) * 86_400_000).toISOString(),
      created_at: nowIso,
    }));

  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from("email_sends").insert(rows.slice(i, i + 200));
    if (error) return { ok: false, error: `Launch charged but queueing failed: ${error.message}` };
  }

  await db
    .from("campaigns")
    .update({
      status: "running",
      icp_json: { ...(campaign.icp_json as Record<string, unknown> ?? {}), estimate, stagedCount: contacts.length },
      updated_at: nowIso,
    })
    .eq("id", campaignId)
    .eq("user_id", userId);

  return { ok: true, queued: rows.length, charged: charge.cost };
}
