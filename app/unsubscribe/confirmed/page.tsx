import { CheckCircle2 } from "lucide-react";
import { GlassCard, PageHeader, PageShell } from "@/components/premium";

export default async function UnsubscribeConfirmedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const email = Array.isArray(params.email) ? params.email[0] : params.email;
  return (
    <PageShell>
      <PageHeader eyebrow="Unsubscribed" title="You have been unsubscribed" description="Veldo will block future sends to this email for this sender." />
      <GlassCard style={{ maxWidth: 640 }}>
        <div className="toolbar"><CheckCircle2 size={22} color="var(--success)" /><h2>Confirmed</h2></div>
        <p className="muted" style={{ marginTop: 12 }}>{email ?? "This email"} has been added to the unsubscribe list.</p>
      </GlassCard>
    </PageShell>
  );
}
