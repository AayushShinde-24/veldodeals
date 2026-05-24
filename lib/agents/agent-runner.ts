import "server-only";

import { getDb, enqueueAgentTask, logAgent } from "@/lib/agents/agent-helpers";
import { runAdminQaAgent } from "@/lib/agents/admin-qa-agent";
import { runAnalyticsLearningAgent } from "@/lib/agents/analytics-learning-agent";
import { runBillingCreditsAgent } from "@/lib/agents/billing-credits-agent";
import { runCampaignLeaderAgent } from "@/lib/agents/campaign-leader";
import { runCampaignSequenceAgent } from "@/lib/agents/campaign-sequence-agent";
import { runCompanyResearchAgent } from "@/lib/agents/company-research-agent";
import { runCrmSyncAgent } from "@/lib/agents/crm-sync-agent";
import { runDealClosingAgent } from "@/lib/agents/deal-closing-agent";
import { runEmailScoringAgent } from "@/lib/agents/email-scoring-agent";
import { runEmailStrategyAgent } from "@/lib/agents/email-strategy-agent";
import { runEmailVerificationAgent } from "@/lib/agents/email-verification-agent";
import { runEmailWriterAgent } from "@/lib/agents/email-writer-agent";
import { runFundraisingAgent } from "@/lib/agents/fundraising-agent";
import { runIcpFitAgent } from "@/lib/agents/icp-fit-agent";
import { runInvestorPipelineAgent } from "@/lib/agents/investor-pipeline-agent";
import { runLeadEnrichmentAgent } from "@/lib/agents/lead-enrichment-agent";
import { runLeadImportAgent } from "@/lib/agents/lead-import-agent";
import { runMeetingBookingAgent } from "@/lib/agents/meeting-booking-agent";
import { runPersonalizationAgent } from "@/lib/agents/personalization-agent";
import { runPublicSignalAgent } from "@/lib/agents/public-signal-agent";
import { runReplyClassificationAgent } from "@/lib/agents/reply-classification-agent";
import { runSendGateAgent } from "@/lib/agents/send-gate-agent";
import { runSendingAgent } from "@/lib/agents/sending-agent";
import { runVoiceCallAgent } from "@/lib/agents/voice-call-agent";
import { persistAgentRun, wrapAgentOutput } from "@/src/lib/agents/output";
import {
  agentNameSchema,
  agentOutputSchemas,
  type AgentContext,
  type AgentName,
  type AgentTaskRow,
} from "@/lib/agents/schemas";

type AgentResult = Record<string, unknown>;

const maxRetries = 3;

export async function processQueuedTask(userId?: string) {
  const db = getDb();
  let query = db
    .from("agent_tasks")
    .select("*")
    .eq("status", "queued")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1);

  if (userId) query = query.eq("user_id", userId);

  const { data: task, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!task) return { ran: false, task: null };

  const locked = await db
    .from("agent_tasks")
    .update({ status: "running", locked_at: new Date().toISOString() })
    .eq("id", task.id)
    .eq("status", "queued")
    .select("*")
    .single();

  if (locked.error || !locked.data) return { ran: false, task: null };

  return runTask(locked.data as AgentTaskRow);
}

export async function runTask(task: AgentTaskRow) {
  const db = getDb();
  const agentName = agentNameSchema.parse(task.agent_name);
  const context: AgentContext = {
    userId: task.user_id,
    campaignId: task.campaign_id ?? undefined,
    leadId: task.lead_id ?? undefined,
    taskId: task.id,
  };

  try {
    const output = await runAgent(agentName, task.input_json ?? {}, context);
    const schema = agentOutputSchemas[agentName];
    const validated = schema.parse(output) as AgentResult;
    const status = inferTaskStatus(agentName, validated);

    await db.from("agent_tasks").update({
      status,
      output_json: validated,
      error_message: null,
    }).eq("id", task.id);

    await persistAgentRun({
      workspaceId: task.workspace_id ?? null,
      userId: task.user_id,
      taskId: task.id,
      input: task.input_json ?? {},
      output: wrapAgentOutput({
        agentName,
        task: task.task_type,
        status: status === "completed" ? "success" : "needs_more_data",
        confidence: Number(validated.confidence ?? validated.score ?? 75),
        summary: summarizeAgentOutput(validated),
        data: validated,
        risks: Array.isArray(validated.risks) ? validated.risks : [],
        logs: [`${agentName} completed with task status ${status}`],
      }),
    });

    await enqueueNextTasks(agentName, validated, context);
    return { ran: true, task_id: task.id, agent_name: agentName, status, output: validated };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown agent failure";
    const retryCount = task.retry_count + 1;
    const failedStatus = retryCount >= maxRetries ? "failed" : "queued";

    await db.from("agent_tasks").update({
      status: failedStatus,
      retry_count: retryCount,
      error_message: message,
    }).eq("id", task.id);

    await logAgent(db, { ...context, agentName }, message, "error");
    await persistAgentRun({
      workspaceId: task.workspace_id ?? null,
      userId: task.user_id,
      taskId: task.id,
      input: task.input_json ?? {},
      output: wrapAgentOutput({
        agentName,
        task: task.task_type,
        status: "failed",
        confidence: 0,
        summary: message,
        risks: [message],
        logs: [`${agentName} failed`],
      }),
    });

    if (failedStatus === "failed") {
      await enqueueAgentTask({
        userId: task.user_id,
        campaignId: task.campaign_id,
        leadId: task.lead_id,
        agentName: "admin_qa",
        taskType: "audit_failed_task",
        priority: 1,
        inputJson: {
          issue: `${agentName} failed after ${maxRetries} attempts.`,
          root_cause: message,
          severity: "high",
          developer_task: `Inspect task ${task.id} and provider errors.`,
        },
      });
    }

    return { ran: true, task_id: task.id, agent_name: agentName, status: failedStatus, error: message };
  }
}

