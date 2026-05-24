import { PhoneCall, ShieldCheck } from "lucide-react";
import { DataTable, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, SectionHeader, SettingsList } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { getLaunchReadiness } from "@/lib/revenue-os/readiness";

export default async function CallsPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const data = await getOperationalData(userId);
  const readiness = getLaunchReadiness().filter((item) => ["AI voice calls", "DNC checks"].includes(item.area));
  const queued = data.callTasks.filter((task) => ["queued", "prepared"].includes(String(task.status))).length;
  const review = data.callTasks.filter((task) => String(task.status).includes("review") || String(task.status).includes("blocked")).length;

  return (
    <PageShell>
      <PageHeader eyebrow="AI voice calls" title="Compliant autonomous calling control room" description="Calls stay review-only until consent, DNC, call-time, disclosure, opt-out, recording, provider, and credit gates pass." />
      <section className="grid cols-3">
        <MetricCard icon={PhoneCall} label="Call tasks" value={data.callTasks.length} trend="Prepared or reviewed tasks" />
        <MetricCard icon={PhoneCall} label="Queued" value={queued} trend="Ready after compliance gates" tone="green" />
        <MetricCard icon={ShieldCheck} label="Needs review" value={review} trend="Compliance or provider blocker" tone="orange" />
      </section>
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Provider readiness" description="Mock mode prepares tasks without dialing anyone." />
          <SettingsList items={readiness.map((item) => ({ label: item.area, value: <StatusPill status={item.status === "ready" ? "active" : item.status === "mocked" ? "needs_review" : "blocked"} /> }))} />
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Launch call gates" description="No autonomous call starts until every gate is satisfied." />
          <SettingsList items={[
            { label: "Consent basis", value: "Required" },
            { label: "DNC check", value: "Required" },
            { label: "AI disclosure", value: "Required" },
            { label: "Opt-out handling", value: "Required" },
            { label: "Recording consent", value: "Required if recording" },
          ]} />
        </GlassCard>
      </section>
      <GlassCard>
        <SectionHeader title="Call task queue" description="Newest compliance-gated call tasks." />
        <DataTable
          headers={["Lead", "Status", "Consent", "Outcome", "Created"]}
          rows={data.callTasks.map((task) => [task.lead_id, <StatusPill status={task.status} />, task.consent_basis, task.outcome ?? "Not called", new Date(task.created_at).toLocaleString()])}
          empty={<EmptyState title="No call tasks" description="Prepare a call from a lead or campaign once the recipient and compliance basis are known." />}
        />
      </GlassCard>
    </PageShell>
  );
}
