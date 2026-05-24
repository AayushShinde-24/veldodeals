create extension if not exists "pgcrypto";

create table if not exists public.veldo_agent_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  title text not null default 'Veldo Agent',
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.veldo_agent_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.veldo_agent_threads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool','system')),
  content text not null,
  tool_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.veldo_agent_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  key text not null,
  summary text not null,
  value_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, campaign_id, key)
);

create table if not exists public.veldo_agent_tool_runs (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.veldo_agent_threads(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  tool_name text not null,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  status text not null default 'success' check (status in ('success','failed','blocked','needs_user_approval')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_veldo_agent_threads_user on public.veldo_agent_threads(user_id, created_at);
create index if not exists idx_veldo_agent_messages_thread on public.veldo_agent_messages(thread_id, created_at);
create index if not exists idx_veldo_agent_memory_user_campaign on public.veldo_agent_memory(user_id, campaign_id);
create index if not exists idx_veldo_agent_tool_runs_user on public.veldo_agent_tool_runs(user_id, created_at);

do $$
declare
  t text;
begin
  foreach t in array array['veldo_agent_threads','veldo_agent_memory','veldo_agent_tool_runs']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end;
$$;

alter table public.veldo_agent_threads enable row level security;
alter table public.veldo_agent_messages enable row level security;
alter table public.veldo_agent_memory enable row level security;
alter table public.veldo_agent_tool_runs enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['veldo_agent_threads','veldo_agent_messages','veldo_agent_memory','veldo_agent_tool_runs']
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end;
$$;
