import { MailCheck, Send, ShieldCheck } from "lucide-react";
import { DataTable, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getIntegrationStatus, getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { getUsageSnapshot } from "@/src/lib/mvp/usage";

export default async function SendingAccountsPage({ searchParams }: { searchParams: UiSearchParams }) {
  const params = await searchParams;
  const userId = await resolveUserId(searchParams);
  const data = await getOperationalData(userId);
  const gmail = data.connectedAccounts.find((item) => item.provider === "gmail");
  const resend = getIntegrationStatus().find((item) => item.label === "Fallback sender");
  const usage = userId ? await getUsageSnapshot(userId) : null;
  const googleState = googleUiState(gmail?.status);
  const notice = params?.connected ? "Mailbox connected." : params?.disconnected ? "Mailbox disconnected." : params?.error ? String(params.error) : null;
  return (
    <PageShell>
      <PageHeader
        eyebrow="Sending accounts"
        title="Deliverability control before any email leaves"
        description="Your connected mailbox is the primary sender. Auto-send still requires explicit user choice, safety checks, allowlist, and daily limits."
        actions={<MailboxActions connected={gmail?.status === "connected"} />}
      />
      {notice ? <div className={params?.error ? "agent-error" : "status completed"}>{notice}</div> : null}
      <section className="grid cols-3">
        <MetricCard icon={Send} label="Mailbox state" value={googleState.label} trend={gmail?.email ?? "Connect mailbox"} tone={googleState.tone} />
        <MetricCard icon={MailCheck} label="Backup sender" value={resend?.configured ? "Ready" : "Blocked"} trend="Workspace controlled" tone={resend?.configured ? "green" : "orange"} />
        <MetricCard icon={ShieldCheck} label="Daily limit" value={usage ? `${usage.remainingToday}/${usage.dailyLimit}` : "Gated"} trend="Auto-send uses safe batches" tone="violet" />
      </section>
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Sender readiness" description="This view only shows whether sending prerequisites are ready." action={<Send size={18} color="var(--cyan)" />} />
          <div className="premium-list-row"><span>Mailbox account</span><StatusPill status={gmail?.status ?? "setup_required"} /></div>
          <div className="premium-list-row"><span>Mailbox address</span><strong>{gmail?.email ?? "Not connected"}</strong></div>
          <div className="premium-list-row"><span>Reconnect required</span><StatusPill status={["expired", "error"].includes(String(gmail?.status)) ? "blocked" : "completed"} /></div>
          <div className="premium-list-row"><span>Last refresh</span><strong>{gmail?.last_refresh_at ? new Date(String(gmail.last_refresh_at)).toLocaleString() : "Not refreshed yet"}</strong></div>
          <div className="premium-list-row"><span>Backup sender</span><StatusPill status={resend?.configured ? "active" : "blocked"} /></div>
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Connected senders" description="Your mailbox is used for outreach; fallback senders stay gated." />
          <DataTable
            headers={["Provider", "Email", "Status", "Actions"]}
            rows={data.connectedAccounts.filter((item) => ["gmail", "resend"].includes(String(item.provider))).map((account) => [displaySenderProvider(account.provider), account.email ?? "Server configured", <StatusPill status={account.status} />, account.provider === "gmail" ? <MailboxActions compact connected={account.status === "connected"} /> : ""])}
            empty={<EmptyState title="No mailbox connected" description="Connect a mailbox before sending outreach from Veldo." />}
          />
        </GlassCard>
      </section>
    </PageShell>
  );
}

function MailboxActions({ connected, compact = false }: { connected: boolean; compact?: boolean }) {
  return (
    <div className="inline-actions">
      <a className={connected ? "btn" : "btn primary"} href="/api/mailbox/connect">{connected ? "Reconnect mailbox" : "Connect mailbox"}</a>
      {connected ? (
        <form action="/api/mailbox/disconnect" method="post">
          <input type="hidden" name="provider" value="mailbox" />
          <button className={compact ? "btn danger" : "btn danger"} type="submit">Disconnect</button>
        </form>
      ) : null}
    </div>
  );
}

function displaySenderProvider(provider: unknown) {
  return String(provider) === "gmail" ? "Mailbox" : "Backup sender";
}

function googleUiState(status: unknown) {
  if (status === "connected") return { label: "Connected", tone: "green" as const };
  if (status === "expired" || status === "error") return { label: "Reconnect Required", tone: "orange" as const };
  if (status === "revoked") return { label: "Not Connected", tone: "red" as const };
  return { label: "Not Connected", tone: "orange" as const };
}
