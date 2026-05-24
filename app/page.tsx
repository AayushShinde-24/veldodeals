import { ArrowRight, Bot, CheckCircle2, KeyRound, MailCheck, ShieldCheck, Target } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export default function HomePage() {
  return (
    <main className="landing-root">
      <nav className="landing-nav" aria-label="Landing navigation">
        <a className="landing-brand" href="/">
          <BrandMark />
          <span>Veldo</span>
        </a>
        <div className="landing-auth">
          <a className="btn" href="/login">Sign in</a>
          <a className="btn primary" href="/signup">Sign up <ArrowRight size={16} /></a>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <span className="premium-eyebrow">AI Sales Team OS</span>
          <h1>Veldo</h1>
          <p className="landing-lede">A coordinated AI sales team for research, ICP scoring, personalization, email drafting, QA, approval gates, sending, follow-ups, and reply learning.</p>
          <div className="landing-actions">
            <a className="btn primary" href="/signup">Create workspace <ArrowRight size={16} /></a>
            <a className="btn" href="/login">Sign in</a>
          </div>
          <div className="landing-trust">
            {["Campaign Leader controlled", "Human approval before sends", "Server-side API keys"].map((item) => (
              <span key={item}><CheckCircle2 size={15} /> {item}</span>
            ))}
          </div>
        </div>
        <div className="landing-hero-panel">
          <div className="landing-preview-frame" aria-label="Veldo dashboard preview">
            <img src="/veldo-ui-screenshots/03-dashboard.png" alt="Veldo dashboard showing outbound performance" />
          </div>
          <div className="landing-signal" aria-label="Veldo operating flow">
            <div className="landing-signal-head">
              <span>Campaign flow</span>
              <strong>From target to reviewed send</strong>
            </div>
            {[
              ["01", "Research", "Company pages and public signals"],
              ["02", "Draft", "Personalized emails with assumptions"],
              ["03", "Gate", "Score, verify, approve, and check credits"],
              ["04", "Learn", "Replies and conversion rate feed the dashboard"],
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

      <section className="landing-band">
        {[
          { icon: Target, title: "Campaign Leader", text: "Routes agents, checks confidence, and pauses weak work." },
          { icon: Bot, title: "Specialist Agents", text: "Research, signals, strategy, writing, scoring, and replies stay separated." },
          { icon: ShieldCheck, title: "Send Gates", text: "Every email must pass ICP, research, risk, score, verification, approval, and credits." },
          { icon: MailCheck, title: "Visible Process", text: "Drafting, sending, sent, follow-up, and reply stages stay visible." },
          { icon: KeyRound, title: "Secure APIs", text: "API keys are server-side, hashed, and shown once at creation." },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article className="landing-feature" key={item.title}>
              <Icon size={20} />
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
