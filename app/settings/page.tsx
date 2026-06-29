import { Activity, Coins, DollarSign, Gauge } from "lucide-react";
import { DataTable, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { SettingsTabs } from "@/components/settings-tabs";
import { getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";

type UsageRow = Record<string, unknown>;

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function str(value: unknown, fallback = "—"): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export default async function SettingsUsagePage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const data = await getOperationalData(userId);
  const usage = (data.usage ?? []) as UsageRow[];

  const creditsUsed = usage.reduce((sum, row) => sum + Math.abs(num(row.credits ?? row.credit_change ?? row.credits_used)), 0);
  const dollarsSpent = usage.reduce((sum, row) => sum + num(row.cost_usd ?? row.amount_usd ?? row.usd), 0);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Settings"
        title="Usage"
        description="Live consumption across your workspace — credits and spend update as your agents run."
      />
      <SettingsTabs />

      <section className="grid cols-4">
        <MetricCard icon={Coins} label="Credit balance" value={(data.profile?.credits_balance ?? 0).toLocaleString()} trend="Available credits" />
        <MetricCard icon={Gauge} label="Credits used" value={creditsUsed.toLocaleString()} trend="Across recent activity" tone="violet" />
        <MetricCard icon={DollarSign} label="Spend (USD)" value={`$${dollarsSpent.toFixed(2)}`} trend="Metered provider cost" tone="green" />
        <MetricCard icon={Activity} label="Usage events" value={usage.length.toLocaleString()} trend="Auditable records" />
      </section>

      <GlassCard>
        <SectionHeader title="Recent usage" description="Newest metered events, including model and provider activity." />
        <DataTable
          headers={["Event", "Provider", "Credits", "Cost", "When"]}
          rows={usage.slice(0, 50).map((row) => [
            str(row.event_type ?? row.action ?? row.reason ?? row.type),
            str(row.provider ?? row.source, "Veldo"),
            Math.abs(num(row.credits ?? row.credit_change ?? row.credits_used)).toLocaleString(),
            `$${num(row.cost_usd ?? row.amount_usd ?? row.usd).toFixed(2)}`,
            row.created_at ? new Date(String(row.created_at)).toLocaleString() : "—",
          ])}
          empty={<EmptyState icon={Activity} title="No usage yet" description="Usage events appear here as your campaigns, research, and sends run." />}
        />
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Credit ledger" description="Every credit change, newest first." />
        <DataTable
          headers={["Change", "Reason", "Balance", "When"]}
          rows={(data.ledger ?? []).map((event) => [
            num(event.credit_change).toLocaleString(),
            str(event.reason),
            num(event.new_balance).toLocaleString(),
            event.created_at ? new Date(String(event.created_at)).toLocaleString() : "—",
          ])}
          empty={<EmptyState title="No ledger events" description="Credit ledger events will appear after sends, refills, webhooks, or admin adjustments." />}
        />
      </GlassCard>
    </PageShell>
  );
}
