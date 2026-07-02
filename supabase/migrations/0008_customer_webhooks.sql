create table if not exists webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  workspace_id uuid,
  url text not null,
  secret text not null,
  events text[] not null default '{}',
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid references webhook_endpoints(id) on delete cascade,
  event text not null,
  payload jsonb not null,
  status text not null default 'queued',
  attempts integer not null default 0,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz default now()
);

alter table webhook_endpoints enable row level security;
alter table webhook_deliveries enable row level security;

drop policy if exists webhook_endpoints_user_access on webhook_endpoints;
create policy webhook_endpoints_user_access on webhook_endpoints for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists webhook_deliveries_user_read on webhook_deliveries;
create policy webhook_deliveries_user_read on webhook_deliveries for select to authenticated
using (exists (select 1 from webhook_endpoints e where e.id = endpoint_id and e.user_id = auth.uid()));
