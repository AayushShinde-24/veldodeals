import { CreditCard, ShieldCheck, WalletCards } from "lucide-react";
import { DataTable, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, SectionHeader, SettingsList } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { creditCosts, getRevenuePlan, revenuePlans } from "@/lib/revenue-os/pricing";
import { startCheckoutAction } from "./actions";

export default async function BillingPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const data = await getOperationalData(userId);
  const plan = getRevenuePlan(data.profile?.plan);
  return (
    <PageShell>
      <PageHeader eyebrow="Billing" title="Credits and usage ledger" description="Credits move only through valid usage events, payment webhooks, or admin approval." />
      <section className="grid cols-3">
        <MetricCard icon={WalletCards} label="Current balance" value={(data.profile?.credits_balance ?? 0).toLocaleString()} trend="From users.credits_balance" />
        <MetricCard icon={CreditCard} label="Plan" value={plan.name} trend={`${plan.monthlyCredits?.toLocaleString() ?? "Custom"} monthly credits`} tone="violet" />
        <MetricCard icon={WalletCards} label="Usage events" value={data.usage.length} trend="Auditable usage records" tone="green" />
      </section>
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Billing readiness" description="Usage creates a credit event, ledger entry, and balance update after successful action completion." action={<ShieldCheck size={18} color="var(--success)" />} />
          <SettingsList items={[
            { label: "Credit deduction", value: <StatusPill status="completed" /> },
            { label: "Successful send event required", value: <StatusPill status="completed" /> },
            { label: "Monthly reset credits", value: plan.monthlyCredits?.toLocaleString() ?? "Custom" },
            { label: "Hyper-personalization add-on", value: plan.hyperPersonalizationUsd ? `$${plan.hyperPersonalizationUsd}` : "Custom" },
            { label: "Admin adjustments", value: "Audit-ready" },
          ]} />
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Credit costs" description="Launch credit schedule used by autonomous workflows." />
          <SettingsList items={Object.entries(creditCosts).map(([key, value]) => ({ label: key.replaceAll("_", " "), value }))} />
        </GlassCard>
      </section>
      <GlassCard>
        <SectionHeader title="Plan upgrade actions" description="Uses mock checkout until billing keys and price ids are configured." />
        <div className="grid cols-4">
          {revenuePlans.filter((item) => item.priceMonthlyUsd !== null).map((item) => (
            <form action={startCheckoutAction} key={item.key}>
              <input type="hidden" name="plan" value={item.key} />
              <button className={`btn ${item.key === "go" || item.key === "grow" ? "primary" : ""}`} type="submit" style={{ width: "100%" }}>
                {item.name} - ${item.priceMonthlyUsd}
              </button>
            </form>
          ))}
        </div>
      </GlassCard>
      <GlassCard>
        <SectionHeader title="Ledger" description="Newest credit ledger events." />
        <DataTable headers={["Change", "Reason", "Balance", "Created"]} rows={data.ledger.map((event) => [event.credit_change, event.reason, event.new_balance, new Date(event.created_at).toLocaleString()])} empty={<EmptyState title="No ledger events" description="Credit ledger events will appear after sends, refills, webhooks, or admin adjustments." />} />
      </GlassCard>
    </PageShell>
  );
}
