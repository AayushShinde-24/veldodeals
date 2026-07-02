-- Veldo #42 — multi-step follow-up sequences.
-- One row per lead per campaign tracks where they are in the follow-up cadence and
-- when the next step is due. Stops automatically on reply / unsubscribe / meeting.
create table if not exists email_sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid,
  lead_id uuid,
  generated_email_id uuid,
  total_steps integer not null default 3,
  current_step integer not null default 0,    -- 0 = initial sent, 1..N = follow-ups sent
  status text not null default 'active',       -- active | stopped | completed
  stop_reason text,
  next_send_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, campaign_id, lead_id)
);
create index if not exists idx_email_sequences_due on email_sequences(status, next_send_at);
alter table email_sequences enable row level security;
drop policy if exists email_sequences_owner on email_sequences;
create policy email_sequences_owner on email_sequences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Follow-up bodies beyond follow_up_1.
alter table generated_emails add column if not exists follow_up_2 text;
alter table generated_emails add column if not exists follow_up_3 text;
