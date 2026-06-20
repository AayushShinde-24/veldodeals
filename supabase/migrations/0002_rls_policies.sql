-- Veldo Row-Level Security — Phase 0 item 5
-- The app talks to Supabase with the service role key, which BYPASSES RLS.
-- These policies are defense-in-depth: if an anon/authenticated client ever
-- queries directly, it can only see/modify its own rows.

-- 1) Tables scoped by a `user_id = auth.uid()` column.
do $$
declare
  t text;
  user_id_tables text[] := array[
    'leads','campaigns','company_research','icp_scores','signals','email_strategies',
    'email_scores','email_verifications','generated_emails','email_drafts','personalized_emails',
    'emails','email_sends','email_queue','email_replies','reply_events','replies','meetings',
    'calendar_events','crm_deals','deals','crm_syncs','agent_tasks','agent_decisions','agent_logs',
    'send_gates','workflow_plans','campaign_learnings','call_tasks','investor_profiles',
    'fundraising_tasks','credit_transactions','credit_ledger','credits_ledger','usage_events',
    'mvp_usage','analytics_events','google_tokens','connected_accounts','compliance_settings',
    'unsubscribes','error_logs','audit_logs','api_keys','veldo_api_keys','veldo_agent_threads',
    'veldo_agent_messages','workspace_members'
  ];
begin
  foreach t in array user_id_tables loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I on %I;', t || '_owner', t);
    execute format(
      'create policy %I on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t || '_owner', t
    );
  end loop;
end $$;

-- 2) profiles & users are keyed by `id`.
alter table profiles enable row level security;
drop policy if exists profiles_owner on profiles;
create policy profiles_owner on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

alter table users enable row level security;
drop policy if exists users_owner on users;
create policy users_owner on users for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- 3) workspaces keyed by owner_id.
alter table workspaces enable row level security;
drop policy if exists workspaces_owner on workspaces;
create policy workspaces_owner on workspaces for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 4) workspace_invites: visible to the inviter.
alter table workspace_invites enable row level security;
drop policy if exists workspace_invites_owner on workspace_invites;
create policy workspace_invites_owner on workspace_invites for all to authenticated
  using (invited_by = auth.uid()) with check (invited_by = auth.uid());

-- 5) veldo_api_key_usage_events has no user column — service-role only
--    (RLS enabled with no policy = deny all for non-service clients).
alter table veldo_api_key_usage_events enable row level security;
