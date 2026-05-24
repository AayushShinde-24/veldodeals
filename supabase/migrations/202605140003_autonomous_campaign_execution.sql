create extension if not exists "pgcrypto";

alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns add constraint campaigns_status_check check (
  status in ('draft','fetching_leads','leads_ready','generating_emails','ready_to_send','queueing','queued','sending','completed','failed','paused','running','needs_review')
);

alter table public.campaigns add column if not exists product_name text;
alter table public.campaigns add column if not exists product_description text;
alter table public.campaigns add column if not exists offer text;
alter table public.campaigns add column if not exists target_audience text;
alter table public.campaigns add column if not exists target_companies text;
alter table public.campaigns add column if not exists desired_outcome text;
alter table public.campaigns add column if not exists sending_mode text not null default 'approval_required';
alter table public.campaigns add column if not exists workflow_progress integer not null default 0;
alter table public.campaigns add column if not exists final_summary jsonb not null default '{}'::jsonb;
alter table public.campaigns drop constraint if exists campaigns_sending_mode_check;
alter table public.campaigns add constraint campaigns_sending_mode_check check (sending_mode in ('draft_only','approval_required','auto_send'));

alter table public.leads add column if not exists source_record_id text;
alter table public.leads add column if not exists score integer;
alter table public.leads add column if not exists score_reason text;
alter table public.leads add column if not exists duplicate_of uuid references public.leads(id) on delete set null;
alter table public.leads add column if not exists provider_metadata jsonb not null default '{}'::jsonb;

alter table public.lead_enrichment add column if not exists enrichment_source text;
alter table public.lead_enrichment add column if not exists enrichment_status text not null default 'completed';
alter table public.lead_enrichment add column if not exists enrichment_error text;
alter table public.lead_enrichment add column if not exists company_summary text;
alter table public.lead_enrichment add column if not exists website_summary text;
alter table public.lead_enrichment add column if not exists product_service_summary text;
alter table public.lead_enrichment add column if not exists pain_points jsonb not null default '[]'::jsonb;
alter table public.lead_enrichment add column if not exists personalization_signals jsonb not null default '[]'::jsonb;
alter table public.lead_enrichment add column if not exists buying_triggers jsonb not null default '[]'::jsonb;

alter table public.generated_emails drop constraint if exists generated_emails_status_check;
alter table public.generated_emails add constraint generated_emails_status_check check (
  status in ('generated','drafted','approved','edited','safety_checked','queued','sending','sent','failed','bounced','replied','blocked_compliance','blocked_unsubscribed','blocked_limit')
);
alter table public.generated_emails add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.generated_emails add column if not exists task_id uuid references public.agent_tasks(id) on delete set null;
alter table public.generated_emails add column if not exists opening_line text;
alter table public.generated_emails add column if not exists follow_up_1 text;
alter table public.generated_emails add column if not exists follow_up_2 text;
alter table public.generated_emails add column if not exists safety_status text not null default 'not_checked';
alter table public.generated_emails add column if not exists safety_issues jsonb not null default '[]'::jsonb;
alter table public.generated_emails add column if not exists queued_at timestamptz;
alter table public.generated_emails add column if not exists sent_at timestamptz;
alter table public.generated_emails drop constraint if exists generated_emails_safety_status_check;
alter table public.generated_emails add constraint generated_emails_safety_status_check check (
  safety_status in ('not_checked','passed','failed','blocked')
);

alter table public.email_sends drop constraint if exists email_sends_status_check;
alter table public.email_sends add constraint email_sends_status_check check (
  status in ('drafted','safety_checked','queued','sending','sent','failed','blocked_unsubscribed','blocked_compliance','blocked_limit')
);
alter table public.email_sends add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.email_sends add column if not exists task_id uuid references public.agent_tasks(id) on delete set null;
alter table public.email_sends add column if not exists sending_account_id uuid references public.connected_accounts(id) on delete set null;
alter table public.email_sends add column if not exists scheduled_at timestamptz;
alter table public.email_sends add column if not exists retry_count integer not null default 0;
alter table public.email_sends add column if not exists safety_result jsonb not null default '{}'::jsonb;
alter table public.email_sends add column if not exists queued_at timestamptz;
alter table public.email_sends add column if not exists last_attempt_at timestamptz;

alter table public.unsubscribes add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.unsubscribes add column if not exists domain text;

alter table public.connected_accounts add column if not exists token_type text;
alter table public.connected_accounts add column if not exists last_refresh_at timestamptz;
alter table public.connected_accounts add column if not exists last_error text;
alter table public.connected_accounts add column if not exists disconnected_at timestamptz;

update public.generated_emails ge
set workspace_id = c.workspace_id
from public.campaigns c
where ge.workspace_id is null and ge.campaign_id = c.id;

update public.email_sends es
set workspace_id = c.workspace_id
from public.campaigns c
where es.workspace_id is null and es.campaign_id = c.id;

update public.unsubscribes u
set workspace_id = c.workspace_id
from public.campaigns c
where u.workspace_id is null and u.campaign_id = c.id;

create index if not exists idx_campaigns_workspace_status on public.campaigns(workspace_id, status);
create index if not exists idx_leads_campaign_source_record on public.leads(campaign_id, source, source_record_id);
create index if not exists idx_generated_emails_workspace_status on public.generated_emails(workspace_id, status);
create index if not exists idx_email_sends_workspace_status on public.email_sends(workspace_id, status, scheduled_at);
create index if not exists idx_unsubscribes_workspace_domain on public.unsubscribes(workspace_id, domain);

drop policy if exists "own generated emails by workspace" on public.generated_emails;
create policy "own generated emails by workspace" on public.generated_emails
for all using (
  auth.uid() = user_id or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = generated_emails.workspace_id and wm.user_id = auth.uid()
  )
) with check (
  auth.uid() = user_id or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = generated_emails.workspace_id and wm.user_id = auth.uid()
  )
);

drop policy if exists "own email sends by workspace" on public.email_sends;
create policy "own email sends by workspace" on public.email_sends
for all using (
  auth.uid() = user_id or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = email_sends.workspace_id and wm.user_id = auth.uid()
  )
) with check (
  auth.uid() = user_id or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = email_sends.workspace_id and wm.user_id = auth.uid()
  )
);
