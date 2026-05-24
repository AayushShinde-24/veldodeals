import { GlassCard, PageHeader, PageShell } from "@/components/premium";

export default function TermsPage() {
  return (
    <PageShell>
      <PageHeader eyebrow="Legal" title="Terms of Service" description="Needs legal review before public launch." />
      <GlassCard><p className="muted">Use Veldo only for lawful, relevant B2B outreach with accurate sender identity and unsubscribe controls. Needs legal review before public launch.</p></GlassCard>
    </PageShell>
  );
}
