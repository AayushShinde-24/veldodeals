create table if not exists public.growth_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_json jsonb not null,
  confidence integer not null default 0,
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  insight_json jsonb not null,
  confidence integer not null default 0,
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.growth_experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  status text not null default 'planned' check (status in ('planned','running','completed','paused','needs_review')),
  experiment_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  memory_type text not null,
  content_json jsonb not null,
  confidence integer not null default 0,
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_run_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  agent_name text not null,
  run_type text not null,
  summary_json jsonb not null,
  created_at timestamptz not null default now()
);

do $$
declare
  t text;
begin
  foreach t in array array['growth_plans','business_insights','growth_experiments']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end;
$$;

create index if not exists idx_growth_plans_user on public.growth_plans(user_id);
create index if not exists idx_business_insights_user on public.business_insights(user_id);
create index if not exists idx_growth_experiments_user on public.growth_experiments(user_id);
create index if not exists idx_agent_memory_user on public.agent_memory(user_id);
create index if not exists idx_agent_run_summaries_user on public.agent_run_summaries(user_id);

alter table public.growth_plans enable row level security;
alter table public.business_insights enable row level security;
alter table public.growth_experiments enable row level security;
alter table public.agent_memory enable row level security;
alter table public.agent_run_summaries enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['growth_plans','business_insights','growth_experiments','agent_memory','agent_run_summaries']
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end;
$$;
