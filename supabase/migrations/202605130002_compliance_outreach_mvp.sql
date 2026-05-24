create extension if not exists "pgcrypto";

alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns add constraint campaigns_status_check check (
  status in ('draft','fetching_leads','leads_ready','generating_emails','ready_to_send','sending','completed','failed','paused','running','needs_review')
);

alter table public.campaigns add column if not exists product_offer text;
alter table public.campaigns add column if not exists target_niche text;
alter table public.campaigns add column if not exists industry text;
alter table public.campaigns add column if not exists location text;
alter table public.campaigns add column if not exists company_size text;
alter table public.campaigns add column if not exists job_titles text[] not null default '{}';
alter table public.campaigns add column if not exists number_of_leads integer not null default 10;
alter table public.campaigns add column if not exists tone text not null default 'clear, direct, professional';
alter table public.campaigns add column if not exists call_to_action text;

alter table public.leads add column if not exists full_name text;
alter table public.leads add column if not exists email_status text;
alter table public.leads add column if not exists status text not null default 'new';

create table if not exists public.user_compliance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  company_name text not null,
  business_website text not null,
  business_email text not null,
  physical_mailing_address text not null,
  outreach_purpose text not null,
  target_audience text not null,
  compliance_confirmation boolean not null default false,
  compliance_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generated_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  subject text not null,
  preview_line text,
  body text not null,
  cta text,
  personalization_reason text,
  status text not null default 'generated' check (status in ('generated','approved','edited','failed')),
  edited_subject text,
  edited_body text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, campaign_id)
);

create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  generated_email_id uuid references public.generated_emails(id) on delete set null,
  provider text not null default 'gmail',
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued','sent','failed','blocked_unsubscribed','blocked_compliance','blocked_limit')),
  sent_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.unsubscribes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  email text not null,
  reason text,
  source text not null default 'public_link',
  created_at timestamptz not null default now(),
  unique (user_id, email)
);

create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  usage_date date not null default current_date,
  usage_month text not null default to_char(now(), 'YYYY-MM'),
  emails_generated integer not null default 0,
  emails_sent integer not null default 0,
  leads_fetched integer not null default 0,
  leads_enriched integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, usage_date)
);

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  source text not null,
  error_code text,
  error_message text not null,
  raw_error jsonb,
  created_at timestamptz not null default now()
);

alter table public.connected_accounts add column if not exists user_id uuid references public.users(id) on delete cascade;
alter table public.connected_accounts add column if not exists connected_at timestamptz;

create index if not exists idx_user_compliance_user on public.user_compliance(user_id);
create index if not exists idx_generated_emails_user_campaign on public.generated_emails(user_id, campaign_id);
create index if not exists idx_email_sends_user_campaign on public.email_sends(user_id, campaign_id);
create index if not exists idx_unsubscribes_user_email on public.unsubscribes(user_id, lower(email));
create index if not exists idx_usage_user_date on public.usage(user_id, usage_date);
create index if not exists idx_error_logs_user_source on public.error_logs(user_id, source, created_at);

do $$
declare
  t text;
begin
  foreach t in array array['user_compliance','generated_emails','email_sends','usage']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end;
$$;

alter table public.user_compliance enable row level security;
alter table public.generated_emails enable row level security;
alter table public.email_sends enable row level security;
alter table public.unsubscribes enable row level security;
alter table public.usage enable row level security;
alter table public.error_logs enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['user_compliance','generated_emails','email_sends','usage']
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end;
$$;

drop policy if exists "own unsubscribe rows" on public.unsubscribes;
create policy "own unsubscribe rows" on public.unsubscribes for select using (auth.uid() = user_id);

drop policy if exists "public unsubscribe insert" on public.unsubscribes;
create policy "public unsubscribe insert" on public.unsubscribes for insert
with check (email is not null and length(email) <= 320);

drop policy if exists "own error logs" on public.error_logs;
create policy "own error logs" on public.error_logs for select using (auth.uid() = user_id);
