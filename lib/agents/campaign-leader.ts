import "server-only";

import { fetchLeadBundle, getDb, logAgent, saveDecision } from "@/lib/agents/agent-helpers";
import { campaignLeaderOutputSchema, type AgentContext, type CampaignLeaderOutput, type AgentName } from "@/lib/agents/schemas";
import { veldoWorkflow } from "@/lib/agents/workflow-plan";
import { revenueWorkflowStateSchema } from "@/lib/revenue-os/compliance";

const stages: Array<{ stage: string; agent: AgentName; task: string }> = [
  workflowStage("lead_agent", "Import and normalize leads."),
  workflowStage("enrichment_agent", "Enrich lead profile."),
  workflowStage("read_website", "Research company website."),
  workflowStage("recent_signals", "Find public buying signals."),
  workflowStage("target_industries", "Score ICP fit."),
  workflowStage("personalization_points", "Build personalization strategy."),
  workflowStage("copywriting_agent", "Plan email angle and CTA."),
  workflowStage("email_1", "Write email draft."),
  workflowStage("email_score", "Score email quality."),
  workflowStage("verification_agent", "Verify email deliverability."),
  workflowStage("send_gate", "Evaluate all sending gates."),
  { stage: "human_review", agent: "campaign_leader", task: "Wait for human approval." },
  workflowStage("sending_agent", "Send approved email."),
  workflowStage("reply_agent", "Monitor and classify replies."),
  workflowStage("dashboard_agent", "Analyze campaign learning."),
];

export async function runCampaignLeaderAgent(input: Record<string, unknown>, context: AgentContext): Promise<CampaignLeaderOutput> {
  if (!context.campaignId) throw new Error("campaign_id is required for campaign leadership.");
  const db = getDb();
  const { data: campaign } = await db.from("campaigns").select("campaign_type,channel_mix,status").eq("id", context.campaignId).maybeSingle();
  const campaignType = String(campaign?.campaign_type ?? "");
  const leadId = context.leadId ?? (typeof input.lead_id === "string" ? input.lead_id : undefined);
  const bundle = leadId ? await fetchLeadBundle(db, leadId) : null;
  const current = decideNextStage(bundle, campaignType);
  const blockingIssues = current.blocker ? [current.blocker] : [];

  const output = campaignLeaderOutputSchema.parse({
    campaign_id: context.campaignId,
    current_stage: current.stage,
    next_agent: current.agent,
    task: current.task,
    reason: current.reason,
    required_inputs: current.requiredInputs,
    blocking_issues: blockingIssues,
    confidence: current.confidence,
    needs_human_review: blockingIssues.length > 0 || current.stage === "human_review",
    allowed_to_continue: blockingIssues.length === 0 && current.stage !== "human_review",
  });

  await db.from("campaigns").update({
    leader_decision_json: output,
    revenue_workflow_state: revenueWorkflowStateSchema.parse(stateForStage(current.stage, Boolean(current.blocker))),
  }).eq("id", context.campaignId);
  await logAgent(db, { ...context, agentName: "campaign_leader" }, "Leader decision saved.", "info", output);
  await saveDecision(db, { ...context, agentName: "campaign_leader" }, output, output.confidence, output.needs_human_review);
  return output;
}

function decideNextStage(bundle: Awaited<ReturnType<typeof fetchLeadBundle>> | null, campaignType: string) {
  if (campaignType === "fundraising") return { stage: "fundraising", agent: "investor_pipeline" as AgentName, task: "Build investor pipeline.", reason: "Fundraising campaign requires investor matching before outreach.", requiredInputs: ["investor_sources"], blocker: undefined, confidence: 80 };
  if (!bundle) return decision(0, "No lead selected; import leads first.", []);
  if (!bundle.lead.email || !bundle.lead.company) return decision(0, "Lead gate failed: email and company are required.", ["email", "company"], "Lead is missing email or company.");
  if (!bundle.enrichment) return decision(1, "Lead needs enrichment before research.", ["lead"]);
  if (bundle.enrichment.needs_review === true) return decision(1, "Lead enrichment needs review before research.", ["title", "company_website"], "Lead enrichment confidence gate failed.");
  if (!bundle.companyResearch) return decision(2, "Company research is missing.", ["company_website"]);
  if (bundle.companyResearch.confidence < 60) return decision(2, "Research confidence is below 60.", ["company_website"], "Research confidence gate failed.");
  if (!bundle.publicSignals) return decision(3, "Public signals are missing.", ["company"]);
  if (bundle.publicSignals.confidence < 50) return decision(3, "Public signal confidence is too low.", ["public_sources"], "Public signal confidence gate failed.");
  if (!bundle.icpScore) return decision(4, "ICP score is missing.", ["campaign_icp", "lead"]);
  if (!bundle.icpScore.should_continue || bundle.icpScore.fit_score < 50) return decision(4, "ICP fit is too low to continue.", [], "ICP fit gate failed.");
  if (!bundle.personalization) return decision(5, "Personalization strategy is missing.", ["company_research", "public_signals"]);
  if (bundle.personalization.risk_level === "high" || bundle.personalization.needs_review === true) return decision(5, "Personalization needs human review.", [], "Personalization risk gate failed.");
  if (!bundle.emailStrategy) return decision(6, "Email strategy is missing.", ["personalization_strategy"]);
  if (bundle.emailStrategy.needs_review) return decision(6, "Email strategy needs review before drafting.", [], "Email strategy confidence gate failed.");
  if (!bundle.email) return decision(7, "Email draft is missing.", ["email_strategy"]);
  if (!bundle.emailScore) return decision(8, "Email quality score is missing.", ["email"]);
  if (!bundle.emailScore.pass || bundle.emailScore.score < 75) return decision(8, "Email score is below 75.", [], "Email score gate failed.");
  if (!bundle.verification) return decision(9, "Email verification is missing.", ["email"]);
  if (bundle.verification.status !== "valid") return decision(9, "Email verification is not valid.", [], "Email verification gate failed.");
  if (!bundle.sendGate) return decision(10, "Send gates have not been evaluated.", ["send_gate_inputs"]);
  if (!bundle.sendGate.eligible_to_send && bundle.email.approval_status === "approved") return decision(10, "One or more send gates failed.", [], "Send gate failed.");
  if (bundle.email.approval_status !== "approved") return decision(11, "MVP requires human approval before sending.", ["human_approval"]);
  return decision(12, "All gates passed and draft is approved.", ["credits"]);
}

function stateForStage(stage: string, blocked: boolean) {
  if (blocked) return "blocked";
  if (stage === "human_review") return "needs_review";
  if (stage.includes("email") || stage.includes("copy") || stage === "human_review") return "drafting";
  if (stage.includes("send")) return "deal_followup";
  if (stage.includes("reply")) return "deal_followup";
  if (stage === "fundraising") return "fundraising";
  return "researching";
}

function decision(index: number, reason: string, requiredInputs: string[], blocker?: string) {
  return {
    ...stages[index],
    reason,
    requiredInputs,
    blocker,
    confidence: blocker ? 45 : 85,
  };
}

function workflowStage(id: string, fallbackTask: string) {
  const stage = veldoWorkflow.find((item) => item.id === id);
  if (!stage) throw new Error(`Workflow stage ${id} is missing.`);
  return { stage: stage.id, agent: stage.agent, task: stage.task || fallbackTask };
}
