-- Veldo Phase 1 — credit ledger as the single source of truth.
-- Makes credit movement atomic (row-locked), idempotent (idempotency_key), and
-- consistent (the ledger row's new_balance always matches profiles.credits).

-- 1) Ledger gains idempotency + metadata.
alter table credit_ledger add column if not exists idempotency_key text;
alter table credit_ledger add column if not exists metadata jsonb default '{}'::jsonb;
create unique index if not exists idx_credit_ledger_idem
  on credit_ledger (user_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists idx_credit_ledger_user_created
  on credit_ledger (user_id, created_at desc);

-- 2) Track the free-tier monthly grant window.
alter table profiles add column if not exists credits_period_start timestamptz;

-- 3) Deal-close fees (2.5% on every tier). One row per closed deal.
create table if not exists deal_fees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  workspace_id uuid,
  deal_id uuid,
  deal_type text default 'sales',          -- sales | fundraising | distribution
  deal_value numeric not null,
  fee_pct numeric not null default 2.5,
  fee_amount numeric not null,
  currency text default 'usd',
  status text default 'pending',           -- pending | invoiced | paid | waived
  created_at timestamptz default now()
);
create index if not exists idx_deal_fees_user on deal_fees(user_id);
alter table deal_fees enable row level security;
drop policy if exists deal_fees_owner on deal_fees;
create policy deal_fees_owner on deal_fees for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4) Atomic, idempotent credit movement.
--    Positive p_change = grant/refund; negative = consumption.
--    Raises INSUFFICIENT_CREDITS when a debit would push the balance below zero.
create or replace function apply_credit_ledger(
  p_user uuid,
  p_change integer,
  p_reason text,
  p_idem text default null,
  p_meta jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_balance integer;
  v_existing integer;
begin
  -- Idempotency: replaying the same key is a no-op that returns the prior balance.
  if p_idem is not null then
    select new_balance into v_existing
      from credit_ledger
     where user_id = p_user and idempotency_key = p_idem
     limit 1;
    if found then
      return v_existing;
    end if;
  end if;

  -- Lock the balance row for the duration of the transaction.
  select coalesce(credits, 0) into v_balance from profiles where id = p_user for update;
  if not found then
    raise exception 'PROFILE_NOT_FOUND: %', p_user;
  end if;

  if p_change < 0 and (v_balance + p_change) < 0 then
    raise exception 'INSUFFICIENT_CREDITS: have %, need %', v_balance, -p_change;
  end if;

  v_balance := v_balance + p_change;
  update profiles set credits = v_balance, credits_balance = v_balance, updated_at = now() where id = p_user;

  insert into credit_ledger (user_id, credit_change, reason, new_balance, idempotency_key, metadata, created_at)
    values (p_user, p_change, p_reason, v_balance, p_idem, coalesce(p_meta, '{}'::jsonb), now());

  return v_balance;
end;
$$;
