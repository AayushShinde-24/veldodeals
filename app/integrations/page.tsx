import { Plug } from "lucide-react";
import { Badge, DataTable, EmptyState, GlassCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { SettingsTabs } from "@/components/settings-tabs";
import { StatusPill } from "@/components/status-pill";
import { getIntegrationStatus, getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { getGoogleSetupState } from "@/src/lib/apis/google/oauth";
import { getLaunchReadiness } from "@/lib/revenue-os/readiness";

export default async function IntegrationsPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const data = await getOperationalData(userId);
  const integrations = getIntegrationStatus();
  const google = getGoogleSetupState();
  const readiness = getLaunchReadiness();
  return (
    <PageShell>
      <PageHeader
        eyebrow="Settings"
        title="Integrations"
        description="Each integration is server-routed, retry-aware, and safe from frontend secret exposure."
        actions={<a className="btn primary" href="/api/mailbox/connect">Connect mailbox</a>}
      />
      <SettingsTabs />
      <section className="grid cols-4">
        {integrations.map((integration) => (
          <GlassCard key={integration.label}>
            <div className="premium-section-head"><Badge tone={integration.configured ? "green" : "orange"}><Plug size={14} /></Badge><StatusPill status={integration.configured ? "active" : "blocked"} /></div>
            <h2>{integration.label}</h2>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>{integration.description}</p>
          </GlassCard>
        ))}
      </section>
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Mailbox readiness" description="Mailbox and calendar features need secure connection plus encrypted token storage." />
          <div className="premium-list-row"><span>Connection identity</span><StatusPill status={google.hasClientId ? "active" : "blocked"} /></div>
          <div className="premium-list-row"><span>Connection secret</span><StatusPill status={google.hasClientSecret ? "active" : "blocked"} /></div>
          <div className="premium-list-row"><span>Token encryption</span><StatusPill status={google.hasTokenEncryption ? "active" : "blocked"} /></div>
          <div className="premium-list-row"><span>Callback status</span><StatusPill status={google.redirectUri ? "active" : "blocked"} /></div>
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Connected accounts" description="Tokens are never rendered; only account status is shown." />
          <DataTable
            headers={["Provider", "Account", "Status", "Actions"]}
            rows={data.connectedAccounts.map((account) => [
              displayAccountProvider(account.provider),
              account.email ?? "Not available",
              <StatusPill status={account.status} />,
              ["gmail", "google_calendar"].includes(String(account.provider)) ? <form action="/api/mailbox/disconnect" method="post"><input type="hidden" name="provider" value="mailbox" /><button className="btn danger" type="submit">Disconnect</button></form> : "",
            ])}
            empty={<EmptyState title="No connected accounts" description="Connect a mailbox to enable sending, reply sync, and calendar booking." />}
          />
        </GlassCard>
      </section>
      <GlassCard>
        <SectionHeader title="Launch readiness" description="What is live, mocked, or blocked before production rollout." />
        <DataTable
          headers={["Area", "Status", "Owner", "Detail"]}
          rows={readiness.map((item) => [
            item.area,
            <StatusPill status={item.status === "ready" ? "active" : item.status === "mocked" ? "needs_review" : "blocked"} />,
            item.owner,
            item.detail,
          ])}
          empty={<EmptyState title="No readiness checks" description="Launch readiness checks will appear after configuration is loaded." />}
        />
      </GlassCard>
    </PageShell>
  );
}

function displayAccountProvider(provider: unknown) {
  const value = String(provider);
  if (value === "gmail") return "Mailbox";
  if (value === "google_calendar") return "Calendar";
  return "Connected account";
}
