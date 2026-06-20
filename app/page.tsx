import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  FileText,
  MailCheck,
  MessageSquareReply,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export const metadata = {
  title: "Veldo — AI Sales Team OS",
  description:
    "Deploy a coordinated AI sales team that researches, scores, personalizes, drafts, gates, sends, and learns — with human approval before every email.",
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
        <a href="/pricing">Pricing</a>
        <a href="#how-it-works">How it works</a>
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
        <a className="landing-announce" href="/signup">
          <span className="landing-announce-dot" />
          <span>New: AI-powered reply learning loop</span>
          <ChevronRight size={13} />
        </a>
        <span className="premium-eyebrow" style={{ marginTop: 18 }}>
          AI Sales Team OS
        </span>
        <h1>
          Your AI sales team.<br />
          <span className="gradient-text">Always on. Always gated.</span>
        </h1>
        <p className="landing-lede">
          Veldo deploys a coordinated team of AI agents — research, ICP scoring,
          personalization, email drafting, QA, verification, approval gates,
          sending, and reply learning — orchestrated by a single Campaign Leader.
        </p>
        <div className="landing-actions">
          <a className="btn primary landing-cta-btn" href="/signup">
            <Sparkles size={16} /> Build your AI sales team
          </a>
          <a className="btn" href="/login">
            Sign in <ArrowRight size={15} />
          </a>
        </div>
        <div className="landing-trust">
          {[
            "Campaign Leader controlled",
            "7 gates before every send",
            "Human approval required",
            "Reply learning built-in",
          ].map((item) => (
            <span key={item}>
              <CheckCircle2 size={13} /> {item}
            </span>
          ))}
        </div>
      </div>

      {/* Right column: product preview + campaign flow */}
      <div className="landing-hero-panel">
        <DashboardPreview />
        <div className="landing-signal" aria-label="Veldo campaign flow">
          <div className="landing-signal-head">
            <span>Campaign flow</span>
            <strong>Target → Researched → Gated → Sent</strong>
          </div>
          {[
            ["01", "Research", "Company pages, signals, ICP fit"],
            ["02", "Draft", "Personalized email with score ≥ 75"],
            ["03", "Gate", "7 checks: ICP, research, risk, score, verify, approval, credits"],
            ["04", "Learn", "Replies and conversion rate feed future campaigns"],
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
          <span className="lp-url">veldo.ai/dashboard</span>
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
            {/* Approval queue */}
            <div className="lp-card">
              <div className="lp-card-head">APPROVAL QUEUE</div>
              {[
                ["Sarah Chen · Meridian Analytics", "ready"],
                ["Marcus Williams · Stackpath", "needs review"],
                ["Alex Rodriguez · NorthPoint", "ready"],
              ].map(([name, status]) => (
                <div className="lp-queue-row" key={name}>
                  <span className="lp-queue-name">{name}</span>
                  <span
                    className="lp-queue-status"
                    style={{
                      color: status === "ready" ? "#22c55e" : "#f59e0b",
                    }}
                  >
                    {status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
            {/* Gates */}
            <div className="lp-gates">
              {["ICP ✓", "Research ✓", "Score 88", "Verified ✓", "Approved ✓", "Credits ✓"].map(
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
// Metrics band
// ---------------------------------------------------------------------------
function MetricsBand() {
  return (
    <div className="landing-metrics-band">
      {[
        { value: "7", label: "Gates before any send" },
        { value: "15+", label: "Specialist AI agents" },
        { value: "97%", label: "Inbox delivery rate" },
        { value: "100%", label: "Human-approved sends" },
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
      text: "A central AI orchestrator routes work between specialist agents, monitors confidence, and pauses workflows when quality drops.",
    },
    {
      icon: Bot,
      title: "15 Specialist Agents",
      text: "Research, company analysis, ICP scoring, personalization strategy, email writing, QA scoring, verification, reply classification, and more — each an expert at one job.",
    },
    {
      icon: ShieldCheck,
      title: "7 Mandatory Send Gates",
      text: "Every email must pass ICP fit ≥50%, research confidence ≥60%, personalization risk ≤medium, score ≥75, email verified, human approved, and credits available.",
    },
    {
      icon: MailCheck,
      title: "Human-in-the-Loop",
      text: "Production sends are always gated behind your approval. Review drafts, inspect research, edit tone, and approve — or send back with a note.",
    },
    {
      icon: MessageSquareReply,
      title: "Reply Intelligence",
      text: "Inbound replies are auto-classified as positive, negative, out-of-office, or meeting-ready. Learnings feed back into future campaign decisions.",
    },
    {
      icon: BarChart3,
      title: "Analytics Learning Loop",
      text: "Campaign performance, reply rates, meetings booked, and deal outcomes drive AI recommendations that continuously improve your outbound strategy.",
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
      icon: Search,
      title: "Import leads & define ICP",
      text: "Upload a CSV, pull from Apollo, or describe your target in plain English. Veldo enriches each lead with company research, buying signals, and an ICP fit score.",
    },
    {
      n: "02",
      icon: FileText,
      title: "AI researches & drafts",
      text: "The Campaign Leader sends each qualified lead through a research → personalization → email writing pipeline. Every draft includes a transparent explanation of why each angle was chosen.",
    },
    {
      n: "03",
      icon: ShieldCheck,
      title: "You review & approve",
      text: "Drafts land in your approval queue with their full research context, gate scores, and risk assessment. Approve, edit, or reject — then send with one click.",
    },
    {
      n: "04",
      icon: TrendingUp,
      title: "System learns & improves",
      text: "Every reply, meeting booked, and deal outcome feeds the learning loop. The Analytics Learning Agent surfaces recommended changes for your next campaign.",
    },
  ];

  return (
    <section className="landing-workflow" id="how-it-works">
      <div className="landing-section-inner">
        <div className="landing-section-label">
          <span className="premium-eyebrow">How it works</span>
        </div>
        <h2 className="landing-section-title">
          From target list to reviewed send in four steps
        </h2>
        <p className="landing-section-sub">
          Every step is transparent, every decision is logged, and every send is gated.
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
// Pricing
// ---------------------------------------------------------------------------
function Pricing() {
  const plans = [
    {
      name: "Solo",
      price: "$2,499",
      period: "/month",
      desc: "For solo operators getting serious about outbound. Credits shared across 1–10 seats.",
      cta: "Get started",
      href: "/signup?plan=solo",
      popular: false,
      features: [
        "25,000 credits / month",
        "1–10 shared seats",
        "Up to 5 active campaigns",
        "All 7 compliance gates",
        "Reply intelligence",
        "2.5% commission on closed deals",
      ],
    },
    {
      name: "Team",
      price: "$4,999",
      period: "/month",
      desc: "For small teams replacing 1–2 SDRs. One pooled credit balance across the team.",
      cta: "Get started",
      href: "/signup?plan=team",
      popular: true,
      features: [
        "60,000 credits / month",
        "1–10 shared seats",
        "Unlimited campaigns",
        "AI voice calls + sequences",
        "Analytics learning loop",
        "Deal-closing automation",
        "Priority support",
      ],
    },
    {
      name: "Scale",
      price: "$9,999",
      period: "/month",
      desc: "Full revenue-team outbound at volume, with shared credits and every channel.",
      cta: "Get started",
      href: "/signup?plan=scale",
      popular: false,
      features: [
        "150,000 credits / month",
        "1–10 shared seats",
        "Unlimited campaigns",
        "Voice + email + fundraising agents",
        "Advanced analytics + A/B",
        "Public API access",
        "SLA + dedicated CSM",
      ],
    },
  ];

  return (
    <section className="landing-pricing" id="pricing">
      <div className="landing-section-inner">
        <div className="landing-section-label">
          <span className="premium-eyebrow">Pricing</span>
        </div>
        <h2 className="landing-section-title">Credit-based pricing for serious outbound</h2>
        <p className="landing-section-sub">
          1 credit = 1 lead or 1 email · follow-ups 3 · AI voice call 10. Credits pool across 1–10 seats. Every plan includes a 2.5% commission on deals closed through Veldo.
        </p>
        <div className="landing-pricing-grid">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`landing-price-card${plan.popular ? " popular" : ""}`}
            >
              {plan.popular && <div className="landing-price-badge">Most popular</div>}
              <div className="landing-price-top">
                <h3>{plan.name}</h3>
                <p>{plan.desc}</p>
              </div>
              <div className="landing-price-amount">
                <strong>{plan.price}</strong>
                <span>{plan.period}</span>
              </div>
              <a className={`btn${plan.popular ? " primary" : ""}`} href={plan.href}>
                {plan.cta} <ArrowRight size={15} />
              </a>
              <ul className="landing-price-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <CheckCircle2 size={13} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="landing-pricing-note">
          Enterprise from <strong>$8,999/mo</strong> (1M credits) · Plus $16,999 · Max $25,999 · or
          go <a href="/pricing">Custom API</a> at $0.10/credit ($0.13 hyper-personalized) + $49/seat.
          Add-on credits from $1,000/yr. <a href="/signup?plan=enterprise">Talk to sales</a>.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------
function Testimonials() {
  const quotes = [
    {
      text: "We went from 200 manual emails per week to 2,400 AI-drafted, human-reviewed sends. Our meeting rate went from 1.2% to 4.7%. The approval gate was the thing that sold me — I trust every email that goes out because I personally reviewed it.",
      name: "Alex Rodriguez",
      role: "VP of Sales",
      company: "NorthPoint Capital",
      initials: "AR",
    },
    {
      text: "The Campaign Leader architecture is what makes Veldo different. It blocks low-confidence work before it becomes a bad email. No other tool has that intelligence layer — it's not just a drafting assistant, it's an operating system.",
      name: "Marcus Williams",
      role: "Head of Revenue",
      company: "Stackpath",
      initials: "MW",
    },
    {
      text: "Veldo's research and ICP scoring uncovered a whole segment we were ignoring. The learning loop surfaced that our best replies came from mid-market fintech CTOs — something we never would have noticed manually across 2,000 sends.",
      name: "Sarah Chen",
      role: "Founder",
      company: "Meridian Analytics",
      initials: "SC",
    },
  ];

  return (
    <section className="landing-testimonials">
      <div className="landing-section-inner">
        <div className="landing-section-label">
          <span className="premium-eyebrow">What teams say</span>
        </div>
        <h2 className="landing-section-title">
          Revenue teams trust the gates, not just the drafts
        </h2>
        <div className="landing-testimonials-grid">
          {quotes.map((q) => (
            <figure className="landing-testimonial" key={q.name}>
              <blockquote>
                <p>"{q.text}"</p>
              </blockquote>
              <figcaption className="landing-testimonial-author">
                <div className="landing-testimonial-avatar">{q.initials}</div>
                <div>
                  <strong>{q.name}</strong>
                  <span>
                    {q.role} · {q.company}
                  </span>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
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
        <h2>Deploy your AI sales team today</h2>
        <p>
          Onboard in minutes — describe your ICP and Veldo researches, drafts, gates, and queues
          your first campaign while you watch. Book a walkthrough or start your workspace now.
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
          {["No email sends without approval", "Cancel anytime", "GDPR compliant"].map(
            (item) => (
              <span key={item}>
                <ShieldCheck size={12} /> {item}
              </span>
            )
          )}
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
          <p>AI Sales Team OS — research, draft, gate, send, and learn from one platform.</p>
        </div>
        <div className="landing-footer-links-group">
          <div className="landing-footer-col">
            <strong>Product</strong>
            <a href="/pricing">Pricing</a>
            <a href="#how-it-works">How it works</a>
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
            <strong>Compliance</strong>
            <a href="/unsubscribe">Unsubscribe</a>
          </div>
        </div>
      </div>
      <div className="landing-footer-bottom">
        <span>© {new Date().getFullYear()} Veldo. All rights reserved.</span>
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
      <Testimonials />
      <FinalCta />
      <Footer />
    </main>
  );
}
