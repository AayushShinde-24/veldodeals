import { Bot, Calendar, CheckCircle2, MailCheck, ShieldAlert, Sparkles } from "lucide-react";
import { EmptyState, ErrorState, Bars, DataTable, GlassCard, MetricCard, PageHeader, PageShell, PipelineMini, ProgressLine, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/lib/auth/server";
import { getDashboardData, getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { redirect } from "next/navigation";

export default async function DashboardPage({ searchParams }: { searchParams: UiSearchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const userId = user.id;
  const data = await getDashboardData(userId);
  const ops = userId ? await getOperationalData(userId) : null;
  const blockers = data.tasks.filter((task) => ["failed", "blocked", "needs_review"].includes(task.status));
  const readyLeads = data.leads.filter((lead) => ["personalized", "verified", "approved"].includes(lead.stage)).length;
  const generatedEmails = ops?.generatedEmails ?? [];
  const emailSends = ops?.emailSends ?? [];
  const unsubscribes = ops?.unsubscribes ?? [];
  const errorLogs = ops?.errorLogs ?? [];
  const mvpUsage = ops?.mvpUsage ?? [];
  const sentCount = emailSends.filter((send) => send.status === "sent").length || data.sends.length;
  const failedCount = emailSends.filter((send) => send.status === "failed").length;
  const blockedCount = emailSends.filter((send) => String(send.status).startsWith("blocked")).length;
  const bars = buildBars([data.campaigns.length, data.leads.length, generatedEmails.length, sentCount, failedCount, blockedCount, unsubscribes.length, mvpUsage.length]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Dashboard"
        title="Outbound operating room"
        description="Campaigns, leads, approvals, sends, replies, and learning loops stay visible from one connected workspace."
        actions={<a className="btn primary" href="/campaigns/new"><Sparkles size={16} /> New campaign</a>}
      />
      {data.error ? <ErrorState message={data.error} /> : null}

      <section className="premium-hero-panel">
        <div>
          <span className="premium-eyebrow">Campaign Leader</span>
          <h2>Build pipeline, hold unsafe work, and keep every send gated.</h2>
          <p>Veldo is ready for campaign setup. Live agent execution stays paused until safety gates and approvals are complete.</p>
        </div>
        <div className="premium-hero-actions">
          <a className="btn primary" href="/campaigns/new">Create campaign</a>
          <a className="btn" href="/leads/import">Import leads</a>
        </div>
      </section>

      <section className="grid cols-4">
        <MetricCard icon={Bot} label="Total campaigns" value={data.campaigns.length} trend="Live workspace records" />
        <MetricCard icon={CheckCircle2} label="Active campaigns" value={data.campaigns.filter((campaign) => ["fetching_leads", "leads_ready", "generating_emails", "ready_to_send", "sending", "running"].includes(campaign.status)).length} trend="In progress or ready" tone="green" />
        <MetricCard icon={MailCheck} label="Emails sent" value={sentCount} trend="email_sends sent" tone="cyan" />
        <MetricCard icon={Calendar} label="Meetings" value={data.meetings.length} trend="Calendar bookings" tone="violet" />
      </section>
      <section className="grid cols-4">
        <MetricCard icon={CheckCircle2} label="Leads fetched" value={data.leads.length} trend="Verified lead records" />
        <MetricCard icon={MailCheck} label="Emails generated" value={generatedEmails.length} trend="generated_emails" tone="cyan" />
        <MetricCard icon={ShieldAlert} label="Failed sends" value={failedCount} trend="Provider or validation failures" tone="red" />
        <MetricCard icon={ShieldAlert} label="Blocked sends" value={blockedCount} trend="Compliance, unsubscribe, limits" tone="orange" />
      </section>
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Workspace health" description="Live records across billing, CRM, and calendar." />
          <div className="premium-list-row"><span>Credits</span><strong>{(data.user?.credits_balance ?? 0).toLocaleString()}</strong></div>
          <div className="premium-list-row"><span>Unsubscribes</span><strong>{unsubscribes.length}</strong></div>
          <div className="premium-list-row"><span>Usage rows this month</span><strong>{mvpUsage.length}</strong></div>
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Next setup step" description="Keep the product operational before scaling sends." />
          <EmptyState title={data.meetings.length || data.sends.length ? "Workflow is active" : "Connect a mailbox and import leads"} description={data.meetings.length || data.sends.length ? "Veldo has live activity to analyze." : "Connect a mailbox, create a campaign, and import leads to start the production loop."} action={<a className="btn" href="/integrations">Open integrations</a>} />
        </GlassCard>
      </section>

      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Campaign Leader status" description="Live routing and pause decisions." />
          {data.campaigns.length ? (
            <PipelineMini
              items={data.campaigns.slice(0, 6).map((campaign) => ({
                label: campaign.name,
                status: <StatusPill status={campaign.status} />,
              }))}
            />
          ) : (
            <EmptyState title="No campaigns yet" description="Create your first campaign so Campaign Leader can plan tasks, checks, and review gates." action={<a className="btn primary" href="/campaigns/new">Create campaign</a>} />
          )}
        </GlassCard>

        <GlassCard>
          <SectionHeader title="Revenue learning loop" description="Sends, replies, drafts, and agent activity become future decisions." />
          <Bars values={bars} />
        </GlassCard>
      </section>

      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Blockers needing review" description="Failed, blocked, and low-confidence work pauses here." action={<ShieldAlert size={18} color="var(--warning)" />} />
          {blockers.length ? (
            <div className="premium-list">
              {blockers.slice(0, 8).map((task) => (
                <div className="premium-list-row" key={task.id}>
                  <span>{task.agent_name}</span>
                  <strong>{task.error_message ?? task.task_type}</strong>
                  <StatusPill status={task.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No blockers" description="No failed, blocked, or review tasks are waiting right now." />
          )}
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Sending gate health" description="The MVP blocks every send until all safety checks pass." />
          {[
            ["Lead email and company", data.leads.length ? 100 : 0],
            ["Research coverage", coverage(data.leads, ["researched", "signals_found", "scored", "personalized", "drafted", "verified", "sent"])],
            ["Email draft coverage", data.drafts.length ? Math.round((data.drafts.length / Math.max(1, data.leads.length)) * 100) : 0],
            ["Human approvals", data.drafts.length ? Math.round((data.drafts.filter((draft) => draft.approval_status === "approved").length / data.drafts.length) * 100) : 0],
          ].map(([label, value]) => (
            <div className="log-line" key={label}>
              <div className="premium-list-row" style={{ minHeight: 0 }}><span>{label}</span><strong>{value}%</strong></div>
              <ProgressLine value={Number(value)} />
            </div>
          ))}
        </GlassCard>
      </section>

      <GlassCard>
        <SectionHeader title="Human review queue" description="Generated emails wait here until user approval unlocks sending." action={<StatusPill status="needs_review" />} />
        <DataTable
          headers={["Lead", "Subject", "Status", "Reason"]}
          rows={generatedEmails.slice(0, 10).map((draft) => [draft.lead_id, draft.subject, <StatusPill status={draft.status} />, draft.personalization_reason ?? ""])}
          empty={<EmptyState title="No drafts awaiting review" description="Approved-send drafts will appear after personalization and email-writing agents run." />}
        />
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Recent errors" description="Lead search, enrichment, drafting, sending, storage, and compliance failures." />
        <DataTable
          headers={["Source", "Code", "Message"]}
          rows={errorLogs.slice(0, 10).map((error) => [error.source, error.error_code ?? "", error.error_message])}
          empty={<EmptyState title="No recent errors" description="Campaign and send failures will be logged here with safe details." />}
        />
      </GlassCard>
    </PageShell>
  );
}

function coverage(rows: Array<{ stage: string }>, stages: string[]) {
  if (!rows.length) return 0;
  return Math.round((rows.filter((row) => stages.includes(row.stage)).length / rows.length) * 100);
}

function buildBars(values: number[]) {
  const max = Math.max(1, ...values);
  return values.concat(values).map((value) => Math.max(18, Math.round((value / max) * 92)));
}
