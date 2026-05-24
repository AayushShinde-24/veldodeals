import { ArrowLeft, Clock, UserCircle } from "lucide-react";
import { EmptyState, GlassCard, PageHeader, PageShell, SectionHeader, SettingsList } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getWorkspaceContext, resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { saveProfileAction } from "./actions";

export default async function ProfilePage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const { profile } = await getWorkspaceContext(userId);
  return (
    <PageShell>
      <PageHeader
        eyebrow="Profile"
        title="Operator profile"
        description="Profile context can guide tone and workspace preferences without overriding safety gates."
        actions={<a className="btn" href="/dashboard"><ArrowLeft size={16} /> Dashboard</a>}
      />
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Account" description="Identity used for workspace ownership and approval logs." action={<UserCircle size={18} color="var(--blue)" />} />
          <SettingsList items={[
            { label: "Name", value: profile?.full_name ?? "Not set" },
            { label: "Email", value: profile?.email ?? "Not signed in" },
            { label: "Company", value: profile?.company_name ?? "Not set" },
            { label: "Default approval mode", value: <StatusPill status="needs_review" /> },
          ]} />
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Preferences" description="Saved profile fields used by workspace setup." />
          <form className="form" action={saveProfileAction} style={{ marginTop: 14 }}>
            <div className="field"><label htmlFor="name">Display name</label><input id="name" name="name" defaultValue={profile?.full_name ?? ""} /></div>
            <div className="field"><label htmlFor="company">Company</label><input id="company" name="company" defaultValue={profile?.company_name ?? ""} /></div>
            <div className="field"><label htmlFor="role">Role</label><input id="role" name="role" placeholder="Founder, RevOps, Growth lead" /></div>
            <div className="field"><label htmlFor="timezone">Timezone</label><input id="timezone" name="timezone" placeholder="Asia/Calcutta" /></div>
            <div className="field"><label htmlFor="email_signature">Email signature</label><textarea id="email_signature" name="email_signature" placeholder="Best,&#10;Your name" /></div>
            <button className="btn primary" type="submit">Save profile</button>
          </form>
        </GlassCard>
      </section>
      <GlassCard>
        <SectionHeader title="Recent profile activity" description="A quiet placeholder until audit events are connected to this view." />
        <EmptyState icon={Clock} title="No profile activity yet" description="Profile edits, login security changes, and API key events will appear here as audit logs are expanded." />
      </GlassCard>
    </PageShell>
  );
}
