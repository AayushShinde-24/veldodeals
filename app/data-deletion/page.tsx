import { GlassCard, PageHeader, PageShell } from "@/components/premium";

export default function DataDeletionPage() {
  return (
    <PageShell>
      <PageHeader eyebrow="Legal" title="Data Deletion" description="Needs legal review before public launch." />
      <GlassCard><p className="muted">Users may request deletion of workspace, campaign, lead, integration, and usage data. Needs legal review before public launch.</p></GlassCard>
    </PageShell>
  );
}
