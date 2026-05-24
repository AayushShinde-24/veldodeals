import { LockKeyhole, ShieldCheck } from "lucide-react";
import { DataTable, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, PipelineMini, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";

export default async function SecurityPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const data = await getOperationalData(userId);
  return (
    <PageShell>
      <PageHeader eyebrow="Security" title="Safety gates built into the operating system" description="Veldo blocks unsafe sends, secret exposure, weak facts, and unapproved external actions." />
      <section className="grid cols-3">
        <MetricCard icon={ShieldCheck} label="Send gates" value="8/8" trend="Required before email send" tone="green" />
        <MetricCard icon={LockKeyhole} label="Secrets" value="Server-only" trend="No frontend key exposure" />
        <MetricCard icon={ShieldCheck} label="Low confidence" value="Review" trend="Human gate by default" tone="orange" />
      </section>
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Security policy" description="Rules encoded by agent workflow and route handlers." />
          <PipelineMini items={["No private browsing history or hidden social activity", "Service role access stays server-only", "All important outputs are persisted", "Low confidence requires review", "No send without all eight gates", "Secrets never enter logs"].map((label) => ({ label, status: <StatusPill status="completed" /> }))} />
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Access checklist" description="Security controls that shape the next backend work." />
          <PipelineMini items={["Authenticated dashboard access", "Server-only secrets", "API routes return clean errors", "Revocable API credentials", "Usage events for billing"].map((label, index) => ({ label, status: <StatusPill status={index < 2 ? "completed" : "queued"} /> }))} />
        </GlassCard>
      </section>
      <GlassCard>
        <SectionHeader title="Audit log" description="Sensitive workspace actions are recorded without exposing secrets." />
        <DataTable
          headers={["Action", "Created"]}
          rows={data.auditLogs.map((log) => [log.action, new Date(log.created_at).toLocaleString()])}
          empty={<EmptyState title="No audit logs yet" description="OAuth connections, profile changes, sends, CRM changes, and meetings will appear here." />}
        />
      </GlassCard>
    </PageShell>
  );
}
