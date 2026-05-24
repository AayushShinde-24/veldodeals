import "server-only";

import { runCampaignLeaderAgent } from "@/lib/agents/campaign-leader";
import { runCompanyResearchAgent } from "@/lib/agents/company-research-agent";
import { runEmailScoringAgent } from "@/lib/agents/email-scoring-agent";
import { runEmailStrategyAgent } from "@/lib/agents/email-strategy-agent";
import { runEmailVerificationAgent } from "@/lib/agents/email-verification-agent";
import { runEmailWriterAgent } from "@/lib/agents/email-writer-agent";
import { runIcpFitAgent } from "@/lib/agents/icp-fit-agent";
import { runLeadEnrichmentAgent } from "@/lib/agents/lead-enrichment-agent";
import { runPersonalizationAgent } from "@/lib/agents/personalization-agent";
import { runPublicSignalAgent } from "@/lib/agents/public-signal-agent";
import { runSendGateAgent } from "@/lib/agents/send-gate-agent";
import type { AgentContext, AgentName } from "@/lib/agents/schemas";

type WorkflowStep = {
  agent: AgentName;
  status: "completed" | "needs_review" | "blocked";
  output?: unknown;
  reason?: string;
};

export async function runLeadOutboundWorkflow(input: {
  userId: string;
  campaignId: string;
  leadId: string;
  cheapDraft?: boolean;
}) {
  const context: AgentContext = {
    userId: input.userId,
    campaignId: input.campaignId,
    leadId: input.leadId,
  };
  const steps: WorkflowStep[] = [];

  const runStep = async (agent: AgentName, action: () => Promise<unknown>) => {
    const output = await action();
    steps.push({ agent, status: "completed", output });
    return output;
  };

  for (let turn = 0; turn < 20; turn += 1) {
    const leader = await runStep("campaign_leader", () => runCampaignLeaderAgent({ lead_id: input.leadId }, context));
    const decision = leader as Awaited<ReturnType<typeof runCampaignLeaderAgent>>;
    if (!decision.allowed_to_continue || decision.next_agent === "campaign_leader") {
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        status: decision.needs_human_review ? "needs_review" : "blocked",
        reason: decision.blocking_issues[0] ?? decision.reason,
      };
      return finish(steps);
    }

    await runStep(decision.next_agent, () => runSpecialist(decision.next_agent, input.cheapDraft === true, context));
  }

  steps.push({ agent: "campaign_leader", status: "blocked", reason: "Workflow exceeded the maximum routing turns." });
  return finish(steps);
}

function finish(steps: WorkflowStep[]) {
  return {
    completed: steps.every((step) => step.status === "completed"),
    steps,
    next_action: steps.find((step) => step.status !== "completed")?.reason ?? "Review and approve the draft before sending.",
  };
}

async function runSpecialist(agent: AgentName, cheapDraft: boolean, context: AgentContext) {
  switch (agent) {
    case "lead_enrichment":
      return runLeadEnrichmentAgent({}, context);
    case "company_research":
      return runCompanyResearchAgent({}, context);
    case "public_signal_research":
      return runPublicSignalAgent({}, context);
    case "icp_fit":
      return runIcpFitAgent({}, context);
    case "personalization_strategy":
      return runPersonalizationAgent({}, context);
    case "email_strategy":
      return runEmailStrategyAgent({}, context);
    case "email_writer":
      return runEmailWriterAgent({ cheap_variant: cheapDraft }, context);
    case "email_quality_scoring":
      return runEmailScoringAgent({}, context);
    case "email_verification":
      return runEmailVerificationAgent({}, context);
    case "send_gate":
      return runSendGateAgent({}, context);
    case "sending":
      throw new Error("Sending must be triggered through the approved-send endpoint after gates pass.");
    default:
      throw new Error(`${agent} is not supported in the lead outbound workflow.`);
  }
}
