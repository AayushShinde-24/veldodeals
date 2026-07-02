-- Veldo Phase 4 — pay-as-you-go usage accrual (Custom Enterprise tier).
-- Custom-plan users have no fixed credit balance; each action accrues a billable
-- dollar amount here, aggregated and invoiced periodically.
create table if not exists payg_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  workspace_id uuid,
  action text not null,
  credits integer not null,
  hyper_personalized boolean default false,
  unit_usd numeric not null,
  amount_usd numeric not null,
  status text default 'unbilled',          -- unbilled | invoiced | paid
  created_at timestamptz default now()
);
create index if not exists idx_payg_usage_user_status on payg_usage(user_id, status);
alter table payg_usage enable row level security;
drop policy if exists payg_usage_owner on payg_usage;
create policy payg_usage_owner on payg_usage for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
