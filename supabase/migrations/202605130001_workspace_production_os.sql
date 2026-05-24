create extension if not exists "pgcrypto";

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.users(id) on delete cascade,
  plan text not null default 'starter',
  website text,
  industry text,
  company_size text,
  icp_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  name text,
  role text,
  company text,
  phone text,
  timezone text,
  language text default 'en',
  bio text,
  email_signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  website text,
  industry text,
  size text,
  location text,
  revenue text,
  tech_stack jsonb not null default '[]'::jsonb,
  description text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_research (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  website_summary text,
  recent_news jsonb not null default '[]'::jsonb,
  pain_points jsonb not null default '[]'::jsonb,
  personalization_notes text,
  raw_data jsonb not null default '{}'::jsonb,
  confidence integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  subject text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft','needs_review','approved','queued','sent','failed','replied','bounced','rejected')),
  provider text,
  provider_message_id text,
  sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  email_id uuid references public.emails(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  body text not null,
  classification text not null default 'unclassified',
  sentiment text,
  should_stop_sequence boolean not null default false,
  should_create_deal boolean not null default false,
  provider_message_id text,
  raw_data jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  title text not null,
  value integer not null default 0,
  stage text not null default 'new',
  probability integer not null default 10,
  expected_close_date date,
  source text not null default 'reply',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  task_id uuid references public.agent_tasks(id) on delete set null,
  agent_name text not null,
  task text not null,
  status text not null check (status in ('success','failed','needs_user_confirmation','needs_more_data')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  confidence integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('gmail','google_calendar','resend','apollo','clay','firecrawl','tavily','enrich','me5')),
  email text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  scope text,
  expires_at timestamptz,
  status text not null default 'setup_required' check (status in ('setup_required','connected','expired','revoked','error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  deal_id uuid references public.crm_deals(id) on delete set null,
  provider text not null default 'google_calendar',
  provider_event_id text,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  attendees jsonb not null default '[]'::jsonb,
  status text not null default 'scheduled',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  sending jsonb not null default '{}'::jsonb,
  security jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.campaigns add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.campaign_steps add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.leads add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.leads add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.leads add column if not exists phone text;
alter table public.leads add column if not exists fit_score integer;
alter table public.leads add column if not exists intent_score integer;
alter table public.leads add column if not exists enrichment_status text not null default 'not_started';
alter table public.agent_tasks add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.agent_logs add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.agent_decisions add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.email_send_events add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.reply_events add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.usage_events add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.credits_ledger add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.campaign_learnings add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

insert into public.workspaces (name, owner_id, plan)
select coalesce(nullif(company_name, ''), split_part(coalesce(email, 'Veldo Workspace'), '@', 1), 'Veldo Workspace'), id, plan
from public.users u
where not exists (select 1 from public.workspaces w where w.owner_id = u.id);

insert into public.workspace_members (workspace_id, user_id, role)
select w.id, w.owner_id, 'owner'
from public.workspaces w
on conflict (workspace_id, user_id) do nothing;

insert into public.profiles (user_id, name, company)
select id, full_name, company_name
from public.users
on conflict (user_id) do update set
  name = coalesce(public.profiles.name, excluded.name),
  company = coalesce(public.profiles.company, excluded.company);

update public.campaigns c set workspace_id = w.id
from public.workspaces w
where c.workspace_id is null and c.user_id = w.owner_id;

update public.campaign_steps cs set workspace_id = c.workspace_id
from public.campaigns c
where cs.workspace_id is null and cs.campaign_id = c.id;

update public.leads l
set workspace_id = coalesce(
  (select c.workspace_id from public.campaigns c where c.id = l.campaign_id),
  (select w.id from public.workspaces w where w.owner_id = l.user_id limit 1)
)
where l.workspace_id is null;

update public.agent_tasks t
set workspace_id = coalesce(
  (select c.workspace_id from public.campaigns c where c.id = t.campaign_id),
  (select w.id from public.workspaces w where w.owner_id = t.user_id limit 1)
)
where t.workspace_id is null;

update public.agent_logs l
set workspace_id = coalesce(
  (select c.workspace_id from public.campaigns c where c.id = l.campaign_id),
  (select w.id from public.workspaces w where w.owner_id = l.user_id limit 1)
)
where l.workspace_id is null;

update public.agent_decisions d
set workspace_id = coalesce(
  (select c.workspace_id from public.campaigns c where c.id = d.campaign_id),
  (select w.id from public.workspaces w where w.owner_id = d.user_id limit 1)
)
where d.workspace_id is null;

update public.email_send_events e set workspace_id = c.workspace_id
from public.campaigns c
where e.workspace_id is null and e.campaign_id = c.id;

update public.reply_events r
set workspace_id = coalesce(
  (select c.workspace_id from public.campaigns c where c.id = r.campaign_id),
  (select w.id from public.workspaces w where w.owner_id = r.user_id limit 1)
)
where r.workspace_id is null;

update public.usage_events u
set workspace_id = coalesce(
  (select c.workspace_id from public.campaigns c where c.id = u.campaign_id),
  (select w.id from public.workspaces w where w.owner_id = u.user_id limit 1)
)
where u.workspace_id is null;

update public.credits_ledger cl set workspace_id = w.id
from public.workspaces w
where cl.workspace_id is null and cl.user_id = w.owner_id;

update public.campaign_learnings l set workspace_id = c.workspace_id
from public.campaigns c
where l.workspace_id is null and l.campaign_id = c.id;

create index if not exists idx_workspaces_owner on public.workspaces(owner_id);
create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_campaigns_workspace on public.campaigns(workspace_id);
create index if not exists idx_leads_workspace on public.leads(workspace_id);
create index if not exists idx_companies_workspace on public.companies(workspace_id);
create index if not exists idx_emails_workspace on public.emails(workspace_id);
create index if not exists idx_replies_workspace on public.replies(workspace_id);
create index if not exists idx_crm_deals_workspace_stage on public.crm_deals(workspace_id, stage);
create index if not exists idx_agent_runs_workspace on public.agent_runs(workspace_id);
create index if not exists idx_analytics_events_workspace_type on public.analytics_events(workspace_id, event_type, created_at);
create index if not exists idx_connected_accounts_workspace_provider on public.connected_accounts(workspace_id, provider);
create unique index if not exists idx_connected_accounts_workspace_provider_email on public.connected_accounts(workspace_id, provider, email);
create unique index if not exists idx_connected_accounts_unique_email on public.connected_accounts(workspace_id, provider, coalesce(email, ''));
create index if not exists idx_audit_logs_workspace on public.audit_logs(workspace_id, created_at);

do $$
declare
  t text;
begin
  foreach t in array array[
    'workspaces','profiles','companies','lead_research','emails','crm_deals',
    'connected_accounts','calendar_events','settings'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end;
$$;

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
  );
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.lead_research enable row level security;
alter table public.emails enable row level security;
alter table public.replies enable row level security;
alter table public.crm_deals enable row level security;
alter table public.agent_runs enable row level security;
alter table public.analytics_events enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.calendar_events enable row level security;
alter table public.settings enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "workspace owner rows" on public.workspaces;
create policy "workspace owner rows" on public.workspaces for all
using (owner_id = auth.uid() or public.is_workspace_member(id))
with check (owner_id = auth.uid() or public.is_workspace_member(id));

drop policy if exists "workspace member rows" on public.workspace_members;
create policy "workspace member rows" on public.workspace_members for all
using (user_id = auth.uid() or public.is_workspace_member(workspace_id))
with check (user_id = auth.uid() or public.is_workspace_member(workspace_id));

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array[
    'companies','lead_research','emails','replies','crm_deals','agent_runs',
    'analytics_events','connected_accounts','calendar_events','settings','audit_logs'
  ]
  loop
    execute format('drop policy if exists "workspace rows" on public.%I', t);
    execute format('create policy "workspace rows" on public.%I for all using (workspace_id is not null and public.is_workspace_member(workspace_id)) with check (workspace_id is not null and public.is_workspace_member(workspace_id))', t);
  end loop;
end;
$$;
