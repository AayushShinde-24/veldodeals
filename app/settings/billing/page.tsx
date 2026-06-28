import { ArrowRight, CheckCircle2, CreditCard, Sparkles, WalletCards } from "lucide-react";
import { DataTable, EmptyState, GlassCard, MetricCard, PageHeader, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { addOnCredits, creditCosts, getRevenuePlan, revenuePlans } from "@/lib/revenue-os/pricing";
import { startCheckoutAction } from "@/app/billing/actions";

const TIER_LABEL: Record<string, string> = { solo: "Solo", team: "Team", enterprise: "Enterprise" };
const TIER_ORDER = ["solo", "team", "enterprise"] as const;
// Best-in-each-tier — psychologically featured as the recommended pick.
const RECOMMENDED = new Set(["solo_momentum", "team_engine", "enterprise_apex"]);

export default async function SettingsBillingPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const data = await getOperationalData(userId);
  const plan = getRevenuePlan(data.profile?.plan);
  const ledger = data.ledger.slice(0, 10);

  return (
    <>
      <PageHeader
        eyebrow="Settings › Billing"
        title="Plan, credits & billing"
        description="Your subscription, credit balance, plans, and add-ons — all in one place."
      />

      <section className="grid cols-3">
        <MetricCard icon={WalletCards} label="Credit balance" value={(data.profile?.credits_balance ?? 0).toLocaleString()} trend="Available to spend" tone="green" />
        <MetricCard icon={CreditCard} label="Current plan" value={plan.name} trend={`${plan.monthlyCredits?.toLocaleString() ?? "Custom"} credits / month`} tone="violet" />
        <MetricCard icon={WalletCards} label="Usage events" value={data.usage.length} trend="Auditable records" />
      </section>

      {/* Plans, grouped by tier with the recommended plan featured */}
      <GlassCard glow>
        <SectionHeader title="Plans" description="Pick the plan that fits — the recommended option in each tier is highlighted." />
        {TIER_ORDER.map((tier) => (
          <div className="bill-tier" key={tier}>
            <div className="bill-tier-head">{TIER_LABEL[tier]}</div>
            <div className="bill-plan-grid">
              {revenuePlans.filter((p) => p.audience === tier).map((p) => {
                const rec = RECOMMENDED.has(p.key);
                const current = p.key === plan.key;
                return (
                  <form action={startCheckoutAction} key={p.key} className={`bill-plan${rec ? " rec" : ""}${current ? " current" : ""}`}>
                    {rec && <span className="bill-badge">Recommended</span>}
                    <input type="hidden" name="plan" value={p.key} />
                    <div className="bill-plan-name">{p.name}</div>
                    <div className="bill-plan-price">
                      {p.priceMonthlyUsd === null ? <span className="bill-plan-custom">Custom</span> : <><strong>${p.priceMonthlyUsd.toLocaleString()}</strong><span>/mo</span></>}
                    </div>
                    <div className="bill-plan-credits">{p.monthlyCredits === null ? "Pay as you go" : `${p.monthlyCredits.toLocaleString()} credits / mo`}</div>
                    {p.hyperPersonalizationUsd ? <div className="bill-plan-hyper">+ Hyper-personalization ${p.hyperPersonalizationUsd}</div> : null}
                    <button className={`btn ${rec ? "primary" : ""} bill-plan-cta`} type="submit" disabled={current}>
                      {current ? "Current plan" : p.priceMonthlyUsd === null ? "Contact sales" : "Choose plan"}
                      {!current && <ArrowRight size={14} />}
                    </button>
                  </form>
                );
              })}
            </div>
          </div>
        ))}
        <div className="bill-note">
          <Sparkles size={14} /> Every plan includes a <strong>2.5% fee on deals closed</strong> through Veldo.
          Add-on credits from <strong>${addOnCredits.minAnnualUsd.toLocaleString()}/yr</strong>
          ({(100 / addOnCredits.regularCreditsPerUsd).toFixed(0)}¢/credit · {(100 / addOnCredits.hyperCreditsPerUsd).toFixed(1)}¢ hyper-personalized).
        </div>
      </GlassCard>

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
          <SectionHeader title="Recent ledger" description="Last 10 credit events." action={<StatusPill status={plan.key} />} />
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
            empty={<EmptyState icon={CheckCircle2} title="No ledger events yet" description="Credit events appear after sends, upgrades, or resets." />}
          />
        </GlassCard>
      </section>
    </>
  );
}
