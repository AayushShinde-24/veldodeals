"use client";

import { useState, type PointerEvent } from "react";
import { ArrowRight, Check, Coins, Layers, Sparkles, Star, Zap } from "lucide-react";
import { pricingTiers, addOnCredits, topUpPlans, type Accent, type DisplayPlan, type DisplayTier } from "./pricing-data";
import styles from "./pricing.module.css";

const GEM_PALETTE: Record<Accent, { light: string; mid: string; dark: string }> = {
  blue: { light: "#7dd3fc", mid: "#3b82f6", dark: "#1e3a8a" },
  violet: { light: "#c4b5fd", mid: "#8b5cf6", dark: "#4c1d95" },
  indigo: { light: "#d8b4fe", mid: "#9333ea", dark: "#6b21a8" },
  slate: { light: "#cbd5e1", mid: "#64748b", dark: "#334155" },
};

type Billing = "monthly" | "annual";
type CreditMode = "normal" | "hyper";

// Annual = pay 10 months up front (~17% off). We surface it as an effective monthly
// price, rounded down to a clean "…99 / …49" figure so it always reads cheaper.
function annualMonthly(monthly: number): number {
  const eff = (monthly * 10) / 12;
  const base = eff >= 300 ? 100 : 50;
  return Math.round(eff / base) * base - 1;
}

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

/** Small cylindrical monthly/annual toggle + a "Save 17%" tag. */
function BillingToggle({ value, onChange }: { value: Billing; onChange: (v: Billing) => void }) {
  return (
    <div className={styles.billRow}>
      <div className={styles.billToggle} role="tablist" aria-label="Billing period">
        <span className={styles.billThumb} style={{ transform: `translateX(${value === "annual" ? "100%" : "0"})` }} />
        {(["monthly", "annual"] as Billing[]).map((b) => (
          <button
            key={b}
            role="tab"
            aria-selected={value === b}
            className={`${styles.billBtn} ${value === b ? styles.billActive : ""}`}
            onClick={() => onChange(b)}
          >
            {b === "monthly" ? "Monthly" : "Annual"}
          </button>
        ))}
      </div>
      <span className={styles.saveTag}>Save 17%</span>
    </div>
  );
}

