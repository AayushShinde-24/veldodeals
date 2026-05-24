import { Pause, Play, Plus, Target } from "lucide-react";
import { DataTable, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getListData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";

export default async function CampaignsPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const campaigns = await getListData(userId, "campaigns");
  const running = campaigns.filter((campaign) => campaign.status === "running").length;
  const review = campaigns.filter((campaign) => campaign.status === "needs_review").length;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Campaigns"
        title="Leader-managed outreach systems"
        description="Each campaign carries its ICP, offer, leader decision, approval state, task queue, and learning loop."
        actions={<><a className="btn primary" href="/campaigns/new"><Plus size={16} /> New campaign</a><a className="btn" href="/agents/tasks"><Play size={16} /> Queue</a><a className="btn" href="/agents/logs"><Pause size={16} /> Logs</a></>}
      />
      <section className="grid cols-3">
        <MetricCard icon={Target} label="Total campaigns" value={campaigns.length} trend="Live workspace records" />
        <MetricCard icon={Play} label="Running" value={running} trend="Autopilot or active workflows" tone="green" />
        <MetricCard icon={Pause} label="Needs review" value={review} trend="Human gate required" tone="orange" />
      </section>
      <GlassCard>
        <SectionHeader title="Campaign table" description="Operational list for scanning every leader decision." />
        <DataTable
          headers={["Name", "Goal", "Leader decision", "Status"]}
          rows={campaigns.map((campaign) => [
            <a className="premium-arrow-link" href={`/campaigns/${campaign.id}`}>{campaign.name}</a>,
            campaign.goal,
            campaign.leader_decision_json?.next_agent ?? "not planned",
            <StatusPill status={campaign.status} />,
          ])}
          empty={<EmptyState icon={Target} title="No campaigns yet" description="Create a campaign to start building a coordinated AI sales-team workflow." action={<a className="btn primary" href="/campaigns/new">Create campaign</a>} />}
        />
      </GlassCard>
    </PageShell>
  );
}
