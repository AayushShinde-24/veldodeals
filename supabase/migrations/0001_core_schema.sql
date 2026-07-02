-- Veldo core schema — Phase 0
-- Reconstructs every table referenced by the app from observed queries.
-- NOTE: the prior codebase referenced several redundant table names for the
-- same concept (credit_ledger / credit_transactions / credits_ledger,
-- generated_emails / email_drafts / personalized_emails, crm_deals / deals,
-- meetings / calendar_events, profiles / users). All are created here so nothing
-- 500s at runtime; consolidating them is tracked as a Phase 8 cleanup.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────
-- Identity & workspace
-- ─────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  company_name text,
  workspace_id uuid,
  workspace_name text,
  workspace_role text default 'owner',
  plan text default 'free',
  credits integer default 200,
  credits_balance integer default 200,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Legacy alias for profiles used by a couple of billing routes.
create table if not exists users (
  id uuid primary key,
  email text,
  credits_balance integer default 200,
  plan text default 'free',
  created_at timestamptz default now()
);

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  website text,
  industry text,
  company_size text,
  plan text default 'free',
  credits integer default 200,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member',
  created_at timestamptz default now(),
  unique (workspace_id, user_id)
);

create table if not exists workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  invited_by uuid references auth.users(id) on delete set null,
  email text not null,
  role text default 'member',
  token uuid default gen_random_uuid(),
  status text default 'pending',
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────
-- Campaigns & leads
-- ─────────────────────────────────────────────────────────
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  workspace_id uuid,
  name text not null,
  goal text,
  status text default 'draft',
  sending_mode text default 'approval_required',
  product_name text,
  product_offer text,
  target_audience text,
  target_niche text,
  location text,
  workflow_progress integer default 0,
  offer_json jsonb,
  icp_json jsonb,
  leader_decision_json jsonb,
  final_summary jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  email text,
  first_name text,
  last_name text,
  full_name text,
  company text,
  title text,
  linkedin_url text,
  location text,
  stage text default 'new',
  score numeric,
  icp_score numeric,
  source text default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, email)
);

-- ─────────────────────────────────────────────────────────
-- Lead intelligence (one row per lead per agent output)
-- ─────────────────────────────────────────────────────────
create table if not exists company_research (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  summary text,
  confidence numeric,
  created_at timestamptz default now()
);

create table if not exists icp_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  score numeric,
  fit_score numeric,
  reasoning text,
  created_at timestamptz default now()
);

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  signal_type text,
  content text,
  best_signal text,
  created_at timestamptz default now()
);

create table if not exists email_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  approach text,
  angle text,
  created_at timestamptz default now()
);

create table if not exists email_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  score numeric,
  created_at timestamptz default now()
);

create table if not exists email_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  status text default 'unknown',
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────
-- Emails (drafts → sends). Multiple historical names kept.
-- ─────────────────────────────────────────────────────────
create table if not exists generated_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  subject text,
  subject_1 text,
  body text,
  email_body text,
  edited_subject text,
  edited_body text,
  follow_up_1 text,
  cta text,
  status text default 'generated',
  approval_status text default 'pending',
  safety_status text default 'not_checked',
  personalization_reason text,
  personalization_risk text,
  email_score numeric,
  icp_score numeric,
  research_confidence numeric,
  email_verified boolean default false,
  approved boolean default false,
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists email_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  to_email text,
  subject text,
  html_body text,
  text_body text,
  body text,
  status text default 'draft',
  approval_status text default 'pending',
  approved boolean default false,
  email_score numeric,
  icp_score numeric,
  research_confidence numeric,
  email_verified boolean default false,
  personalization_risk text default 'high',
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists personalized_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  subject text,
  body text,
  approval_status text default 'pending',
  approved_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid,
  lead_id uuid,
  status text,
  created_at timestamptz default now()
);

create table if not exists email_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  draft_id uuid,
  generated_email_id uuid,
  to_email text,
  subject text,
  status text default 'queued',
  provider text,
  provider_message_id text,
  gmail_message_id text,
  gmail_thread_id text,
  thread_id text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  failure_reason text,
  credits_used integer default 0,
  created_at timestamptz default now()
);

create table if not exists email_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  draft_id uuid,
  status text default 'queued',
  scheduled_at timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────
-- Replies (multiple historical names)
-- ─────────────────────────────────────────────────────────
create table if not exists email_replies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid,
  classification text,
  reply_class text,
  sentiment text,
  next_action text,
  should_create_deal boolean default false,
  body text,
  raw_reply text,
  created_at timestamptz default now()
);

create table if not exists reply_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid,
  lead_id uuid,
  provider_message_id text,
  provider_thread_id text,
  from_email text,
  subject text,
  raw_reply text,
  reply_class text default 'unclassified',
  sentiment text,
  next_action text,
  should_stop_sequence boolean default false,
  should_create_deal boolean default false,
  created_at timestamptz default now(),
  unique (user_id, provider_message_id)
);

create table if not exists replies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid,
  classification text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────
-- Meetings & calendar
-- ─────────────────────────────────────────────────────────
create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid,
  campaign_id uuid,
  title text,
  attendee_email text,
  attendee_name text,
  company text,
  scheduled_at timestamptz,
  duration integer default 30,
  meet_link text,
  calendar_event_id text,
  status text default 'pending',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  attendees jsonb,
  meet_link text,
  external_event_id text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────
