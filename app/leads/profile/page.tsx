import { Building2, Linkedin, Mail } from "lucide-react";
import { EmptyState, GlassCard, MetricCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";

export default function LeadProfilePage() {
  return (
    <PageShell>
      <PageHeader eyebrow="Lead profile" title="Lead intelligence profile" description="Enrichment, company research, public signals, ICP score, and personalization risk belong here once a real lead is selected." />
      <section className="grid cols-3">
        <MetricCard icon={Mail} label="Email verification" value="Pending" trend="Valid status required before send" tone="orange" />
        <MetricCard icon={Building2} label="Research confidence" value="0" trend="Company research not loaded" />
        <MetricCard icon={Linkedin} label="Public signal" value="Review" trend="Never infer from private activity" tone="violet" />
      </section>
      <section className="grid cols-2">
        <GlassCard><SectionHeader title="Enrichment" description="Select a persisted lead to load enrichment fields." /><EmptyState title="No lead selected" description="Lead profile needs a real lead id route before showing person/company data." /></GlassCard>
        <GlassCard><SectionHeader title="Personalization strategy" description="Risk-aware strategy generated from allowed sources only." /><StatusPill status="needs_review" /><p className="muted" style={{ marginTop: 14 }}>Weak or missing signals remain review-only until a real strategy is persisted.</p></GlassCard>
      </section>
    </PageShell>
  );
}
