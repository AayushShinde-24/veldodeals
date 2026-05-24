import "server-only";

import { enqueueAgentTask } from "@/lib/agents/agent-helpers";
import { createServiceClient } from "@/lib/integrations/supabase";
import { createCrmDeal } from "@/src/lib/crm/deals";

export async function advancePositiveReplyToMeeting(input: {
  userId: string;
  workspaceId: string;
  campaignId: string;
  leadId: string;
  replyClass: string;
  title?: string;
}) {
  const positive = ["interested", "meeting_request", "positive", "referral"].includes(input.replyClass);
  if (!positive) throw new Error("Reply is not positive enough for autonomous meeting handoff.");

  await enqueueAgentTask({
    userId: input.userId,
    campaignId: input.campaignId,
    leadId: input.leadId,
    agentName: "meeting_booking",
    taskType: "positive_reply_meeting_handoff",
    priority: 2,
    inputJson: { positive_intent: true, reply_class: input.replyClass },
  });

  const deal = await createCrmDeal({
    workspaceId: input.workspaceId,
    userId: input.userId,
    leadId: input.leadId,
    title: input.title ?? "Qualified meeting opportunity",
    value: 0,
    stage: "meeting_booked",
    probability: 35,
    notes: "Created from positive reply handoff.",
  });

  await createServiceClient().from("campaigns").update({
    revenue_workflow_state: "meeting_booking",
  }).eq("id", input.campaignId).eq("user_id", input.userId);

  return { queuedMeetingAgent: true, deal };
}
