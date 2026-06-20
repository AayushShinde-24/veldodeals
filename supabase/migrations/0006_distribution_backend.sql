create table if not exists segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  workspace_id uuid,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ab_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  name text not null,
  weight integer not null default 1,
  payload jsonb not null default '{}'::jsonb,
  sends_count integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists scheduled_publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  workspace_id uuid,
  channel text not null,
  content text not null,
  scheduled_at timestamptz not null,
  status text not null default 'queued',
  published_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_segments_user_id on segments(user_id);
create index if not exists idx_ab_variants_campaign on ab_variants(campaign_id);
create index if not exists idx_publications_due on scheduled_publications(status, scheduled_at);

alter table segments enable row level security;
alter table ab_variants enable row level security;
alter table scheduled_publications enable row level security;

drop policy if exists segments_user_access on segments;
create policy segments_user_access on segments for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists ab_variants_user_access on ab_variants;
create policy ab_variants_user_access on ab_variants for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists scheduled_publications_user_access on scheduled_publications;
create policy scheduled_publications_user_access on scheduled_publications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
