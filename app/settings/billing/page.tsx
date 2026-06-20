import { CreditCard, WalletCards } from "lucide-react";
import { DataTable, EmptyState, GlassCard, MetricCard, PageHeader, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { creditCosts, getRevenuePlan, revenuePlans } from "@/lib/revenue-os/pricing";
import { startCheckoutAction } from "@/app/billing/actions";

export default async function SettingsBillingPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const data = await getOperationalData(userId);
  const plan = getRevenuePlan(data.profile?.plan);
  const ledger = data.ledger.slice(0, 10);

  return (
    <>
      <PageHeader
        eyebrow="Settings › Billing"
        title="Plan and credits"
        description="Manage your subscription plan and view your credit balance."
        actions={<a className="btn" href="/billing">Full ledger</a>}
      />

      <section className="grid cols-3">
        <MetricCard
          icon={WalletCards}
          label="Credit balance"
          value={(data.profile?.credits_balance ?? 0).toLocaleString()}
          trend="Available to spend"
          tone="green"
        />
        <MetricCard
          icon={CreditCard}
          label="Current plan"
          value={plan.name}
          trend={`${plan.monthlyCredits?.toLocaleString() ?? "Custom"} credits / month`}
          tone="violet"
        />
        <MetricCard
          icon={WalletCards}
          label="Usage events"
          value={data.usage.length}
          trend="Auditable records"
        />
      </section>

      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Credit costs" description="Per-action credit schedule." />
          {Object.entries(creditCosts).map(([key, value]) => (
            <div className="premium-list-row" key={key}>
              <span>{key.replaceAll("_", " ")}</span>
              <strong>{String(value)} credit{value === 1 ? "" : "s"}</strong>
            </div>
          ))}
        </GlassCard>

        <GlassCard>
          <SectionHeader title="Recent ledger" description="Last 10 credit events." />
          <DataTable
            headers={["Change", "Reason", "Balance", "Date"]}
            rows={ledger.map((event) => [
              <span style={{ color: event.credit_change < 0 ? "var(--danger)" : "var(--ok)" }}>
                {event.credit_change > 0 ? "+" : ""}{event.credit_change}
              </span>,
              event.reason,
              event.new_balance,
              new Date(event.created_at).toLocaleDateString(),
            ])}
            empty={<EmptyState title="No ledger events yet" description="Credit events appear after sends, upgrades, or resets." />}
          />
        </GlassCard>
      </section>

      <GlassCard>
        <SectionHeader title="Upgrade plan" description="Switch plans to get more monthly credits." />
        <div className="grid cols-4">
          {revenuePlans
            .filter((item) => item.priceMonthlyUsd !== null && item.key !== "free")
            .map((item) => (
              <form action={startCheckoutAction} key={item.key}>
                <input type="hidden" name="plan" value={item.key} />
                <button
                  className={`btn ${item.key === plan.key ? "primary" : ""}`}
                  type="submit"
                  style={{ width: "100%" }}
                >
                  <span>{item.name}</span>
                  <span style={{ opacity: 0.7, fontSize: 12 }}>${item.priceMonthlyUsd}/mo</span>
                </button>
              </form>
            ))}
        </div>
        <div className="premium-list-row" style={{ marginTop: 16 }}>
          <span>Current plan</span>
          <StatusPill status={plan.key} />
        </div>
      </GlassCard>
    </>
  );
}
