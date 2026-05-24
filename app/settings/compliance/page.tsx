import { ShieldCheck } from "lucide-react";
import { GlassCard, PageHeader, PageShell, SectionHeader, SettingsList } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/lib/auth/server";
import { getUserCompliance } from "@/src/lib/mvp/compliance";
import { saveComplianceAction } from "./actions";

export default async function ComplianceSettingsPage() {
  const user = await getCurrentUser();
  const compliance = user ? await getUserCompliance(user.id) : null;
  const ready = Boolean(compliance?.compliance_confirmation && compliance.compliance_confirmed_at);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Compliance"
        title="Outbound compliance setup"
        description="Complete this before Veldo can send any outreach. Missing fields block mailbox sending."
        actions={<StatusPill status={ready ? "completed" : "blocked"} />}
      />
      <section className="grid split-sidebar">
        <GlassCard>
          <SectionHeader title="Business identity" description="Used in every unsubscribe footer and send gate." action={<ShieldCheck size={18} color="var(--success)" />} />
          <form className="form" action={saveComplianceAction} style={{ marginTop: 16 }}>
            <div className="field"><label htmlFor="company_name">Company name</label><input id="company_name" name="company_name" required defaultValue={compliance?.company_name ?? ""} /></div>
            <div className="field"><label htmlFor="business_website">Business website</label><input id="business_website" name="business_website" required defaultValue={compliance?.business_website ?? ""} placeholder="https://company.com" /></div>
            <div className="field"><label htmlFor="business_email">Business email</label><input id="business_email" name="business_email" type="email" required defaultValue={compliance?.business_email ?? user?.email ?? ""} /></div>
            <div className="field"><label htmlFor="physical_mailing_address">Physical mailing address</label><textarea id="physical_mailing_address" name="physical_mailing_address" required defaultValue={compliance?.physical_mailing_address ?? ""} placeholder="Business mailing address is required." /></div>
            <div className="field"><label htmlFor="outreach_purpose">Outreach purpose</label><textarea id="outreach_purpose" name="outreach_purpose" required defaultValue={compliance?.outreach_purpose ?? ""} placeholder="Outreach purpose is required." /></div>
            <div className="field"><label htmlFor="target_audience">Target audience</label><textarea id="target_audience" name="target_audience" required defaultValue={compliance?.target_audience ?? ""} /></div>
            <label className="check-row"><input name="compliance_confirmation" type="checkbox" defaultChecked={compliance?.compliance_confirmation ?? false} required /> I confirm Veldo outreach will be relevant, lawful, and include unsubscribe controls.</label>
            <button className="btn primary" type="submit">Save compliance setup</button>
          </form>
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Send blockers" description="These messages are shown when setup is incomplete." />
          <SettingsList items={[
            { label: "Compliance setup", value: ready ? <StatusPill status="completed" /> : <StatusPill status="blocked" /> },
            { label: "Mailing address", value: compliance?.physical_mailing_address ? "Provided" : "Business mailing address is required." },
            { label: "Outreach purpose", value: compliance?.outreach_purpose ? "Provided" : "Outreach purpose is required." },
            { label: "Send gate", value: ready ? "Ready" : "Complete compliance setup before sending." },
          ]} />
        </GlassCard>
      </section>
    </PageShell>
  );
}
