-- Veldo #46 — deal-closing automation (proposal → e-sign).
create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  deal_id uuid,
  title text,
  content text,
  value numeric,
  status text not null default 'draft',     -- draft | sent | viewed | signed | declined
  esign_provider text,
  esign_request_id text,
  signer_email text,
  sent_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_proposals_deal on proposals(deal_id);
create index if not exists idx_proposals_esign on proposals(esign_request_id);
alter table proposals enable row level security;
drop policy if exists proposals_owner on proposals;
create policy proposals_owner on proposals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
