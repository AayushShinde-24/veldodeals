import { GlassCard, PageHeader, PageShell } from "@/components/premium";

export default function AcceptableUsePage() {
  return (
    <PageShell>
      <PageHeader eyebrow="Legal" title="Acceptable Use" description="Needs legal review before public launch." />
      <GlassCard><p className="muted">Do not use Veldo for spam, deceptive claims, illegal data collection, private scraped data, harassment, or outreach without a lawful basis. Needs legal review before public launch.</p></GlassCard>
    </PageShell>
  );
}
