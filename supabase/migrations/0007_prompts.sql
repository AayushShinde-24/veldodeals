create table if not exists prompts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz default now(),
  unique (name, version)
);

create index if not exists idx_prompts_name_version on prompts(name, version desc);

alter table prompts enable row level security;

drop policy if exists prompts_authenticated_read on prompts;
create policy prompts_authenticated_read on prompts for select to authenticated using (true);

drop policy if exists prompts_authenticated_insert on prompts;
create policy prompts_authenticated_insert on prompts for insert to authenticated with check (created_by = auth.uid());
