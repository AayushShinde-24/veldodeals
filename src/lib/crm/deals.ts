import { createServiceClient } from "@/lib/integrations/supabase";
import { trackEvent } from "@/src/lib/analytics/events";
import { emitCustomerWebhook } from "@/lib/webhooks/customer";
import { recordDealClose } from "@/lib/billing/deal-fees";

export type DealStage = "prospect" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";

export interface Deal {
  id: string;
  userId: string;
  leadId: string | null;
  campaignId: string | null;
  name: string;
  company: string;
  contactEmail: string;
  stage: DealStage;
  value: number | null;
  probability: number;
  expectedCloseDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export async function getDeals(userId: string): Promise<Deal[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("deals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map(mapDeal);
}

export async function createDeal(
  userId: string,
  input: Omit<Deal, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<Deal> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("deals")
    .insert({
      user_id: userId,
      lead_id: input.leadId,
      campaign_id: input.campaignId,
      name: input.name,
      company: input.company,
      contact_email: input.contactEmail,
      stage: input.stage,
      value: input.value,
      probability: input.probability,
      expected_close_date: input.expectedCloseDate,
      notes: input.notes,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`Failed to create deal: ${error?.message}`);
  const deal = mapDeal(data);
  await trackEvent({ userId, event: "first_deal", entityId: deal.id, properties: { campaign_id: deal.campaignId } });
  await emitCustomerWebhook({
    userId,
    event: "deal.created",
    payload: { deal_id: deal.id, campaign_id: deal.campaignId, lead_id: deal.leadId, value: deal.value },
  });
  return deal;
}

export async function updateDealStage(
  userId: string,
  dealId: string,
  stage: DealStage
): Promise<Deal> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("deals")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", dealId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) throw new Error(`Failed to update deal: ${error?.message}`);
  const deal = mapDeal(data);

  // Reaching the proposal stage auto-drafts a proposal (dynamic import avoids a cycle).
  if (stage === "proposal") {
    const { generateProposal } = await import("@/lib/deals/proposals");
    await generateProposal({ userId, dealId }).catch(() => {});
  }

  // Closing a deal accrues Veldo's 2.5% fee (every tier) and emits a webhook.
  if (stage === "closed_won" && (deal.value ?? 0) > 0) {
    await recordDealClose({
      userId,
      dealId: deal.id,
      dealType: "sales",
      dealValue: deal.value ?? 0,
    }).catch(() => {});
    await emitCustomerWebhook({
      userId,
      event: "deal.won",
      payload: { deal_id: deal.id, value: deal.value, company: deal.company },
    }).catch(() => {});
  }

  return deal;
}

export async function createCrmDeal(
  input: { userId: string; workspaceId?: string; leadId?: string | null; campaignId?: string | null; name?: string; title?: string; company?: string; contactEmail?: string; stage?: DealStage; value?: number | null; probability?: number; expectedCloseDate?: string | null; notes?: string | null }
): Promise<Deal> {
  return createDeal(input.userId, {
    leadId: input.leadId ?? null,
    campaignId: input.campaignId ?? null,
    name: input.name ?? input.title ?? "Untitled deal",
    company: input.company ?? "",
    contactEmail: input.contactEmail ?? "",
    stage: input.stage ?? "prospect",
    value: input.value ?? null,
    probability: input.probability ?? 0,
    expectedCloseDate: input.expectedCloseDate ?? null,
    notes: input.notes ?? null,
  });
}

export async function updateCrmDealStage(
  input: { userId: string; workspaceId?: string; dealId: string; stage: string }
): Promise<Deal> {
  return updateDealStage(input.userId, input.dealId, input.stage as DealStage);
}

function mapDeal(row: Record<string, unknown>): Deal {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    leadId: (row.lead_id as string) ?? null,
    campaignId: (row.campaign_id as string) ?? null,
    name: row.name as string,
    company: (row.company as string) ?? "",
    contactEmail: (row.contact_email as string) ?? "",
    stage: (row.stage as DealStage) ?? "prospect",
    value: (row.value as number) ?? null,
    probability: (row.probability as number) ?? 0,
    expectedCloseDate: (row.expected_close_date as string) ?? null,
    notes: (row.notes as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) ?? null,
  };
}
