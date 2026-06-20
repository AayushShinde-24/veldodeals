import { createServiceClient } from "@/lib/integrations/supabase";
import { enqueueAgentTask } from "@/lib/agents/agent-helpers";

export async function runLeadOutboundWorkflow(
  userId: string,
  input: { leadId: string; campaignId: string; [key: string]: unknown }
) {
  const db = createServiceClient();

  // Verify lead and campaign exist
  const [leadRes, campaignRes] = await Promise.all([
    db.from("leads").select("id, email, company, stage").eq("id", input.leadId).eq("user_id", userId).maybeSingle(),
    db.from("campaigns").select("id, name, status").eq("id", input.campaignId).eq("user_id", userId).maybeSingle(),
  ]);

  if (!leadRes.data) throw new Error("Lead not found.");
  if (!campaignRes.data) throw new Error("Campaign not found.");

  const task = await enqueueAgentTask({
    userId,
    campaignId: input.campaignId,
    leadId: input.leadId,
    agentName: "campaign_leader",
    taskType: "lead_outbound_workflow",
    priority: 2,
    inputJson: input,
  });

  return {
    taskId: task.id,
    leadId: input.leadId,
    campaignId: input.campaignId,
    message: `Workflow queued for ${leadRes.data.email}. Check /agents for execution status.`,
  };
}