function summarizeAgentOutput(output: AgentResult) {
  for (const key of ["summary", "decision", "reason", "final_verdict", "message"]) {
    const value = output[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "Agent output validated and persisted.";
}

async function runAgent(agentName: AgentName, input: Record<string, unknown>, context: AgentContext) {
  switch (agentName) {
    case "campaign_leader":
      return runCampaignLeaderAgent(input, context);
    case "lead_import":
      return runLeadImportAgent(input, context);
    case "lead_enrichment":
      return runLeadEnrichmentAgent(input, context);
    case "company_research":
      return runCompanyResearchAgent(input, context);
    case "public_signal_research":
      return runPublicSignalAgent(input, context);
    case "icp_fit":
      return runIcpFitAgent(input, context);
    case "personalization_strategy":
      return runPersonalizationAgent(input, context);
    case "email_strategy":
      return runEmailStrategyAgent(input, context);
    case "email_writer":
      return runEmailWriterAgent(input, context);
    case "email_quality_scoring":
      return runEmailScoringAgent(input, context);
    case "email_verification":
      return runEmailVerificationAgent(input, context);
    case "send_gate":
      return runSendGateAgent(input, context);
    case "campaign_sequence":
      return runCampaignSequenceAgent(input, context);
    case "sending":
      return runSendingAgent(input, context);
    case "voice_call":
      return runVoiceCallAgent(input, context);
    case "meeting_booking":
      return runMeetingBookingAgent(input, context);
    case "deal_closing":
      return runDealClosingAgent(input, context);
    case "investor_pipeline":
      return runInvestorPipelineAgent(input, context);
    case "fundraising":
      return runFundraisingAgent(input, context);
    case "reply_classification":
      return runReplyClassificationAgent(input, context);
    case "crm_sync":
      return runCrmSyncAgent(input, context);
    case "analytics_learning":
      return runAnalyticsLearningAgent(input, context);
    case "billing_credits":
      return runBillingCreditsAgent(input, context);
    case "admin_qa":
      return runAdminQaAgent(input, context);
  }
}

function inferTaskStatus(agentName: AgentName, output: AgentResult) {
  if (agentName === "campaign_leader" && output.needs_human_review === true) return "needs_review";
  if (agentName === "lead_enrichment" && output.needs_review === true) return "needs_review";
  if (agentName === "company_research" && Number(output.confidence ?? 0) < 60) return "needs_review";
  if (agentName === "personalization_strategy" && (output.needs_review === true || output.risk_level === "high")) return "needs_review";
  if (agentName === "email_strategy" && output.needs_review === true) return "needs_review";
  if (agentName === "email_quality_scoring" && output.pass !== true) return "needs_review";
  if (agentName === "email_verification" && output.status !== "valid") return "needs_review";
  if (agentName === "send_gate" && output.eligible_to_send !== true) return "needs_review";
  if (agentName === "voice_call" && output.needs_review === true) return "needs_review";
  if (agentName === "meeting_booking" && output.needs_review === true) return "needs_review";
  if (agentName === "deal_closing" && output.needs_review === true) return "needs_review";
  if (agentName === "investor_pipeline" && output.needs_review === true) return "needs_review";
  if (agentName === "fundraising" && (output.needs_legal_review === true || output.status === "needs_review")) return "needs_review";
  return "completed";
}

async function enqueueNextTasks(agentName: AgentName, output: AgentResult, context: AgentContext) {
  if (!context.campaignId) return;
  const db = getDb();

  if (agentName === "campaign_leader") {
    const nextAgent = agentNameSchema.safeParse(output.next_agent);
    if (
      context.leadId &&
      output.allowed_to_continue === true &&
      nextAgent.success &&
      nextAgent.data !== "campaign_leader"
    ) {
      await enqueueAgentTask({
        userId: context.userId,
        campaignId: context.campaignId,
        leadId: context.leadId,
        agentName: nextAgent.data,
        taskType: String(output.current_stage ?? "leader_routed_task"),
        priority: 4,
        inputJson: {},
      });
    }
    return;
  }

  if (agentName === "lead_import") {
    const { data: leads } = await db.from("leads").select("id").eq("campaign_id", context.campaignId).eq("stage", "imported");
    await enqueueAgentTask({
      userId: context.userId,
      campaignId: context.campaignId,
      agentName: "campaign_sequence",
      taskType: "create_sequence",
      priority: 3,
      inputJson: {},
    });
    for (const lead of leads ?? []) {
      await enqueueAgentTask({
        userId: context.userId,
        campaignId: context.campaignId,
        leadId: lead.id,
        agentName: "campaign_leader",
        taskType: "route_lead_workflow",
        priority: 3,
        inputJson: {},
      });
    }
    return;
  }

  if (!context.leadId) return;

  if (agentName === "sending") {
    await enqueueAgentTask({
      userId: context.userId,
      campaignId: context.campaignId,
      leadId: context.leadId,
      agentName: "analytics_learning",
      taskType: "learn_from_send",
      priority: 7,
      inputJson: {},
    });
    return;
  }

  await enqueueAgentTask({
    userId: context.userId,
    campaignId: context.campaignId,
    leadId: context.leadId,
    agentName: "campaign_leader",
    taskType: "route_after_specialist",
    priority: 4,
    inputJson: {},
  });
}