-- CRM
-- ─────────────────────────────────────────────────────────
create table if not exists crm_deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid,
  campaign_id uuid,
  title text,
  company text,
  stage text default 'interested',
  amount numeric,
  value numeric,
  probability numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid,
  campaign_id uuid,
  name text,
  company text,
  contact_email text,
  stage text default 'prospect',
  value numeric,
  probability numeric default 0,
  expected_close_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists crm_syncs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  deal_id uuid,
  crm text,
  action text,
  notes text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────
-- Agents
-- ─────────────────────────────────────────────────────────
create table if not exists agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid,
  lead_id uuid,
  agent_name text,
  task_type text,
  status text default 'pending',
  priority integer default 5,
  retry_count integer default 0,
  input_json jsonb,
  output_json jsonb,
  error_message text,
  started_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agent_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid,
  lead_id uuid,
  agent_name text,
  decision text,
  reasoning text,
  confidence numeric,
  needs_human_review boolean default false,
  decision_json jsonb,
  created_at timestamptz default now()
);

create table if not exists agent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid,
  agent_name text,
  log_level text default 'info',
  message text,
  created_at timestamptz default now()
);

create table if not exists send_gates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid,
  lead_id uuid,
  eligible_to_send boolean default false,
  decision text default 'queued',
  checks jsonb,
  created_at timestamptz default now()
);

create table if not exists workflow_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid,
  steps_json jsonb,
  total_leads integer default 0,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists campaign_learnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  summary text,
  best_performing_segment text,
  weakness text,
  recommended_change text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────
-- Calls (voice — Phase 5)
-- ─────────────────────────────────────────────────────────
create table if not exists call_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid,
  campaign_id uuid,
  status text default 'queued',
  consent_basis text,
  outcome text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────
-- Fundraising
-- ─────────────────────────────────────────────────────────
create table if not exists investor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  workspace_id uuid,
  campaign_id uuid,
  name text,
  firm text,
  thesis text,
  match_score numeric,
  status text default 'new',
  data_sources jsonb,
  allowed_outreach_channels jsonb,
  created_at timestamptz default now()
);

create table if not exists fundraising_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid,
  outreach_channel text,
  pitch_angle text,
  status text default 'draft',
  needs_legal_review boolean default false,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────
-- Billing & credits (multiple historical names)
-- ─────────────────────────────────────────────────────────
create table if not exists credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  operation text,
  amount integer,
  balance_after integer,
  created_at timestamptz default now()
);

create table if not exists credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  credit_change integer,
  reason text,
  new_balance integer,
  created_at timestamptz default now()
);

create table if not exists credits_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  credit_change integer,
  reason text,
  new_balance integer,
  created_at timestamptz default now()
);

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_type text,
  quantity integer default 1,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists mvp_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  action text,
  created_at timestamptz default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event text,
  properties jsonb,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────
-- Integrations, compliance, security
-- ─────────────────────────────────────────────────────────
create table if not exists google_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scopes text,
  updated_at timestamptz default now()
);

create table if not exists connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  provider text,
  email text,
  status text default 'connected',
  last_refresh_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists compliance_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  unsubscribe_list_enabled boolean default true,
  daily_send_limit integer default 200,
  hourly_send_limit integer default 40,
  cooldown_hours integer default 72,
  require_approval boolean default true,
  company_name text,
  business_website text,
  business_email text,
  physical_mailing_address text,
  outreach_purpose text,
  target_audience text,
  compliance_confirmation boolean default false,
  compliance_confirmed_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists unsubscribes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid,
  email text not null,
  reason text,
  created_at timestamptz default now(),
  unique (user_id, email)
);

create table if not exists error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid,
  source text,
  error_code text,
  context text,
  severity text default 'medium',
  message text,
  error_message text,
  stack_trace text,
  metadata jsonb,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  workspace_id uuid,
  action text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────
-- Developer API (multiple historical names)
-- ─────────────────────────────────────────────────────────
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  key_hash text,
  key_preview text,
  scopes jsonb,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists veldo_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  workspace_id uuid,
  status text default 'active',
  request_count integer default 0,
  last_used_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists veldo_api_key_usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  route text,
  method text,
  status_code integer,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────
-- Veldo chat agent
-- ─────────────────────────────────────────────────────────
create table if not exists veldo_agent_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists veldo_agent_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references veldo_agent_threads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text,
  content text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────
-- Helpful indexes
-- ─────────────────────────────────────────────────────────
create index if not exists idx_leads_user on leads(user_id);
create index if not exists idx_leads_campaign on leads(campaign_id);
create index if not exists idx_campaigns_user on campaigns(user_id);
create index if not exists idx_generated_emails_user on generated_emails(user_id);
create index if not exists idx_generated_emails_campaign on generated_emails(campaign_id);
create index if not exists idx_email_sends_user on email_sends(user_id);
create index if not exists idx_agent_tasks_user_status on agent_tasks(user_id, status);
create index if not exists idx_agent_logs_user on agent_logs(user_id);
