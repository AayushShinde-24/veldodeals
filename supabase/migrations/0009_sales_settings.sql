-- Sales pillar settings + autonomy, persisted on the workspace.
-- autonomy_mode was previously written by onboarding with a non-fatal fallback;
-- this makes the column real. sales_settings holds the guardrail JSON:
-- { dailyEmails, dailyCalls, sendStart, sendEnd, timezone, tone, monthlyBudget,
--   approvals: { emails, calls, meetings } }
alter table workspaces add column if not exists autonomy_mode text not null default 'auto';
alter table workspaces add column if not exists sales_settings jsonb not null default '{}'::jsonb;
