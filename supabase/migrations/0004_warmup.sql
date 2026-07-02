-- Veldo Phase 3 — mailbox warmup tracking.
-- Records when a mailbox entered warmup so the daily send cap can ramp gradually
-- (protects sender reputation on new mailboxes).
alter table google_tokens add column if not exists warmup_started_at timestamptz;
alter table google_tokens add column if not exists warmup_paused boolean default false;
alter table connected_accounts add column if not exists warmup_started_at timestamptz;
