import { GlassCard, PageHeader, PageShell } from "@/components/premium";

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" />;
}

function LegalPage({ title }: { title: string }) {
  return (
    <PageShell>
      <PageHeader eyebrow="Legal" title={title} description="Needs legal review before public launch." />
      <GlassCard><p className="muted">Veldo stores account, workspace, campaign, lead, compliance, usage, and integration data to operate AI-assisted B2B outreach. Needs legal review before public launch.</p></GlassCard>
    </PageShell>
  );
}
