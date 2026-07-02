"use client";

import { useState, type PointerEvent } from "react";
import { ArrowRight, Check, Coins, Sparkles } from "lucide-react";
import { pricingTiers, addOnCredits, type Accent, type DisplayPlan } from "./pricing-data";
import styles from "./pricing.module.css";

const GEM_PALETTE: Record<Accent, { light: string; mid: string; dark: string }> = {
  blue: { light: "#7dd3fc", mid: "#3b82f6", dark: "#1e3a8a" },
  violet: { light: "#c4b5fd", mid: "#8b5cf6", dark: "#4c1d95" },
  indigo: { light: "#d8b4fe", mid: "#9333ea", dark: "#6b21a8" },
};

function Gem({ accent }: { accent: Accent }) {
  const c = GEM_PALETTE[accent];
  const id = `gem-${accent}`;
  return (
    <svg className={styles.gem} width="74" height="74" viewBox="0 0 100 100" aria-hidden="true"
      style={{ filter: `drop-shadow(0 12px 22px ${c.mid}88)` }}>
      <defs>
        <linearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.light} /><stop offset="1" stopColor={c.mid} />
        </linearGradient>
        <linearGradient id={`${id}-m`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor={c.light} />
        </linearGradient>
        <linearGradient id={`${id}-d`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.mid} /><stop offset="1" stopColor={c.dark} />
        </linearGradient>
      </defs>
      {/* crown */}
      <polygon points="10,40 32,16 50,40" fill={`url(#${id}-l)`} />
      <polygon points="32,16 68,16 50,40" fill={`url(#${id}-m)`} />
      <polygon points="68,16 90,40 50,40" fill={`url(#${id}-l)`} opacity="0.9" />
      {/* pavilion */}
      <polygon points="10,40 50,40 50,94" fill={`url(#${id}-d)`} />
      <polygon points="90,40 50,40 50,94" fill={`url(#${id}-d)`} opacity="0.82" />
      {/* girdle highlight */}
      <line x1="10" y1="40" x2="90" y2="40" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1" />
    </svg>
  );
}

function PlanCard({ plan, index }: { plan: DisplayPlan; index: number }) {
  function onMove(e: PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `translateY(-6px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg)`;
  }
  function onLeave(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.style.transform = "";
  }

  return (
    <div
      className={`${styles.card} ${plan.highlight ? styles.cardHighlight : ""}`}
      style={{ animationDelay: `${index * 90}ms` }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {plan.badge && <span className={styles.badge}>{plan.badge}</span>}

      <div className={styles.gemWrap}><Gem accent={plan.accent} /></div>
      <div className={styles.planName}>{plan.name}</div>
      <div className={styles.planTag}>{plan.tagline}</div>

      <div className={styles.price}>
        {plan.priceUsd === null ? (
          <span className={styles.priceCustom}>Custom</span>
        ) : (
          <>
            <span className={styles.priceNum}>${plan.priceUsd.toLocaleString()}</span>
            <span className={styles.priceSuffix}> / mo</span>
          </>
        )}
      </div>

      <div className={styles.creditsChip}>
        <Coins size={15} />
        {plan.credits === null ? plan.creditsLabel : `${plan.credits.toLocaleString()} credits`}
      </div>

      <a className={`${styles.cta} ${plan.highlight ? styles.ctaPrimary : ""}`} href={plan.ctaHref}>
        {plan.cta} <ArrowRight size={16} />
      </a>

      <div className={styles.seat}>{plan.seats}</div>

      <div className={styles.features}>
        {plan.features.map((f) => (
          <div className={styles.featRow} key={f}>
            <span className={styles.tick}><Check size={11} strokeWidth={3} /></span>
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PricingClient() {
  const [active, setActive] = useState(0);
  const tier = pricingTiers[active];

  return (
    <div className={styles.inner}>
      <div className={styles.header}>
        <span className={styles.eyebrow}><Sparkles size={14} /> Pricing</span>
        <h1 className={styles.title}>Power your revenue with Vel credits</h1>
        <p className={styles.subtitle}>
          One credit model across lead discovery, hyper-personalization, email, AI calls, CRM, and
          investor outreach. Pick the tier that matches your stage.
        </p>
      </div>

      {/* cylindrical tier toggle */}
      <div className={styles.toggleWrap}>
        <div className={styles.toggle} role="tablist" aria-label="Pricing tiers">
          <div className={styles.thumb} style={{ transform: `translateX(${active * 100}%)` }} />
          {pricingTiers.map((t, i) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={i === active}
              className={`${styles.segBtn} ${i === active ? styles.segActive : ""}`}
              onClick={() => setActive(i)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.tierSub}>{tier.sub}</p>

      {/* cards — keyed by tier so the fade/stagger replays on switch */}
      <div className={styles.grid} key={tier.id}>
        {tier.plans.map((plan, i) => (
          <PlanCard key={plan.key} plan={plan} index={i} />
        ))}
      </div>

      {/* add-on credits band */}
      <div className={styles.addon}>
        <div>
          <div className={styles.addonTitle}>Top up anytime</div>
          <p className={styles.addonText}>
            Stack add-on credits on any plan and scale exactly when you need to — no re-tiering, no
            friction. Buy from $1,000 to $200,000 per year.
          </p>
          <div className={styles.addonRange}>
            <b>${addOnCredits.minAnnualUsd.toLocaleString()}/yr</b>
            <span style={{ color: "#9d93cf" }}>→</span>
            <b>${addOnCredits.maxAnnualUsd.toLocaleString()}/yr</b>
          </div>
        </div>
        <div className={styles.addonStats}>
          <div className={styles.addonStat}>
            <span>Regular credit</span>
            <strong>{addOnCredits.regularCentsPerCredit}¢ each</strong>
          </div>
          <div className={styles.addonStat}>
            <span>Hyper-personalized credit</span>
            <strong>{addOnCredits.hyperCentsPerCredit}¢ each</strong>
          </div>
        </div>
      </div>

      <p className={styles.footNote}>
        Every plan includes Veldo&apos;s 2.5% deal-close fee. Credits roll across sales and fundraising. Cancel anytime.
      </p>
    </div>
  );
}
