import { BarChart3, Building2, CreditCard, KeyRound, Mail, Plug, ShieldCheck, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { GlassCard, PageHeader, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/lib/auth/server";
import { getIntegrationStatus, getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { getRevenuePlan } from "@/lib/revenue-os/pricing";

export default async function SettingsPage({ searchParams }: { searchParams: UiSearchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const userId = await resolveUserId(searchParams);
  const data = await getOperationalData(userId);
  const plan = getRevenuePlan(data.profile?.plan);
  const integrations = getIntegrationStatus();
  const gmail = data.connectedAccounts.find((a) => a.provider === "gmail");
  const compliance = data.compliance;
  const apiKeyCount = data.profile ? 0 : 0; // Loaded via API — show link instead

  const cards = [
    {
      href: "/settings/compliance",
      icon: ShieldCheck,
      label: "Compliance",
      status: compliance?.compliance_confirmation ? "completed" : "needs_review",
      detail: compliance?.compliance_confirmation
        ? "Profile saved — required before sending."
        : "Complete before any emails can be sent.",
      color: "var(--ok)",
    },
    {
      href: "/sending-accounts",
      icon: Mail,
      label: "Sending accounts",
      status: gmail?.status === "connected" ? "connected" : "setup_required",
      detail: gmail?.email ?? "Connect a Gmail mailbox to enable sends.",
      color: "var(--brand)",
    },
    {
      href: "/settings/billing",
      icon: CreditCard,
      label: "Billing",
      status: "active",
      detail: `${plan.name} — ${(data.profile?.credits_balance ?? 0).toLocaleString()} credits remaining`,
      color: "var(--brand-2)",
    },
    {
      href: "/settings/api-keys",
      icon: KeyRound,
      label: "API Keys",
      status: "active",
      detail: "Manage developer access keys for the public API.",
      color: "var(--brand-3)",
    },
    {
      href: "/settings/integrations",
      icon: Plug,
      label: "Integrations",
      status: integrations.filter((i) => i.configured).length > 4 ? "active" : "needs_review",
      detail: `${integrations.filter((i) => i.configured).length} of ${integrations.length} keys configured`,
      color: "var(--accent)",
    },
    {
      href: "/workspace",
      icon: Building2,
      label: "Workspace",
      status: data.workspace ? "active" : "needs_review",
      detail: data.workspace?.name ?? "Configure your workspace settings.",
      color: "var(--muted)",
    },
    {
      href: "/team",
      icon: Users,
      label: "Team",
      status: "active",
      detail: "Manage team members and invites.",
      color: "var(--muted)",
    },
    {
      href: "/analytics",
      icon: BarChart3,
      label: "Analytics",
      status: "active",
      detail: "Performance metrics and agent learning loop.",
      color: "var(--muted)",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Manage compliance, integrations, billing, API keys, and team access."
      />

      <GlassCard>
        <SectionHeader title="Quick status" description="Click any card to configure that area." />
        <div className="grid cols-2 settings-status-grid">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <a key={card.href} href={card.href} className="settings-status-card">
                <span className="settings-status-icon" style={{ color: card.color }}>
                  <Icon size={18} />
                </span>
                <div className="settings-status-body">
                  <strong>{card.label}</strong>
                  <p>{card.detail}</p>
                </div>
                <StatusPill status={card.status} />
              </a>
            );
          })}
        </div>
      </GlassCard>
    </>
  );
}
