import { HandCoins, Megaphone, ShieldCheck } from "lucide-react";
import { DataTable, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, SectionHeader, SettingsList } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { getLaunchReadiness } from "@/lib/revenue-os/readiness";

export default async function FundraisingPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const data = await getOperationalData(userId);
  const readiness = getLaunchReadiness().filter((item) => ["Investor sourcing", "Fundraising compliance"].includes(item.area));
  const matched = data.investorProfiles.filter((investor) => Number(investor.match_score ?? 0) >= 60).length;
  const legalReview = data.fundraisingTasks.filter((task) => String(task.status).includes("review") || task.needs_legal_review === true).length;

  return (
    <PageShell>
      <PageHeader eyebrow="Fundraising" title="Investor pipeline and fundraising agent" description="Find matched investors, draft outreach, prepare meetings, and keep fundraising claims legally reviewed." />
      <section className="grid cols-3">
        <MetricCard icon={HandCoins} label="Investors" value={data.investorProfiles.length} trend={`${matched} matched above threshold`} />
        <MetricCard icon={Megaphone} label="Outreach tasks" value={data.fundraisingTasks.length} trend="Drafted or review-gated" tone="violet" />
        <MetricCard icon={ShieldCheck} label="Legal review" value={legalReview} trend="Unsafe claims stay blocked" tone="orange" />
      </section>
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Readiness" description="Provider and compliance state for fundraising workflows." />
          <SettingsList items={readiness.map((item) => ({ label: item.area, value: <StatusPill status={item.status === "ready" ? "active" : item.status === "mocked" ? "needs_review" : "blocked"} /> }))} />
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Fundraising guardrails" description="The agent can assist pipeline work but cannot invent traction or guarantee funding." />
          <SettingsList items={[
            { label: "No guaranteed funding claims", value: <StatusPill status="completed" /> },
            { label: "No fabricated traction", value: <StatusPill status="completed" /> },
            { label: "Approved securities language", value: <StatusPill status="needs_review" /> },
            { label: "Investor source provenance", value: <StatusPill status="completed" /> },
          ]} />
        </GlassCard>
      </section>
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Investor profiles" description="Matched investors from public or authorized sources." />
          <DataTable
            headers={["Investor", "Firm", "Score", "Status"]}
            rows={data.investorProfiles.map((investor) => [investor.name, investor.firm ?? "", investor.match_score, <StatusPill status={investor.status} />])}
            empty={<EmptyState title="No investors yet" description="Run investor search from a fundraising campaign to populate this pipeline." />}
          />
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Fundraising tasks" description="Drafts, calls, meeting prep, and follow-up work." />
          <DataTable
            headers={["Channel", "Status", "Pitch", "Created"]}
            rows={data.fundraisingTasks.map((task) => [task.outreach_channel, <StatusPill status={task.status} />, task.pitch_angle ?? "", new Date(task.created_at).toLocaleString()])}
            empty={<EmptyState title="No fundraising tasks" description="Draft investor outreach after investor matching and legal language review." />}
          />
        </GlassCard>
      </section>
    </PageShell>
  );
}
