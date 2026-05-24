import { ShieldCheck, UserPlus, Users } from "lucide-react";
import { DataTable, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";

export default async function TeamPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const data = await getOperationalData(userId);
  const owner = data.profile ? [{ id: data.profile.id, email: data.profile.email, role: data.profile.workspace_role ?? "owner" }] : [];
  return (
    <PageShell>
      <PageHeader eyebrow="Team" title="Human operators stay in control" description="Roles make review, approval, integrations, and billing explicit around agent work." />
      <section className="grid cols-3">
        <MetricCard icon={Users} label="Members" value={owner.length} trend="Workspace operators" />
        <MetricCard icon={ShieldCheck} label="Approval owner" value={owner[0]?.role ?? "Not set"} trend="Controls outbound gates" tone="green" />
        <MetricCard icon={UserPlus} label="Invites" value="Planned" trend="Invite workflow not connected" tone="orange" />
      </section>
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Members" description="Workspace membership is backed by workspace_members. Invite workflows can build on this table next." action={<Users size={18} color="var(--blue)" />} />
          <DataTable
            headers={["Member", "Role", "Status"]}
            rows={owner.map((member) => [member.email ?? "Current user", <StatusPill status={member.role} />, "Active"])}
            empty={<EmptyState title="No members found" description="Sign in to create a default workspace membership." />}
          />
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Invite workflow" description="Designed as a placeholder so the page feels complete without fake members." />
          <EmptyState icon={UserPlus} title="Invites are not connected yet" description="Future team work will add invited seats, roles, and approval permissions." />
        </GlassCard>
      </section>
    </PageShell>
  );
}
