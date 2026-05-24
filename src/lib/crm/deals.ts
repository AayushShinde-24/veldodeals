import "server-only";

import { z } from "zod";
import { createServiceClient } from "@/lib/integrations/supabase";
import { writeAuditLog } from "@/src/lib/audit/log";
import { recordAnalyticsEvent } from "@/src/lib/analytics/events";

export const crmDealInputSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  leadId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  title: z.string().min(2),
  value: z.coerce.number().int().min(0).default(0),
  stage: z.string().min(1).default("new"),
  probability: z.coerce.number().int().min(0).max(100).default(10),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function createCrmDeal(raw: unknown) {
  const input = crmDealInputSchema.parse(raw);
  const { data, error } = await createServiceClient()
    .from("crm_deals")
    .insert({
      workspace_id: input.workspaceId,
      lead_id: input.leadId ?? null,
      company_id: input.companyId ?? null,
      title: input.title,
      value: input.value,
      stage: input.stage,
      probability: input.probability,
      expected_close_date: input.expectedCloseDate ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  await writeAuditLog({ workspaceId: input.workspaceId, userId: input.userId, action: "crm.deal.created", metadata: { dealId: data.id, leadId: input.leadId ?? null } });
  await recordAnalyticsEvent({ workspaceId: input.workspaceId, eventType: "crm_deal_created", entityId: data.id, metadata: { stage: data.stage, value: data.value } });
  return data;
}

export async function updateCrmDealStage(input: { workspaceId: string; userId: string; dealId: string; stage: string }) {
  const { data, error } = await createServiceClient()
    .from("crm_deals")
    .update({ stage: input.stage })
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.dealId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await writeAuditLog({ workspaceId: input.workspaceId, userId: input.userId, action: "crm.deal.stage_updated", metadata: { dealId: input.dealId, stage: input.stage } });
  await recordAnalyticsEvent({ workspaceId: input.workspaceId, eventType: "crm_deal_stage_updated", entityId: input.dealId, metadata: { stage: input.stage } });
  return data;
}
