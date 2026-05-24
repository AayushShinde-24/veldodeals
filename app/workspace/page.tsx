import { Building2, ShieldCheck, Users } from "lucide-react";
import { EmptyState, GlassCard, MetricCard, PageHeader, PageShell, SectionHeader, SettingsList } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { saveWorkspaceAction } from "./actions";

export default async function WorkspacePage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const data = await getOperationalData(userId);
  const profile = data.profile;
  const workspace = data.workspace;
  return (
    <PageShell>
      <PageHeader eyebrow="Workspace" title="Team workspace and permissions" description="Configure the operating layer around Veldo agents without exposing secrets or bypassing gates." />
      <section className="grid cols-3">
        <MetricCard icon={Building2} label="Workspace" value={workspace?.name ?? profile?.workspace_name ?? "Not set"} trend="Primary operating context" />
        <MetricCard icon={Users} label="Role" value={profile?.workspace_role ?? "owner"} trend="Review and setup access" tone="violet" />
        <MetricCard icon={ShieldCheck} label="Approval mode" value="Required" trend="No send bypass" tone="green" />
      </section>
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Workspace identity" description="Core account state used throughout Veldo." />
          <SettingsList items={[{ label: "Workspace", value: workspace?.name ?? profile?.workspace_name ?? "Not set" }, { label: "Plan", value: <StatusPill status={profile?.plan ?? "starter"} /> }, { label: "Credits", value: (profile?.credits_balance ?? 0).toLocaleString() }, { label: "Owner email", value: profile?.email ?? "Not available" }]} />
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Operating policy" description="Human control remains visible in the workspace." />
          <SettingsList items={["Owner approval required before sends", "Sales reps can review drafts", "Admins manage integrations", "Audit log visible to operators"].map((label) => ({ label, value: <StatusPill status="completed" /> }))} />
        </GlassCard>
      </section>
      <GlassCard>
        <SectionHeader title="Edit workspace" description="These fields prepare Campaign Leader context for future backend steps." action={<Users size={18} color="var(--blue)" />} />
        <form className="form" action={saveWorkspaceAction} style={{ marginTop: 14 }}>
          <div className="grid cols-2">
            <div className="field"><label htmlFor="name">Workspace name</label><input id="name" name="name" defaultValue={String(workspace?.name ?? profile?.workspace_name ?? "")} required /></div>
            <div className="field"><label htmlFor="website">Website</label><input id="website" name="website" defaultValue={String(workspace?.website ?? "")} placeholder="https://company.com" /></div>
            <div className="field"><label htmlFor="industry">Industry</label><input id="industry" name="industry" defaultValue={String(workspace?.industry ?? "")} /></div>
            <div className="field"><label htmlFor="company_size">Company size</label><input id="company_size" name="company_size" defaultValue={String(workspace?.company_size ?? "")} /></div>
            <div className="field"><label htmlFor="roles">ICP roles</label><input id="roles" name="roles" placeholder="Founder, VP Sales, Head of Growth" /></div>
            <div className="field"><label htmlFor="industries">ICP industries</label><input id="industries" name="industries" placeholder="SaaS, fintech, devtools" /></div>
          </div>
          <button className="btn primary" type="submit">Save workspace</button>
        </form>
      </GlassCard>
      <GlassCard>
        <SectionHeader title="Workspace activity" description="A clear placeholder until audit activity is expanded here." />
        <EmptyState title="No workspace activity yet" description="Member changes, billing updates, integration events, and API key events will appear here later." />
      </GlassCard>
    </PageShell>
  );
}
