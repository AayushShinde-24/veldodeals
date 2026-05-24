import { BarChart3, MailCheck, MessageSquareReply, TrendingUp } from "lucide-react";
import { Bars, DataTable, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { targetOutcomeRates } from "@/lib/revenue-os/pricing";

export default async function AnalyticsPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const data = await getOperationalData(userId);
  const sendCount = data.canonicalEmails.filter((email) => email.status === "sent").length || data.sends.length;
  const replyCount = data.canonicalReplies.length || data.replies.length;
  const meetingRate = sendCount ? Math.round((data.calendarEvents.length / sendCount) * 1000) / 10 : 0;
  const wonDeals = data.deals.filter((deal) => deal.stage === "won").length;
  const emailDealRate = sendCount ? Math.round((wonDeals / sendCount) * 1000) / 10 : 0;
  const bars = [sendCount, replyCount, data.leads.length, data.campaigns.length, data.tasks.length, data.learnings.length, data.deals.length, data.calendarEvents.length].map((value) => Math.max(12, value * 12));

  return (
    <PageShell>
      <PageHeader eyebrow="Analytics" title="See what your agents learn from performance" description="Analytics turns sends, replies, meetings, deals, and credits into next campaign decisions." />
      <section className="grid cols-4">
        <MetricCard icon={MailCheck} label="Sends" value={sendCount} trend="Mailbox and approved send events" />
        <MetricCard icon={MessageSquareReply} label="Replies" value={replyCount} trend="Synced and classified responses" tone="cyan" />
        <MetricCard icon={TrendingUp} label="Meeting rate" value={`${meetingRate}%`} trend={`Target ${targetOutcomeRates.meetingRatePct}%`} tone="green" />
        <MetricCard icon={BarChart3} label="Email deal rate" value={`${emailDealRate}%`} trend={`Target ${targetOutcomeRates.emailDealRatePct}%`} tone="violet" />
      </section>
      <section className="grid cols-2">
        <GlassCard><SectionHeader title="Operational trend" description="Live activity volume by record type." /><Bars values={bars} /></GlassCard>
        <GlassCard>
          <SectionHeader title="Recommended changes" description="Persisted learning-loop outputs." />
          <DataTable
            headers={["Campaign", "Summary", "Recommended change"]}
            rows={data.learnings.map((learning) => [learning.campaign_id, learning.summary, learning.recommended_change ?? ""])}
            empty={<EmptyState title="No recommendations yet" description="Analytics Learning Agent will save recommendations after campaigns have enough activity." />}
          />
        </GlassCard>
      </section>
    </PageShell>
  );
}
