create table if not exists stripe_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  status text not null default 'processing',
  user_id uuid,
  plan text,
  processed_at timestamptz,
  payload jsonb,
  error_message text,
  created_at timestamptz default now()
);

create index if not exists idx_stripe_events_user_id on stripe_events(user_id);
create index if not exists idx_stripe_events_status on stripe_events(status);

alter table stripe_events enable row level security;

drop policy if exists stripe_events_user_read on stripe_events;
create policy stripe_events_user_read on stripe_events for select to authenticated
using (user_id = auth.uid());
