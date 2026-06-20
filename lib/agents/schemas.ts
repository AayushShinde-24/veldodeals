export type AgentTaskRow = {
  id: string;
  user_id: string;
  campaign_id: string | null;
  lead_id: string | null;
  agent_name: string | null;
  task_type: string | null;
  status: string;
  priority: number;
  input_json: unknown;
  output_json: unknown;
  error_message: string | null;
  started_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type AgentDecisionRow = {
  id: string;
  user_id: string;
  task_id: string | null;
  agent_name: string;
  decision: string;
  reasoning: string;
  metadata: unknown;
  created_at: string;
};

export type AgentLogRow = {
  id: string;
  user_id: string;
  campaign_id: string | null;
  agent_name: string | null;
  log_level: "info" | "warn" | "error";
  message: string;
  metadata: unknown;
  created_at: string;
};
