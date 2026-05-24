import { DollarSign, Inbox, MailCheck, MessageSquareReply } from "lucide-react";
import { redirect } from "next/navigation";
import { DataTable, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/lib/auth/server";
import { getOperationalData } from "@/lib/ui/data";

export default async function InboxPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const data = await getOperationalData(user.id);
  const replies = data.canonicalReplies.length ? data.canonicalReplies : data.replies;
  const sent = data.emailSends.filter((send) => send.status === "sent").length || data.sends.length;
  const closedDeals = data.deals.filter((deal) => ["closed", "closed_won", "won"].includes(String(deal.stage).toLowerCase()));
  const dealValue = closedDeals.reduce((sum, deal) => sum + Number(deal.value ?? 0), 0);

  return (
    <PageShell>
      <PageHeader eyebrow="Replies" title="Reply inbox" description="Mailbox replies sync into Veldo, then Reply Triage classifies intent, stop conditions, and CRM handoffs." actions={<form action="/api/mailbox/sync" method="post"><button className="btn primary" type="submit">Sync mailbox</button></form>} />
      <section className="grid cols-4">
        <MetricCard icon={MailCheck} label="Emails sent" value={sent} trend="Approved sends" />
        <MetricCard icon={MessageSquareReply} label="Replies got" value={replies.length} trend="Synced and classified" tone="cyan" />
        <MetricCard icon={Inbox} label="Deals closed" value={closedDeals.length} trend="CRM closed won" tone="green" />
        <MetricCard icon={DollarSign} label="Value closed" value={`$${dealValue.toLocaleString()}`} trend="Sum of closed deals" tone="violet" />
      </section>
      <GlassCard>
        <SectionHeader title="Reply table" description="Open a lead row to inspect the reply and recommended action." />
        <DataTable
          headers={["Lead", "Class", "Sentiment", "Next action", "Reply"]}
          rows={replies.map((reply) => {
            const lead = data.leads.find((item) => item.id === reply.lead_id);
            return [
              <span className="lead-person"><span className="lead-avatar">{initials(getLeadName(lead))}</span><strong>{getLeadName(lead)}</strong></span>,
              <StatusPill status={reply.classification ?? reply.reply_class ?? "unknown"} />,
              reply.sentiment ?? "",
              reply.next_action ?? "Review reply",
              <details className="lead-detail"><summary>Open reply</summary><p>{reply.body ?? reply.raw_reply ?? "No body stored."}</p></details>,
            ];
          })}
          empty={<EmptyState title="No replies yet" description="Connect a mailbox and sync replies after sending approved outreach." />}
        />
      </GlassCard>
    </PageShell>
  );
}

function getLeadName(lead?: Record<string, unknown>) {
  if (!lead) return "Unlinked lead";
  return String(lead.full_name || `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || lead.email || "Unknown lead");
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "L";
}
