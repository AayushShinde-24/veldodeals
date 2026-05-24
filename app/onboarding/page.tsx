import { Building2, Mail, Target } from "lucide-react";
import { Badge, GlassCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { getGoogleSetupState } from "@/src/lib/apis/google/oauth";
import { saveOnboardingAction } from "./actions";

export default async function OnboardingPage() {
  const context = await getWorkspaceContext();
  const google = getGoogleSetupState();

  return (
    <PageShell>
      <PageHeader
        eyebrow="Onboarding"
        title="Set up your AI sales workspace"
        description="Veldo needs a workspace, ICP, and connected mailbox before agents can safely operate."
      />
      <section className="grid split-sidebar">
        <GlassCard>
          <SectionHeader title="Workspace profile" description="This context is saved securely and used by Campaign Leader." />
          <form className="form" action={saveOnboardingAction} style={{ marginTop: 16 }}>
            <div className="field"><label htmlFor="workspace_name">Workspace name</label><input id="workspace_name" name="workspace_name" defaultValue={String(context?.workspace.name ?? "")} required /></div>
            <div className="field"><label htmlFor="website">Company website</label><input id="website" name="website" placeholder="https://company.com" /></div>
            <div className="field"><label htmlFor="industry">Industry</label><input id="industry" name="industry" placeholder="B2B SaaS, AI infrastructure, agencies" /></div>
            <div className="field"><label htmlFor="company_size">Company size</label><input id="company_size" name="company_size" placeholder="11-200 employees" /></div>
            <div className="field"><label htmlFor="icp_roles">Target roles</label><input id="icp_roles" name="icp_roles" placeholder="Founder, VP Sales, Head of Growth" /></div>
            <div className="field"><label htmlFor="icp_industries">Target industries</label><input id="icp_industries" name="icp_industries" placeholder="SaaS, fintech, devtools" /></div>
            <button className="btn primary" type="submit">Save workspace</button>
          </form>
        </GlassCard>
        <div className="stack">
          <GlassCard>
            <SectionHeader title="Mailbox connection" description="Required for sending and calendar booking." action={<Mail size={18} color="var(--cyan)" />} />
            <div className="premium-list-row"><span>Secure connection</span><Badge tone={google.hasClientId && google.hasClientSecret ? "green" : "orange"}>{google.hasClientId && google.hasClientSecret ? "ready" : "missing"}</Badge></div>
            <div className="premium-list-row"><span>Token encryption</span><Badge tone={google.hasTokenEncryption ? "green" : "orange"}>{google.hasTokenEncryption ? "ready" : "required"}</Badge></div>
            <a className="btn primary" href="/api/mailbox/connect" style={{ marginTop: 14 }}>Connect mailbox</a>
          </GlassCard>
          <GlassCard>
            <SectionHeader title="Safety gates" description="External actions stay confirmation-gated." action={<Target size={18} color="var(--violet)" />} />
            {["Approved drafts only", "Valid mailbox only", "Calendar confirmation required", "Audit logs recorded"].map((item) => (
              <div className="premium-list-row" key={item}><span>{item}</span><Building2 size={15} color="var(--muted)" /></div>
            ))}
          </GlassCard>
        </div>
      </section>
    </PageShell>
  );
}
