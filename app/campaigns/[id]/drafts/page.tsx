import { MailCheck } from "lucide-react";
import { DataTable, EmptyState, GlassCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getCampaignView, resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { approveDraftAction, queueCampaignAction, sendDraftAction, sendQueuedCampaignAction } from "./actions";

export default async function CampaignDraftsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: UiSearchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const userId = await resolveUserId(searchParams);
  const data = await getCampaignView(userId, id);
  const drafts = data?.generatedEmails?.length ? data.generatedEmails : (data?.drafts ?? []);
  const notice = query.error ? String(query.error) : query.queued ? "Safety queue prepared." : query.sent_queued ? "Queued send batch processed." : query.approved ? "Draft approved." : query.sent ? "Draft sent." : null;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Campaign drafts"
        title={data?.campaign?.name ?? "Draft review"}
        description="Drafts, safety status, queue state, and send outcomes are saved securely."
        actions={<div className="inline-actions"><a className="btn" href={`/campaigns/${id}`}>Overview</a><form action={queueCampaignAction}><input type="hidden" name="campaign_id" value={id} /><button className="btn" type="submit">Run safety queue</button></form><form action={sendQueuedCampaignAction}><input type="hidden" name="campaign_id" value={id} /><button className="btn primary" type="submit">Send queued</button></form></div>}
      />
      {notice ? <div className={query.error ? "agent-error" : "status completed"}>{notice}</div> : null}
      <GlassCard>
        <SectionHeader title="Review queue" description="Drafts, scores, and approval state." action={<MailCheck size={18} color="var(--cyan)" />} />
        <DataTable
          headers={["Lead", "Subject", "Status", "Safety", "Reason", "Actions"]}
          rows={drafts.map((draft) => [
            draft.lead_id,
            draft.subject ?? draft.subject_1,
            <StatusPill status={draft.status ?? draft.approval_status} />,
            <StatusPill status={draft.safety_status ?? "not_checked"} />,
            draft.personalization_reason ?? draft.cta ?? "",
            draft.subject ? <div className="inline-actions"><form action={approveDraftAction}><input type="hidden" name="campaign_id" value={id} /><input type="hidden" name="generated_email_id" value={draft.id} /><input type="hidden" name="subject" value={draft.edited_subject ?? draft.subject} /><input type="hidden" name="body" value={draft.edited_body ?? draft.body} /><button className="btn" type="submit">Approve</button></form><form action={sendDraftAction}><input type="hidden" name="campaign_id" value={id} /><input type="hidden" name="generated_email_id" value={draft.id} /><button className="btn primary" type="submit">Send</button></form></div> : "",
          ])}
          empty={<EmptyState title="No drafts yet" description="Email Writer will create drafts after personalization strategy passes safety checks." />}
        />
      </GlassCard>
      <GlassCard>
        <SectionHeader title="Send queue" description="Queued, sending, sent, failed, and blocked email_sends records." />
        <DataTable
          headers={["Draft", "Status", "Scheduled", "Sent", "Failure"]}
          rows={(data?.emailSends ?? []).map((send) => [
            send.generated_email_id,
            <StatusPill status={send.status} />,
            send.scheduled_at ? new Date(send.scheduled_at).toLocaleString() : "",
            send.sent_at ? new Date(send.sent_at).toLocaleString() : "",
            send.failure_reason ?? "",
          ])}
          empty={<EmptyState title="No queue records yet" description="Run safety queue after drafts are approved or auto-send is enabled." />}
        />
      </GlassCard>
    </PageShell>
  );
}
