import { MailX } from "lucide-react";
import { GlassCard, PageHeader, PageShell } from "@/components/premium";
import { unsubscribeAction } from "./actions";

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const email = Array.isArray(params.email) ? params.email[0] : params.email;
  const campaignId = Array.isArray(params.campaign_id) ? params.campaign_id[0] : params.campaign_id;

  return (
    <PageShell>
      <PageHeader eyebrow="Unsubscribe" title="Stop future outreach" description="Confirm below and Veldo will block future sends to this address for this sender." />
      <GlassCard style={{ maxWidth: 680 }}>
        <div className="toolbar"><MailX size={22} /><h2>Confirm unsubscribe</h2></div>
        <form className="form" action={unsubscribeAction} style={{ marginTop: 16 }}>
          <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required defaultValue={email ?? ""} /></div>
          <input type="hidden" name="campaign_id" value={campaignId ?? ""} />
          <div className="field"><label htmlFor="reason">Reason optional</label><textarea id="reason" name="reason" placeholder="Optional feedback" /></div>
          <button className="btn primary" type="submit">Unsubscribe</button>
        </form>
        <p className="muted" style={{ marginTop: 14 }}>Your request is stored immediately and future sends are blocked before delivery.</p>
      </GlassCard>
    </PageShell>
  );
}
