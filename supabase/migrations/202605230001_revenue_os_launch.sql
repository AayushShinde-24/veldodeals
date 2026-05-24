alter table public.campaigns add column if not exists revenue_workflow_state text not null default 'researching';
alter table public.campaigns add column if not exists campaign_type text not null default 'sales';
alter table public.campaigns add column if not exists channel_mix jsonb not null default '{"email": true, "calls": false, "fundraising": false}'::jsonb;
alter table public.campaigns add column if not exists target_outcomes jsonb not null default '{"meeting_rate_pct": 10, "email_deal_rate_pct": 1, "call_deal_rate_pct": 5}'::jsonb;
alter table public.campaigns drop constraint if exists campaigns_revenue_workflow_state_check;
alter table public.campaigns add constraint campaigns_revenue_workflow_state_check check (
  revenue_workflow_state in ('researching','drafting','calling','meeting_booking','deal_followup','fundraising','needs_review','blocked','closed')
);
alter table public.campaigns drop constraint if exists campaigns_campaign_type_check;
alter table public.campaigns add constraint campaigns_campaign_type_check check (campaign_type in ('sales','fundraising','distribution','hybrid'));

alter table public.leads add column if not exists data_sources jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists allowed_outreach_channels text[] not null default array['email']::text[];
alter table public.leads add column if not exists personalization_tier text not null default 'standard';

alter table public.users add column if not exists credit_reset_at timestamptz;
alter table public.users add column if not exists hyper_personalization_enabled boolean not null default false;
alter table public.users alter column plan set default 'free';
alter table public.users alter column credits_balance set default 150;
update public.users set plan = 'grow' where plan = 'growth';
update public.users set plan = 'custom_enterprise' where plan = 'scale';
update public.users set credits_balance = 150 where plan = 'free' and credits_balance = 0;
alter table public.users drop constraint if exists users_plan_check;
alter table public.users add constraint users_plan_check check (
  plan in ('free','starter','go','pro','plus','grow','expand','advanced_expansion','custom_enterprise')
);

alter table public.crm_deals drop constraint if exists crm_deals_stage_check;
alter table public.crm_deals add constraint crm_deals_stage_check check (
  stage in ('interested','meeting_booked','demo_done','proposal_sent','negotiation','won','lost','new_lead','qualified','demo_booked','proposal')
);

create table if not exists public.call_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  status text not null default 'needs_review',
  consent_basis text not null default 'manual_review_required',
  compliance_json jsonb not null default '{}'::jsonb,
  script text,
  transcript text,
  outcome text,
  score integer,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  name text not null,
  firm text,
  email text,
  phone text,
  thesis text,
  stage_focus text,
  geography text,
  check_size text,
  portfolio jsonb not null default '[]'::jsonb,
  data_sources jsonb not null default '[]'::jsonb,
  match_score integer not null default 0,
  allowed_outreach_channels text[] not null default array['email']::text[],
  status text not null default 'researched',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fundraising_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  investor_id uuid references public.investor_profiles(id) on delete cascade,
  status text not null default 'needs_review',
  compliance_json jsonb not null default '{}'::jsonb,
  outreach_channel text not null default 'email',
  pitch_angle text,
  email_subject text,
  email_body text,
  call_script text,
  meeting_prep jsonb not null default '{}'::jsonb,
  follow_up_plan jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.call_tasks enable row level security;
alter table public.investor_profiles enable row level security;
alter table public.fundraising_tasks enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['call_tasks','investor_profiles','fundraising_tasks']
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

create index if not exists idx_call_tasks_user_campaign on public.call_tasks(user_id, campaign_id, status);
create index if not exists idx_investor_profiles_user_campaign on public.investor_profiles(user_id, campaign_id, status);
create index if not exists idx_fundraising_tasks_user_campaign on public.fundraising_tasks(user_id, campaign_id, status);
