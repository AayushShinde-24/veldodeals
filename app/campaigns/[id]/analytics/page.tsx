import { BarChart3, MailCheck, MessageSquareReply, TrendingUp } from "lucide-react";
import { Bars, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, SectionHeader, SettingsList } from "@/components/premium";
import { getCampaignView, resolveUserId, type UiSearchParams } from "@/lib/ui/data";

export default async function CampaignAnalyticsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: UiSearchParams }) {
  const { id } = await params;
  const userId = await resolveUserId(searchParams);
  const data = await getCampaignView(userId, id);
  const sends = data?.drafts.filter((draft) => draft.approval_status === "sent").length ?? 0;
  const replies = data?.logs.filter((log) => String(log.message).toLowerCase().includes("reply")).length ?? 0;
  const bars = [sends, replies, data?.leads.length ?? 0, data?.tasks.length ?? 0].concat([sends, replies, data?.drafts.length ?? 0, data?.logs.length ?? 0]).map((value) => Math.max(12, value * 18));

  return (
    <PageShell>
      <PageHeader eyebrow="Campaign analytics" title={data?.campaign?.name ?? "Campaign analytics"} description="Campaign outcomes and learning-loop recommendations from persisted records." actions={<a className="btn" href={`/campaigns/${id}`}>Overview</a>} />
      <section className="grid cols-4">
        <MetricCard icon={MailCheck} label="Drafts" value={data?.drafts.length ?? 0} trend="Generated emails" />
        <MetricCard icon={TrendingUp} label="Sent" value={sends} trend="Approved send events" tone="green" />
        <MetricCard icon={MessageSquareReply} label="Reply mentions" value={replies} trend="From agent logs" tone="cyan" />
        <MetricCard icon={BarChart3} label="Leads" value={data?.leads.length ?? 0} trend="Campaign scope" tone="violet" />
      </section>
      <section className="grid cols-2">
        <GlassCard><SectionHeader title="Activity trend" description="Live campaign records normalized for visual scanning." /><Bars values={bars} /></GlassCard>
        <GlassCard>
          <SectionHeader title="Learning summary" description="Saved analytics learning for this campaign." />
          {data?.learnings ? (
            <SettingsList items={[
              { label: "Summary", value: data.learnings.summary },
              { label: "Best segment", value: data.learnings.best_performing_segment ?? "Not recorded" },
              { label: "Weakness", value: data.learnings.weakness ?? "Not recorded" },
              { label: "Recommended change", value: data.learnings.recommended_change ?? "Not recorded" },
            ]} />
          ) : (
            <EmptyState title="No learning record yet" description="Analytics Learning Agent will persist recommendations after campaign activity exists." />
          )}
        </GlassCard>
      </section>
    </PageShell>
  );
}
