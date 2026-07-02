-- Veldo Phase 5 — voice calling.
-- Extends call_tasks with provider/outcome detail and adds a do-not-call list.
alter table leads add column if not exists phone text;
alter table call_tasks add column if not exists provider text;
alter table call_tasks add column if not exists provider_call_id text;
alter table call_tasks add column if not exists script text;
alter table call_tasks add column if not exists transcript text;
alter table call_tasks add column if not exists recording_url text;
alter table call_tasks add column if not exists duration_seconds integer;
alter table call_tasks add column if not exists disclosure_given boolean default false;
alter table call_tasks add column if not exists to_phone text;
alter table call_tasks add column if not exists scheduled_at timestamptz;
alter table call_tasks add column if not exists credits_used integer default 0;
alter table call_tasks add column if not exists blockers jsonb;

-- Do-not-call registry (per-workspace + global).
create table if not exists dnc_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  workspace_id uuid,
  phone text not null,
  scope text default 'user',          -- global | workspace | user
  reason text,
  created_at timestamptz default now()
);
create index if not exists idx_dnc_phone on dnc_list(phone);
alter table dnc_list enable row level security;
drop policy if exists dnc_list_owner on dnc_list;
create policy dnc_list_owner on dnc_list for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
