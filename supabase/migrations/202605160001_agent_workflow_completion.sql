create extension if not exists "pgcrypto";

create table if not exists public.email_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  angle text not null,
  pain_hypothesis text not null,
  offer text not null,
  cta text not null,
  tone text not null,
  objection_risk text not null,
  facts_allowed jsonb not null default '[]'::jsonb,
  facts_blocked jsonb not null default '[]'::jsonb,
  confidence integer not null default 0,
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

create table if not exists public.send_gate_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  eligible_to_send boolean not null default false,
  checks jsonb not null default '[]'::jsonb,
  failures jsonb not null default '[]'::jsonb,
  needs_review boolean not null default true,
  decision text not null default 'review' check (decision in ('send','review','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

alter table public.personalized_emails add column if not exists personalization_used jsonb not null default '[]'::jsonb;
alter table public.personalized_emails add column if not exists assumptions jsonb not null default '[]'::jsonb;

create index if not exists idx_email_strategies_campaign on public.email_strategies(campaign_id, needs_review);
create index if not exists idx_send_gate_results_campaign on public.send_gate_results(campaign_id, eligible_to_send);

do $$
declare
  t text;
begin
  foreach t in array array['email_strategies','send_gate_results']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end;
$$;

alter table public.email_strategies enable row level security;
alter table public.send_gate_results enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['email_strategies','send_gate_results']
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end;
$$;

create or replace view public.buying_signals as
select
  id,
  user_id,
  campaign_id,
  lead_id,
  signals,
  best_signal,
  confidence,
  created_at,
  updated_at
from public.public_signals;

create or replace view public.email_drafts as
select
  id,
  user_id,
  campaign_id,
  lead_id,
  subject_1,
  subject_2,
  email_body,
  cta,
  tone,
  word_count,
  approval_status,
  approved_at,
  personalization_used,
  assumptions,
  created_at,
  updated_at
from public.personalized_emails;

create or replace view public.credit_usage_events as
select
  id,
  user_id,
  campaign_id,
  lead_id,
  event_type,
  credits,
  metadata,
  created_at
from public.usage_events;

create or replace view public.reply_triage_events as
select
  id,
  user_id,
  campaign_id,
  lead_id,
  raw_reply,
  reply_class,
  sentiment,
  next_action,
  should_stop_sequence,
  should_create_deal,
  created_at,
  updated_at
from public.reply_events;
