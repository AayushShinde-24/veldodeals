create table if not exists suppressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  workspace_id uuid,
  email text not null,
  scope text not null default 'workspace',
  reason text not null default 'manual',
  source text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique (user_id, email, scope)
);

create index if not exists idx_suppressions_email on suppressions(lower(email));
create index if not exists idx_suppressions_workspace on suppressions(workspace_id);

alter table suppressions enable row level security;

drop policy if exists suppressions_user_access on suppressions;
create policy suppressions_user_access on suppressions for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
