import "server-only";

import { getDb, logAgent, saveDecision } from "@/lib/agents/agent-helpers";
import { crmSyncOutputSchema, type AgentContext, type CrmSyncOutput } from "@/lib/agents/schemas";

export async function runCrmSyncAgent(input: Record<string, unknown>, context: AgentContext): Promise<CrmSyncOutput> {
  const db = getDb();
  const output = crmSyncOutputSchema.parse({
    crm: typeof input.crm === "string" ? input.crm : "none",
    contact_id: "",
    deal_id: "",
    action: "skipped",
    notes: "CRM connector not configured. Event saved for future sync.",
  });

  await db.from("crm_sync_events").insert({
    user_id: context.userId,
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    crm: output.crm,
    contact_id: output.contact_id,
    deal_id: output.deal_id,
    action: output.action,
    notes: output.notes,
  });

  await logAgent(db, { ...context, agentName: "crm_sync" }, "CRM sync skipped because no connector is configured.", "warn", { crm: output.crm });
  await saveDecision(db, { ...context, agentName: "crm_sync" }, output, 100, false);
  return output;
}
