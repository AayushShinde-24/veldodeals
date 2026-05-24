create table if not exists public.veldo_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  mode text not null default 'test' check (mode in ('test', 'live')),
  key_hash text not null unique,
  key_prefix text not null,
  key_last_four text not null,
  masked_key text not null,
  permissions text[] not null default array['campaigns:read', 'usage:read']::text[],
  status text not null default 'active' check (status in ('active', 'disabled', 'revoked')),
  request_count bigint not null default 0,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists veldo_api_keys_user_id_idx on public.veldo_api_keys(user_id);
create index if not exists veldo_api_keys_workspace_id_idx on public.veldo_api_keys(workspace_id);
create index if not exists veldo_api_keys_status_idx on public.veldo_api_keys(status);

create table if not exists public.veldo_api_key_usage_events (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references public.veldo_api_keys(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  route text not null,
  method text not null,
  status_code integer,
  created_at timestamptz not null default now()
);

create index if not exists veldo_api_key_usage_events_key_idx on public.veldo_api_key_usage_events(api_key_id, created_at desc);
create index if not exists veldo_api_key_usage_events_workspace_idx on public.veldo_api_key_usage_events(workspace_id, created_at desc);
