import type { AgentName } from "@/lib/agents/schemas";

export type WorkflowStage = {
  id: string;
  label: string;
  agent: AgentName;
  task: string;
  leadScoped: boolean;
};

export const veldoWorkflow: WorkflowStage[] = [
  { id: "campaign_form", label: "Campaign Form", agent: "campaign_leader", task: "Collect campaign inputs", leadScoped: false },
  { id: "ceo_strategy", label: "CEO Agent", agent: "campaign_leader", task: "Create campaign strategy", leadScoped: false },
  { id: "target_audience", label: "Defines target audience", agent: "campaign_leader", task: "Define target audience", leadScoped: false },
  { id: "lead_titles", label: "Chooses lead titles", agent: "campaign_leader", task: "Choose lead titles", leadScoped: false },
  { id: "research_agent", label: "Research Agent", agent: "company_research", task: "Research target market", leadScoped: true },
  { id: "target_industries", label: "Finds target industries", agent: "icp_fit", task: "Score target industry fit", leadScoped: true },
  { id: "company_pains", label: "Finds company pain points", agent: "company_research", task: "Find company pain points", leadScoped: true },
  { id: "lead_agent", label: "Lead Agent", agent: "lead_import", task: "Find and normalize leads", leadScoped: false },
  { id: "find_companies", label: "Finds companies", agent: "lead_enrichment", task: "Resolve company profile", leadScoped: true },
  { id: "decision_makers", label: "Finds decision makers", agent: "lead_enrichment", task: "Resolve decision maker", leadScoped: true },
  { id: "get_emails", label: "Gets emails", agent: "lead_import", task: "Capture lead email", leadScoped: false },
  { id: "enrichment_agent", label: "Enrichment Agent", agent: "lead_enrichment", task: "Enrich lead profile", leadScoped: true },
  { id: "read_website", label: "Reads company website", agent: "company_research", task: "Read company website", leadScoped: true },
  { id: "recent_signals", label: "Finds recent signals", agent: "public_signal_research", task: "Find recent public signals", leadScoped: true },
  { id: "personalization_points", label: "Creates personalization points", agent: "personalization_strategy", task: "Create personalization points", leadScoped: true },
  { id: "verification_agent", label: "Verification Agent", agent: "email_verification", task: "Verify email deliverability", leadScoped: true },
  { id: "email_validity", label: "Checks email validity", agent: "email_verification", task: "Check email validity", leadScoped: true },
  { id: "remove_risky", label: "Removes invalid/risky leads", agent: "email_verification", task: "Remove invalid or risky leads", leadScoped: true },
  { id: "copywriting_agent", label: "Copywriting Agent", agent: "email_strategy", task: "Plan email copy", leadScoped: true },
  { id: "subject_line", label: "Writes subject line", agent: "email_writer", task: "Write subject line", leadScoped: true },
  { id: "email_1", label: "Writes email 1", agent: "email_writer", task: "Write first email", leadScoped: true },
  { id: "follow_up_1_copy", label: "Writes follow-up 1", agent: "campaign_sequence", task: "Write follow-up 1", leadScoped: false },
  { id: "follow_up_2_copy", label: "Writes follow-up 2", agent: "campaign_sequence", task: "Write follow-up 2", leadScoped: false },
  { id: "qa_agent", label: "QA Agent", agent: "email_quality_scoring", task: "Quality-assure email", leadScoped: true },
  { id: "personalization_check", label: "Checks personalization", agent: "email_quality_scoring", task: "Check personalization safety", leadScoped: true },
  { id: "spam_check", label: "Checks spam risk", agent: "email_quality_scoring", task: "Check spam risk", leadScoped: true },
  { id: "email_score", label: "Scores email", agent: "email_quality_scoring", task: "Score email", leadScoped: true },
  { id: "send_gate", label: "Score 75+", agent: "send_gate", task: "Evaluate send gates", leadScoped: true },
  { id: "sending_agent", label: "Sending Agent", agent: "sending", task: "Send approved email", leadScoped: true },
  { id: "send_mailbox", label: "Sends through mailbox", agent: "sending", task: "Send through connected mailbox", leadScoped: true },
  { id: "save_thread", label: "Saves thread ID", agent: "sending", task: "Persist delivery thread ID", leadScoped: true },
  { id: "voice_call_gate", label: "Checks call compliance", agent: "voice_call", task: "Gate autonomous AI voice call", leadScoped: true },
  { id: "voice_call_script", label: "Writes call script", agent: "voice_call", task: "Prepare compliant call script", leadScoped: true },
  { id: "book_meeting", label: "Books qualified meetings", agent: "meeting_booking", task: "Suggest or book meeting", leadScoped: true },
  { id: "deal_followup", label: "Moves deals forward", agent: "deal_closing", task: "Plan next revenue action", leadScoped: true },
  { id: "investor_pipeline", label: "Finds matched investors", agent: "investor_pipeline", task: "Build investor pipeline", leadScoped: false },
  { id: "fundraising_agent", label: "Runs fundraising outreach", agent: "fundraising", task: "Draft fundraising outreach", leadScoped: false },
  { id: "follow_up_agent", label: "Follow-up Agent", agent: "campaign_sequence", task: "Schedule follow-ups", leadScoped: false },
  { id: "wait_2_days", label: "Waits 2 days", agent: "campaign_sequence", task: "Wait before follow-up 1", leadScoped: false },
  { id: "send_follow_up_1", label: "Sends follow-up 1", agent: "sending", task: "Send follow-up 1", leadScoped: true },
  { id: "wait_5_days", label: "Waits 5 days", agent: "campaign_sequence", task: "Wait before follow-up 2", leadScoped: false },
  { id: "send_follow_up_2", label: "Sends follow-up 2", agent: "sending", task: "Send follow-up 2", leadScoped: true },
  { id: "reply_agent", label: "Reply Agent", agent: "reply_classification", task: "Read and classify replies", leadScoped: true },
  { id: "read_replies", label: "Reads replies", agent: "reply_classification", task: "Read replies", leadScoped: true },
  { id: "classify_reply", label: "Classifies reply", agent: "reply_classification", task: "Classify reply", leadScoped: true },
  { id: "next_action", label: "Suggests next action", agent: "crm_sync", task: "Suggest CRM next action", leadScoped: true },
  { id: "dashboard_agent", label: "Dashboard Agent", agent: "analytics_learning", task: "Update dashboard learning", leadScoped: false },
  { id: "show_sent", label: "Shows sent emails", agent: "analytics_learning", task: "Report sent emails", leadScoped: false },
  { id: "show_replies", label: "Shows replies", agent: "analytics_learning", task: "Report replies", leadScoped: false },
  { id: "conversion_rate", label: "Shows conversion rate", agent: "analytics_learning", task: "Report conversion rate", leadScoped: false },
];

export function workflowIndexForAgent(agent: AgentName) {
  const index = veldoWorkflow.findIndex((stage) => stage.agent === agent);
  return index === -1 ? 0 : index;
}

export function workflowLabelsForAgent(agent: AgentName) {
  return veldoWorkflow.filter((stage) => stage.agent === agent).map((stage) => stage.label);
}
