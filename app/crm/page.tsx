import { Handshake, TrendingUp } from "lucide-react";
import { DataTable, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";

const stages = ["interested", "meeting_booked", "demo_done", "proposal_sent", "negotiation", "won", "lost"];

export default async function CrmPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const data = await getOperationalData(userId);
  const dealReplies = data.replies.filter((reply) => reply.should_create_deal);
  const syncedDeals = data.crmSyncs.filter((sync) => sync.deal_id);
  const realDeals = data.deals;

  return (
    <PageShell>
      <PageHeader eyebrow="CRM" title="Autonomous deal follow-up from reply to close" description="Deal Closing Agent tracks meeting, demo, proposal, negotiation, won, and lost stages with auditable next actions." actions={<a className="btn primary" href="/inbox">Review replies</a>} />
      <section className="grid cols-4">
        <MetricCard icon={Handshake} label="Deal-ready replies" value={dealReplies.length} trend="should_create_deal=true" />
        <MetricCard icon={TrendingUp} label="Open deals" value={realDeals.filter((deal) => !["won", "lost"].includes(String(deal.stage))).length} trend="crm_deals records" tone="green" />
        <MetricCard icon={Handshake} label="Deal stages" value={stages.length} trend="Revenue OS pipeline" tone="violet" />
        <MetricCard icon={TrendingUp} label="Won records" value={realDeals.filter((deal) => deal.stage === "won").length} trend="Closed CRM deals" tone="cyan" />
      </section>
      <section className="grid split-sidebar compact">
        <GlassCard>
          <SectionHeader title="Pipeline board" description="Live opportunities come from crm_deals; reply handoffs stay available as source signals." />
          {realDeals.length || dealReplies.length || syncedDeals.length ? (
            <div className="premium-kanban">
              {stages.map((stage, index) => (
                <div className="premium-kanban-col" key={stage}>
                  <div className="premium-section-head"><h2>{stage.replaceAll("_", " ")}</h2><span className="muted">{realDeals.filter((deal) => normalizeStage(deal.stage) === normalizeStage(stage)).length}</span></div>
                  {realDeals.filter((deal) => normalizeStage(deal.stage) === normalizeStage(stage)).slice(0, 4).map((deal) => (
                    <div className="premium-deal" key={deal.id}><strong>{deal.title}</strong><p>${Number(deal.value ?? 0).toLocaleString()} - {deal.probability}% probability</p><StatusPill status={deal.stage} /></div>
                  ))}
                  {index === 0 && !realDeals.filter((deal) => normalizeStage(deal.stage) === normalizeStage(stage)).length
                    ? dealReplies.slice(0, 3).map((reply) => <div className="premium-deal" key={reply.id}><strong>{reply.lead_id ?? "Interested lead"}</strong><p>{reply.next_action ?? "Create a deal from this reply."}</p><StatusPill status="needs_review" /></div>)
                    : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No CRM deals yet" description="Interested replies and CRM sync events will populate this board once campaigns start receiving responses." />
          )}
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Deal activity" description="Latest CRM sync events." />
          <DataTable
            headers={["CRM", "Action", "Notes"]}
            rows={data.crmSyncs.slice(0, 6).map((sync) => [sync.crm, <StatusPill status={sync.action} />, sync.notes ?? ""])}
            empty={<EmptyState title="No sync activity" description="Connect a CRM integration and run qualified reply handoff to create activity." />}
          />
        </GlassCard>
      </section>
    </PageShell>
  );
}

function normalizeStage(stage: unknown) {
  const value = String(stage ?? "").toLowerCase().replace(/\s+/gu, "_");
  if (value === "new_lead" || value === "qualified") return "interested";
  if (value === "demo_booked") return "meeting_booked";
  if (value === "proposal") return "proposal_sent";
  return value;
}
