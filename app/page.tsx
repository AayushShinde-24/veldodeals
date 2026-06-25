import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Gauge,
  Layers,
  MessageSquareReply,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { pricingTiers } from "./pricing/pricing-data";

export const metadata = {
  title: "Veldo — Autonomous Revenue OS",
  description:
    "Veldo runs your B2B sales and fundraising end to end — a coordinated team of AI agents that research, score, personalize, draft, gate, send, and learn. Up to fully autonomous, on your terms.",
};

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------
function Nav() {
  return (
    <nav className="landing-nav" aria-label="Site navigation">
      <a className="landing-brand" href="/">
        <BrandMark />
        <span>Veldo</span>
      </a>
      <div className="landing-nav-links">
        <a href="#how-it-works">How it works</a>
        <a href="#pricing">Pricing</a>
        <a href="/security">Security</a>
      </div>
      <div className="landing-auth">
        <a className="btn" href="/login">Sign in</a>
        <a className="btn primary" href="/signup">
          Get started <ArrowRight size={15} />
        </a>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
function Hero() {
  return (
    <section className="landing-hero">
      <div className="landing-copy">
        <span className="premium-eyebrow">Autonomous Revenue OS</span>
        <h1>
          Your AI sales team.<br />
          <span className="gradient-text">Always on. Up to fully autonomous.</span>
        </h1>
        <p className="landing-lede">
          Veldo runs B2B sales and fundraising end to end — a coordinated team of AI agents
          researches your market, writes and scores every message, clears its own quality gates,
          sends, and learns from every reply. You set how autonomous it runs.
        </p>
        <div className="landing-actions">
          <a className="btn primary landing-cta-btn" href="/signup">
            <Sparkles size={16} /> Build your AI sales team
          </a>
          <a className="btn" href="#how-it-works">
            See how it works <ArrowRight size={15} />
          </a>
        </div>
        <div className="landing-trust">
          {[
            "Campaign Leader orchestrated",
            "7 automatic quality gates",
            "Up to fully autonomous*",
            "Learns from every reply",
          ].map((item) => (
            <span key={item}>
              <CheckCircle2 size={13} /> {item}
            </span>
          ))}
        </div>
        <p className="landing-fine">
          *Run it fully autonomous, or keep human approval on at any level you choose. You stay in control.
        </p>
      </div>

      {/* Right column: product preview + campaign flow */}
      <div className="landing-hero-panel">
        <DashboardPreview />
        <div className="landing-signal" aria-label="Veldo campaign flow">
          <div className="landing-signal-head">
            <span>Campaign flow</span>
            <strong>Target → Research → Write → Gate → Send → Learn</strong>
          </div>
          {[
            ["01", "Research", "Company, signals, and ICP fit on every account"],
            ["02", "Write", "Personalized message, auto-scored for reply quality"],
            ["03", "Gate", "Automatic quality checks clear before anything sends"],
            ["04", "Learn", "Replies and outcomes sharpen the next campaign"],
          ].map(([number, title, text]) => (
            <div className="landing-signal-row" key={title}>
              <span>{number}</span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Dashboard preview (inline mockup — no screenshot needed)
// ---------------------------------------------------------------------------
function DashboardPreview() {
  return (
    <div className="landing-preview-frame">
      <div className="lp-preview">
        {/* Window chrome */}
        <div className="lp-chrome">
          <span className="lp-dot" style={{ background: "#ef4444" }} />
          <span className="lp-dot" style={{ background: "#f59e0b" }} />
          <span className="lp-dot" style={{ background: "#22c55e" }} />
          <span className="lp-url">app.veldo.ai/dashboard</span>
        </div>
        <div className="lp-layout">
          {/* Sidebar */}
          <div className="lp-sidebar">
            <div className="lp-logo">
              <span className="lp-v">V</span>
              <strong>Veldo</strong>
            </div>
            {["Dashboard", "Vel AI", "Campaigns", "Leads", "Inbox", "Analytics"].map(
              (item, i) => (
                <div key={item} className={`lp-nav-item${i === 0 ? " active" : ""}`}>
                  <span className="lp-nav-dot" />
                  {item}
                </div>
              )
            )}
          </div>
          {/* Main */}
          <div className="lp-main">
            {/* Stats */}
            <div className="lp-stats">
              {[
                { label: "Emails sent", value: "2,841", color: "#3b82f6" },
                { label: "Replies", value: "312", color: "#22d3ee" },
                { label: "Meetings", value: "47", color: "#22c55e" },
                { label: "Deals", value: "12", color: "#8b5cf6" },
              ].map((s) => (
                <div className="lp-stat" key={s.label}>
                  <div className="lp-stat-label">{s.label}</div>
                  <div className="lp-stat-value" style={{ color: s.color }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
            {/* Live pipeline */}
            <div className="lp-card">
              <div className="lp-card-head">
                <span>CAMPAIGN LEADER · LIVE</span>
              </div>
              {[
                ["Sarah Chen · Meridian Analytics", "Sent", "#22c55e"],
                ["Marcus Williams · Stackpath", "Drafting", "#8b5cf6"],
                ["Alex Rodriguez · NorthPoint", "Researching", "#22d3ee"],
              ].map(([name, status, color]) => (
                <div className="lp-queue-row" key={name}>
                  <span className="lp-queue-name">{name}</span>
                  <span className="lp-queue-status" style={{ color }}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
            {/* Gates */}
            <div className="lp-gates">
              {["ICP ✓", "Research ✓", "Score 88", "Verified ✓", "Gates ✓", "Autonomous"].map(
                (g) => (
                  <span key={g} className="lp-gate">
                    {g}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metrics band (capability, not unverified performance claims)
// ---------------------------------------------------------------------------
function MetricsBand() {
  return (
    <div className="landing-metrics-band">
      {[
        { value: "15+", label: "Specialist AI agents" },
        { value: "7", label: "Automatic quality gates" },
        { value: "24/7", label: "Always-on outreach" },
        { value: "2", label: "Pillars: sales & fundraising" },
      ].map((item) => (
        <div key={item.label} className="landing-metric-item">
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------
function Features() {
  const features = [
    {
      icon: Target,
      title: "Campaign Leader",
      text: "One AI orchestrator runs the whole motion — routing work between specialists, monitoring confidence, and pausing only when quality genuinely needs attention.",
    },
    {
      icon: Bot,
      title: "15+ specialist agents",
      text: "Research, ICP scoring, personalization strategy, message writing, QA scoring, verification, reply classification, and more — each a focused expert, working in concert.",
    },
    {
      icon: ShieldCheck,
      title: "Automatic quality gates",
      text: "Every message clears built-in checks for fit, research depth, deliverability, and score before it can send — so quality is enforced by the system, not by hope.",
    },
    {
      icon: Gauge,
      title: "Up to fully autonomous",
      text: "Run the entire loop hands-free, or dial autonomy down to review-before-send. From guided to fully autonomous, you set the level — and change it anytime.",
    },
    {
      icon: MessageSquareReply,
      title: "Reply intelligence",
      text: "Inbound replies are understood and routed automatically — interested, meeting-ready, objection, or out-of-office — and feed straight into your pipeline.",
    },
    {
      icon: BarChart3,
      title: "Continuous learning loop",
      text: "Reply rates, meetings, and deal outcomes feed back into targeting and messaging, so each campaign compounds on the last — automatically.",
    },
  ];

  return (
    <section className="landing-band">
      {features.map((item) => {
        const Icon = item.icon;
        return (
          <article className="landing-feature" key={item.title}>
            <Icon size={22} />
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        );
      })}
    </section>
  );
}

// ---------------------------------------------------------------------------
// How it works
// ---------------------------------------------------------------------------
function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: Radar,
      title: "Define your market",
      text: "Describe your ideal customer in plain language. Veldo builds and continuously enriches a live target list from premium data — company research, buying signals, and an ICP fit score on every account. No spreadsheets, no manual list-building.",
    },
    {
      n: "02",
      icon: Layers,
      title: "Vel researches and writes",
      text: "The Campaign Leader runs each qualified account through research, strategy, and message writing. Every draft is personalized to real signals and scored for reply quality — with a transparent reason for every angle it chose.",
    },
    {
      n: "03",
      icon: ShieldCheck,
      title: "It sends, gated by your rules",
      text: "Messages clear automatic quality gates and go out within the autonomy and guardrails you set — fully hands-free, or held for one-tap approval. Budgets, send limits, and a kill switch are always yours.",
    },
    {
      n: "04",
      icon: TrendingUp,
      title: "It learns and compounds",
      text: "Every reply, meeting, and closed deal feeds the learning loop. Veldo sharpens targeting and messaging on its own — so performance improves campaign after campaign, without you re-tuning a thing.",
    },
  ];

  return (
    <section className="landing-workflow" id="how-it-works">
      <div className="landing-section-inner">
        <div className="landing-section-label">
          <span className="premium-eyebrow">How it works</span>
        </div>
        <h2 className="landing-section-title">
          From market to closed pipeline — autonomously
        </h2>
        <p className="landing-section-sub">
          Every step is transparent, every decision is logged, and every send respects the autonomy level you set.
        </p>
        <div className="landing-steps">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div className="landing-step" key={step.n}>
                <div className="landing-step-num">
                  <Icon size={18} />
                </div>
                <div className="landing-step-body">
                  <span className="landing-step-label">{step.n}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
                {i < steps.length - 1 && <div className="landing-step-connector" aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pricing (reads the shared pricing data so it always matches /pricing)
// ---------------------------------------------------------------------------
function tierFrom(tierId: string) {
  const tier = pricingTiers.find((t) => t.id === tierId);
  if (!tier) return { from: 0, lo: 0, hi: 0, openEnded: false };
  const priced = tier.plans.filter((p) => p.priceUsd !== null) as { priceUsd: number }[];
  const credited = tier.plans.filter((p) => p.credits !== null) as { credits: number }[];
  const openEnded = tier.plans.some((p) => p.priceUsd === null);
  return {
    from: Math.min(...priced.map((p) => p.priceUsd)),
    lo: Math.min(...credited.map((p) => p.credits)),
    hi: Math.max(...credited.map((p) => p.credits)),
    openEnded,
  };
}

function Pricing() {
  const cards = [
    {
      id: "solo",
      name: "Solo",
      desc: "For founders and solo operators. Your own private credit balance.",
      popular: false,
      highlights: [
        "3 plans: Launch · Momentum · Velocity",
        "All quality gates + reply intelligence",
        "Up to fully autonomous*",
        "2.5% fee on closed deals",
      ],
    },
    {
      id: "team",
      name: "Team",
      desc: "Credits pooled across 1–10 seats — no per-person juggling.",
      popular: true,
      highlights: [
        "3 plans: Crew · Engine · Powerhouse",
        "Team roles, analytics & sequences",
        "Hyper-personalization add-ons",
        "2.5% fee on closed deals",
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      desc: "Org-scale credit pools shared across your whole company.",
      popular: false,
      highlights: [
        "Scale, Apex & Custom Enterprise",
        "SSO, SLA & success manager",
        "Pay-as-you-go API option",
        "Priority support",
      ],
    },
  ];

  return (
    <section className="landing-pricing" id="pricing">
      <div className="landing-section-inner">
        <div className="landing-section-label">
          <span className="premium-eyebrow">Pricing</span>
        </div>
        <h2 className="landing-section-title">Credit-based pricing that scales with you</h2>
        <p className="landing-section-sub">
          One credit model across sales and fundraising. Start solo, pool credits across a team, or
          scale to your whole org.
        </p>
        <div className="landing-pricing-grid">
          {cards.map((card) => {
            const t = tierFrom(card.id);
            return (
              <div
                key={card.id}
                className={`landing-price-card${card.popular ? " popular" : ""}`}
              >
                {card.popular && <div className="landing-price-badge">Most popular</div>}
                <div className="landing-price-top">
                  <h3>{card.name}</h3>
                  <p>{card.desc}</p>
                </div>
                <div className="landing-price-amount">
                  <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 600 }}>from&nbsp;</span>
                  <strong>${t.from.toLocaleString()}</strong>
                  <span>/mo</span>
                </div>
                <div className="landing-price-credits">
                  {t.lo.toLocaleString()}–{t.hi.toLocaleString()}
                  {t.openEnded ? "+" : ""} credits / mo
                </div>
                <a className={`btn${card.popular ? " primary" : ""}`} href="/pricing">
                  See plans <ArrowRight size={15} />
                </a>
                <ul className="landing-price-features">
                  {card.highlights.map((f) => (
                    <li key={f}>
                      <CheckCircle2 size={13} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="landing-pricing-note">
          Every plan includes a 2.5% fee on deals closed through Veldo. Top up with add-on credits
          from $1,000/yr (10¢ per credit). <a href="/pricing">Compare full pricing →</a>
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CTA
// ---------------------------------------------------------------------------
function FinalCta() {
  return (
    <section className="landing-cta-final">
      <div className="landing-section-inner landing-cta-inner">
        <Zap size={36} className="landing-cta-icon" />
        <h2>Deploy your autonomous revenue team</h2>
        <p>
          Describe your ICP and watch Veldo research, write, gate, and queue your first campaign in
          minutes. Run it fully autonomous, or keep approval on — your call.
        </p>
        <div className="landing-cta-btns">
          <a className="btn primary landing-cta-btn" href="/signup">
            <Sparkles size={16} /> Create your workspace
          </a>
          <a className="btn" href="/login">
            Already have an account <ArrowRight size={15} />
          </a>
        </div>
        <div className="landing-trust" style={{ justifyContent: "center" }}>
          {["You control the autonomy", "Cancel anytime", "GDPR-ready"].map((item) => (
            <span key={item}>
              <ShieldCheck size={12} /> {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-brand">
          <a className="landing-brand" href="/">
            <BrandMark size={28} />
            <span>Veldo</span>
          </a>
          <p>The Autonomous Revenue OS — research, write, gate, send, and learn across sales and fundraising.</p>
        </div>
        <div className="landing-footer-links-group">
          <div className="landing-footer-col">
            <strong>Product</strong>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="/signup">Sign up</a>
            <a href="/login">Sign in</a>
          </div>
          <div className="landing-footer-col">
            <strong>Legal</strong>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/acceptable-use">Acceptable use</a>
            <a href="/data-deletion">Data deletion</a>
          </div>
          <div className="landing-footer-col">
            <strong>Resources</strong>
            <a href="/security">Security</a>
            <a href="/unsubscribe">Unsubscribe</a>
          </div>
        </div>
      </div>
      <div className="landing-footer-bottom">
        <span>© {new Date().getFullYear()} Veldo, Inc. All rights reserved.</span>
        <span>Built for B2B revenue teams.</span>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function HomePage() {
  return (
    <main className="landing-root">
      <Nav />
      <Hero />
      <MetricsBand />
      <Features />
      <HowItWorks />
      <Pricing />
      <FinalCta />
      <Footer />
    </main>
  );
}