function PlanCard({
  plan,
  index,
  isCurrent,
  tierId,
}: {
  plan: DisplayPlan;
  index: number;
  isCurrent: boolean;
  tierId: DisplayTier["id"];
}) {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [creditMode, setCreditMode] = useState<CreditMode>("normal");

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

  const isFree = plan.priceUsd === 0;
  // Annual billing is available on Solo & Team only; Enterprise is monthly / API.
  const annualBillable = (tierId === "solo" || tierId === "team") && plan.priceUsd !== null && plan.priceUsd > 0;
  const showBillToggle = annualBillable;
  const annual = showBillToggle && billing === "annual";
  // Hyper-personalization add-on shown for every tier EXCEPT Solo.
  const showHyper = tierId !== "solo" && plan.hyperUsd !== undefined;

  const hyperMonthly =
    plan.hyperUsd == null ? null : annual ? annualMonthly(plan.hyperUsd) : plan.hyperUsd;

  return (
    <div
      className={`${styles.card} ${plan.highlight ? styles.cardHighlight : ""} ${isCurrent ? styles.cardCurrent : ""}`}
      style={{ animationDelay: `${index * 90}ms` }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {isCurrent ? (
        <span className={`${styles.badge} ${styles.badgeCurrent}`}><Star size={11} strokeWidth={3} /> Current plan</span>
      ) : (
        plan.badge && <span className={styles.badge}>{plan.badge}</span>
      )}

      <div className={styles.gemWrap}><Gem accent={plan.accent} /></div>
      <div className={styles.planName}>{plan.name}</div>

      {showBillToggle ? (
        <BillingToggle value={billing} onChange={setBilling} />
      ) : (
        <div className={styles.billSpacer} />
      )}

      <div className={styles.planTag}>{plan.tagline}</div>

      <div className={styles.price}>
        {plan.priceUsd === null ? (
          <span className={styles.priceCustom}>Custom</span>
        ) : isFree ? (
          <span className={styles.priceCustom}>Free</span>
        ) : annual ? (
          <>
            <span className={styles.priceNum}>${annualMonthly(plan.priceUsd).toLocaleString()}</span>
            <span className={styles.priceSuffix}> / mo</span>
          </>
        ) : (
          <>
            <span className={styles.priceNum}>${plan.priceUsd.toLocaleString()}</span>
            <span className={styles.priceSuffix}> / mo</span>
          </>
        )}
      </div>
      {annual && <div className={styles.annualNote}>Billed annually</div>}

      {/* hyper-personalization add-on selector — sits right under the pricing */}
      {showHyper && (
        <div className={styles.hyperPicker} role="radiogroup" aria-label="Credit type">
          <button
            role="radio"
            aria-checked={creditMode === "normal"}
            className={`${styles.hyperOpt} ${creditMode === "normal" ? styles.hyperOptOn : ""}`}
            onClick={() => setCreditMode("normal")}
          >
            {creditMode === "normal" && <Check size={12} strokeWidth={3} className={styles.hyperCheck} />}
            <span className={styles.hyperOptName}><Coins size={12} /> Normal</span>
            <span className={styles.hyperOptCost}>Included</span>
          </button>
          <button
            role="radio"
            aria-checked={creditMode === "hyper"}
            className={`${styles.hyperOpt} ${styles.hyperOptPremium} ${creditMode === "hyper" ? styles.hyperOptOn : ""}`}
            onClick={() => setCreditMode("hyper")}
          >
            {creditMode === "hyper" && <Check size={12} strokeWidth={3} className={styles.hyperCheck} />}
            <span className={styles.hyperOptName}><Zap size={12} /> Hyper-personalized</span>
            <span className={styles.hyperOptCost}>
              {hyperMonthly == null ? "Custom" : `+$${hyperMonthly.toLocaleString()} / mo`}
            </span>
          </button>
        </div>
      )}

      <div className={styles.creditsChip}>
        <Coins size={15} />
        {plan.credits === null ? plan.creditsLabel : `${plan.credits.toLocaleString()} credits`}
      </div>

      <a
        className={`${styles.cta} ${plan.highlight ? styles.ctaPrimary : ""} ${isCurrent ? styles.ctaCurrent : ""}`}
        href={isCurrent ? "/billing" : plan.ctaHref}
      >
        {isCurrent ? "Manage plan" : plan.cta} <ArrowRight size={16} />
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

function roundK(n: number) {
  return Math.round(n / 1000) * 1000;
}

/** One super-glowing top-up card. Pick EITHER normal (volume) OR hyper (quality). */
function TopUpCard({ usd, best, index }: { usd: number; best?: boolean; index: number }) {
  const [sel, setSel] = useState<CreditMode>("normal");
  const normal = roundK(usd * addOnCredits.normalCreditsPerUsd);
  const hyper = roundK(usd * addOnCredits.hyperCreditsPerUsd);
  return (
    <div
      className={`${styles.topupCard} ${best ? styles.topupBest : ""}`}
      style={{ animationDelay: `${index * 70}ms`, ["--i" as string]: index }}
    >
      {best && <span className={styles.topupBadge}><Star size={11} strokeWidth={3} /> Best value</span>}
      <div className={styles.topupPriceCol}>
        <span className={styles.topupPrice}>${usd.toLocaleString()}</span>
        <span className={styles.topupPer}>/ year</span>
      </div>
      <div className={styles.topupChoice} role="radiogroup" aria-label={`Credit type for $${usd} top-up`}>
        <button
          role="radio"
          aria-checked={sel === "normal"}
          className={`${styles.topupOption} ${sel === "normal" ? styles.topupOptionOn : ""}`}
          onClick={() => setSel("normal")}
        >
          {sel === "normal" && <span className={styles.topupCheck}><Check size={12} strokeWidth={3} /></span>}
          <span className={styles.topupOptLabel}><Coins size={13} /> Normal</span>
          <strong className={styles.topupNormalNum}>{normal.toLocaleString()}</strong>
          <span className={styles.topupOptSub}>more volume</span>
        </button>
        <div className={styles.topupOr}>or</div>
        <button
          role="radio"
          aria-checked={sel === "hyper"}
          className={`${styles.topupOption} ${styles.topupOptionHyper} ${sel === "hyper" ? styles.topupOptionOn : ""}`}
          onClick={() => setSel("hyper")}
        >
          {sel === "hyper" && <span className={styles.topupCheck}><Check size={12} strokeWidth={3} /></span>}
          <span className={styles.topupOptLabel}><Zap size={13} /> Hyper</span>
          <strong className={styles.topupHyperNum}>{hyper.toLocaleString()}</strong>
          <span className={styles.topupOptSub}>higher quality</span>
        </button>
      </div>
    </div>
  );
}

export function PricingClient({
  currentPlanKey = null,
  currentCredits = null,
}: {
  currentPlanKey?: string | null;
  currentCredits?: number | null;
}) {
  // Find which tier + plan the user is currently on so we can open there and label it.
  const currentTierIndex = pricingTiers.findIndex((t) => t.plans.some((p) => p.key === currentPlanKey));
  const currentPlan =
    currentTierIndex >= 0
      ? pricingTiers[currentTierIndex].plans.find((p) => p.key === currentPlanKey) ?? null
      : null;

  const [active, setActive] = useState(currentTierIndex >= 0 ? currentTierIndex : 0);
  const tier: DisplayTier = pricingTiers[active];

  return (
    <div className={styles.inner}>
      <div className={styles.header}>
        <span className={styles.eyebrow}><Sparkles size={14} /> Pricing</span>
        <h1 className={styles.title}>Power your revenue with Vel credits</h1>
        <p className={styles.subtitle}>
          One credit model across lead discovery, hyper-personalization, email, AI calls, CRM,
          marketing, and investor outreach. Pick the tier that matches your stage.
        </p>
      </div>

      {/* current-plan panel — pinned left so you always see "you are here" */}
      {currentPlan && (
        <div className={styles.currentBar}>
          <div className={styles.currentInfo}>
            <span className={styles.currentLabel}><Star size={12} strokeWidth={3} /> Current plan</span>
            <strong className={styles.currentName}>{currentPlan.name}</strong>
            {currentCredits != null && (
              <span className={styles.currentCredits}>
                <Coins size={13} /> {currentCredits.toLocaleString()} credits available
              </span>
            )}
          </div>
          <p className={styles.currentHint}>
            Explore the plans on the right — upgrade for more power anytime →
          </p>
        </div>
      )}

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
          <PlanCard
            key={plan.key}
            plan={plan}
            index={i}
            isCurrent={plan.key === currentPlanKey}
            tierId={tier.id}
          />
        ))}
      </div>

      {/* add-on credits — stacked, glowing, either normal OR hyper */}
      <div className={styles.addon}>
        <div className={styles.addonHead}>
          <div className={styles.addonTitle}><Layers size={20} /> Top up anytime</div>
          <p className={styles.addonText}>
            Stack add-on credits on any plan — no re-tiering. On every top-up you choose one:
            <b> normal</b> credits for maximum volume, or <b> hyper-personalized</b> credits for
            higher-quality outcomes. Quantity or quality — your call. The higher the top-up, the
            more you get.
          </p>
        </div>

        <div className={styles.topupStack}>
          {topUpPlans.map((p, i) => (
            <TopUpCard key={p.annualUsd} usd={p.annualUsd} best={p.best} index={i} />
          ))}
        </div>
      </div>

      <p className={styles.footNote}>
        Every plan includes Veldo&apos;s 2.5% deal-close fee. Credits roll across sales, fundraising,
        and marketing. Cancel anytime.
      </p>
    </div>
  );
}
