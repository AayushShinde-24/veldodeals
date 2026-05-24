import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Badge, GlassCard, PageHeader } from "@/components/premium";
import { creditCosts, revenuePlans } from "@/lib/revenue-os/pricing";

export default function PricingPage() {
  return (
    <div className="marketing-root">
      <nav className="marketing-nav">
        <a className="brand" href="/"><BrandMark /><span>Veldo</span></a>
        <div className="marketing-links"><a href="/">Product</a><strong>Pricing</strong><a href="/security">Security</a></div>
        <div className="premium-actions"><a className="btn" href="/login">Sign in</a><a className="btn primary" href="/signup">Start free trial <ArrowRight size={16} /></a></div>
      </nav>
      <main className="content" style={{ padding: "24px 60px 60px" }}>
        <PageHeader eyebrow="Pricing" title="Autonomous revenue credits for every growth motion" description="Plans scale across lead discovery, hyper-personalization, email, AI calls, meetings, CRM work, and investor outreach." />
        <section className="grid cols-3">
          {revenuePlans.map((plan) => (
            <GlassCard className={plan.key === "go" || plan.key === "grow" ? "glow" : ""} key={plan.key}>
              <div className="premium-section-head">
                <div><h2>{plan.name}</h2><p>{plan.description}</p></div>
                {plan.audience === "team" ? <Badge tone="violet">Team</Badge> : plan.audience === "enterprise" ? <Badge tone="blue">Enterprise</Badge> : <Sparkles size={18} color="var(--blue)" />}
              </div>
              <div className="metric-value">{plan.priceMonthlyUsd === null ? "Call sales" : `$${plan.priceMonthlyUsd}`}{plan.priceMonthlyUsd !== null ? <span className="muted" style={{ fontSize: 14 }}> / month</span> : null}</div>
              <a className={`btn ${plan.key === "go" || plan.key === "grow" ? "primary" : ""}`} style={{ width: "100%", margin: "22px 0" }} href={plan.priceMonthlyUsd === null ? "/contact" : "/signup"}>{plan.priceMonthlyUsd === null ? "Contact sales" : "Start free trial"}</a>
              <div className="premium-list">
                {[
                  plan.monthlyCredits === null ? "Custom credit pool" : `${plan.monthlyCredits.toLocaleString()} credits / month`,
                  plan.hyperPersonalizationUsd === null ? "Custom hyper-personalization" : `Hyper-personalization add-on $${plan.hyperPersonalizationUsd}`,
                  plan.memberLimit ? `${plan.memberLimit} member limit` : "Custom members",
                  `${plan.expectedUserSharePct}% expected user mix`,
                ].map((feature) => (
                  <div className="premium-list-row" key={feature}><span>{feature}</span><CheckCircle2 size={16} color="var(--success)" /></div>
                ))}
              </div>
            </GlassCard>
          ))}
        </section>
        <GlassCard style={{ marginTop: 24 }}>
          <div className="premium-section-head"><div><h2>Credit costs</h2><p>One credit model across sales, meetings, calls, CRM, and fundraising.</p></div><Badge tone="green">Usage ledger</Badge></div>
          <div className="grid cols-4">
            {Object.entries(creditCosts).map(([action, cost]) => (
              <div className="premium-list-row" key={action}><span>{action.replaceAll("_", " ")}</span><strong>{cost}</strong></div>
            ))}
          </div>
        </GlassCard>
      </main>
    </div>
  );
}
