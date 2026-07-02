import { createServiceClient } from "@/lib/integrations/supabase";

export interface WorkflowPlan {
  id: string;
  campaignId: string;
  userId: string;
  steps: WorkflowStep[];
  totalLeads: number;
  estimatedDuration: string;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: string;
}

export interface WorkflowStep {
  order: number;
  agentName: string;
  taskType: string;
  description: string;
  estimatedMinutes: number;
  status: "pending" | "running" | "completed" | "skipped" | "failed";
}

export interface WorkflowStage {
  id: string;
  label: string;
  agent: string;
  order: number;
}

export const veldoWorkflow: WorkflowStage[] = [
  { id: "research", label: "Company Research", agent: "company_research", order: 1 },
  { id: "icp", label: "ICP Scoring", agent: "icp_fit", order: 2 },
  { id: "email_write", label: "Email Writing", agent: "email_writer", order: 3 },
  { id: "email_score", label: "Email Scoring", agent: "email_scoring", order: 4 },
  { id: "verification", label: "Verification", agent: "email_verification", order: 5 },
  { id: "approval", label: "Human Approval", agent: "human_review", order: 6 },
  { id: "send", label: "Send", agent: "sender", order: 7 },
];

export async function createWorkflowPlan(
  userId: string,
  campaignId: string,
  leadCount: number
): Promise<WorkflowPlan> {
  const steps: WorkflowStep[] = [
    { order: 1, agentName: "company_research", taskType: "enrich_leads", description: "Enrich lead data and research companies", estimatedMinutes: 5, status: "pending" },
    { order: 2, agentName: "icp_fit", taskType: "score_icp", description: "Score ICP fit for each lead", estimatedMinutes: 3, status: "pending" },
    { order: 3, agentName: "email_writer", taskType: "write_emails", description: "Personalize emails for qualified leads", estimatedMinutes: 10, status: "pending" },
    { order: 4, agentName: "email_scoring", taskType: "score_emails", description: "Score each email draft", estimatedMinutes: 3, status: "pending" },
    { order: 5, agentName: "email_verification", taskType: "verify_emails", description: "Verify email deliverability", estimatedMinutes: 5, status: "pending" },
    { order: 6, agentName: "human_review", taskType: "approve_drafts", description: "Human approval gate for final drafts", estimatedMinutes: 0, status: "pending" },
  ];

  const db = createServiceClient();
  const { data, error } = await db
    .from("workflow_plans")
    .insert({
      campaign_id: campaignId,
      user_id: userId,
      steps_json: steps,
      total_leads: leadCount,
      status: "pending",
      created_at: new Date().toISOString(),
    })
    .select("id, created_at")
    .single();

  if (error) {
    return {
      id: `ephemeral_${Date.now()}`,
      campaignId,
      userId,
      steps,
      totalLeads: leadCount,
      estimatedDuration: `~${Math.ceil(leadCount / 10)} min`,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }

  return {
    id: data.id,
    campaignId,
    userId,
    steps,
    totalLeads: leadCount,
    estimatedDuration: `~${Math.ceil(leadCount / 10)} min`,
    status: "pending",
    createdAt: data.created_at,
  };
}
