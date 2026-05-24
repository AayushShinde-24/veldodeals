create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key,
  email text,
  full_name text,
  company_name text,
  plan text not null default 'starter',
  credits_balance integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  goal text not null,
  offer_json jsonb not null default '{}'::jsonb,
  icp_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','running','paused','completed','failed','needs_review')),
  autopilot_enabled boolean not null default false,
  leader_decision_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  step_number integer not null,
  delay_days integer not null,
  subject text not null,
  body text not null,
  goal text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, step_number)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  first_name text,
  last_name text,
  email text not null,
  title text,
  company text not null,
  company_website text,
  linkedin_url text,
  industry text,
  location text,
  stage text not null default 'imported',
  rejection_reason text,
  source text not null default 'manual',
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_enrichment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  enriched_profile jsonb not null default '{}'::jsonb,
  company_data jsonb not null default '{}'::jsonb,
  social_profiles jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  confidence integer not null default 0,
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

create table if not exists public.company_research (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  company_summary text not null,
  target_customers text,
  product_offering text,
  positioning text,
  possible_pain_points jsonb not null default '[]'::jsonb,
  useful_pages jsonb not null default '[]'::jsonb,
  confidence integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

create table if not exists public.public_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  signals jsonb not null default '[]'::jsonb,
  best_signal text,
  confidence integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

create table if not exists public.icp_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  fit_score integer not null,
  fit_level text not null check (fit_level in ('high','medium','low','reject')),
  reason text not null,
  should_continue boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

create table if not exists public.personalization_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  business_priority text,
  pain_point text,
  public_trigger text,
  personalization_angle text,
  opener text,
  risk_level text not null check (risk_level in ('low','medium','high')),
  confidence integer not null default 0,
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

create table if not exists public.personalized_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  subject_1 text not null,
  subject_2 text,
  email_body text not null,
  cta text,
  tone text,
  word_count integer not null default 0,
  approval_status text not null default 'needs_review' check (approval_status in ('needs_review','approved','rejected','sent')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

create table if not exists public.email_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  score integer not null,
  pass boolean not null default false,
  fail_reason text,
  fixes jsonb not null default '[]'::jsonb,
  final_verdict text not null check (final_verdict in ('send','revise','reject')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

create table if not exists public.email_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  email text not null,
  status text not null check (status in ('valid','invalid','catch_all','risky','unknown')),
  send_decision text not null check (send_decision in ('send','skip','review')),
  reason text,
  provider_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

create table if not exists public.email_send_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  provider_message_id text,
  credits_used integer not null default 1,
  status text not null,
  provider_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reply_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  raw_reply text not null,
  reply_class text not null,
  sentiment text,
  next_action text,
  should_stop_sequence boolean not null default false,
  should_create_deal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_sync_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  crm text not null,
  contact_id text,
  deal_id text,
  action text not null check (action in ('created','updated','skipped')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  event_type text not null,
  credits integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.credits_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  usage_event_id uuid references public.usage_events(id) on delete set null,
  credit_change integer not null,
  reason text not null,
  new_balance integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null,
  provider_subscription_id text,
  status text not null,
  plan text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  provider text not null,
  provider_payment_id text,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  agent_name text not null,
  task_type text not null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','needs_review','blocked')),
  priority integer not null default 5,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb,
  error_message text,
  retry_count integer not null default 0,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  task_id uuid references public.agent_tasks(id) on delete set null,
  agent_name text not null,
  level text not null default 'info',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  task_id uuid references public.agent_tasks(id) on delete set null,
  agent_name text not null,
  decision_json jsonb not null,
  confidence integer not null default 0,
  needs_human_review boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.api_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  task_id uuid references public.agent_tasks(id) on delete set null,
  provider text not null,
  endpoint text,
  error_message text not null,
  status_code integer,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_learnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  summary text not null,
  best_performing_segment text,
  weakness text,
  recommended_change text,
  risk_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id)
);

do $$
declare
  t text;
begin
  foreach t in array array[
    'users','campaigns','campaign_steps','leads','lead_enrichment','company_research',
    'public_signals','icp_scores','personalization_strategies','personalized_emails',
    'email_scores','email_verifications','email_send_events','reply_events',
    'crm_sync_events','subscriptions','payments','agent_tasks','campaign_learnings'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end;
$$;

create index if not exists idx_campaigns_user on public.campaigns(user_id);
create index if not exists idx_campaigns_status on public.campaigns(status);
create index if not exists idx_leads_user on public.leads(user_id);
create index if not exists idx_leads_campaign on public.leads(campaign_id);
create index if not exists idx_leads_stage on public.leads(stage);
create unique index if not exists idx_leads_campaign_email_unique on public.leads(campaign_id, email);
create index if not exists idx_agent_tasks_user on public.agent_tasks(user_id);
create index if not exists idx_agent_tasks_campaign on public.agent_tasks(campaign_id);
create index if not exists idx_agent_tasks_lead on public.agent_tasks(lead_id);
create index if not exists idx_agent_tasks_status_priority on public.agent_tasks(status, priority, created_at);
create index if not exists idx_agent_logs_user on public.agent_logs(user_id);
create index if not exists idx_agent_logs_campaign on public.agent_logs(campaign_id);
create index if not exists idx_usage_events_user on public.usage_events(user_id);
create index if not exists idx_credits_ledger_user on public.credits_ledger(user_id);

alter table public.users enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_steps enable row level security;
alter table public.leads enable row level security;
alter table public.lead_enrichment enable row level security;
alter table public.company_research enable row level security;
alter table public.public_signals enable row level security;
alter table public.icp_scores enable row level security;
alter table public.personalization_strategies enable row level security;
alter table public.personalized_emails enable row level security;
alter table public.email_scores enable row level security;
alter table public.email_verifications enable row level security;
alter table public.email_send_events enable row level security;
alter table public.reply_events enable row level security;
alter table public.crm_sync_events enable row level security;
alter table public.usage_events enable row level security;
alter table public.credits_ledger enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.agent_logs enable row level security;
alter table public.agent_decisions enable row level security;
alter table public.api_errors enable row level security;
alter table public.campaign_learnings enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'users','campaigns','campaign_steps','leads','lead_enrichment','company_research',
    'public_signals','icp_scores','personalization_strategies','personalized_emails',
    'email_scores','email_verifications','email_send_events','reply_events',
    'crm_sync_events','usage_events','credits_ledger','subscriptions','payments',
    'agent_tasks','agent_logs','agent_decisions','api_errors','campaign_learnings'
  ]
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end;
$$;
