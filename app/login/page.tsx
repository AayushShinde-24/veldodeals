import { ArrowRight, CheckCircle2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { isDemoMode } from "@/lib/demo/mode";
import { signInAction } from "@/app/auth-actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const demo = isDemoMode();
  return (
    <AuthLayout active="login" title="Welcome back" subtitle="Sign in to continue to your Veldo workspace." error={error}>
      <GoogleAuthButton demo={demo} next="/dashboard" />
      <div className="auth-divider"><span>or</span></div>
      <form className="form" action={signInAction}>
        <AuthInput icon={<Mail size={18} />} id="email" name="email" label="Work email" placeholder="name@company.com" type="email" />
        <AuthInput icon={<LockKeyhole size={18} />} id="password" name="password" label="Password" placeholder="Enter your password" type="password" />
        <button className="btn primary" type="submit">Continue with email <ArrowRight size={16} /></button>
      </form>
    </AuthLayout>
  );
}

function AuthLayout({ active, title, subtitle, error, children }: { active: "login" | "signup"; title: string; subtitle: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="auth-root">
      <a className="auth-brand" href="/"><BrandMark /><strong>Veldo</strong><span>AI Sales Team OS</span></a>
      <div className="auth-grid">
        <section className="auth-copy-panel">
          <span className="premium-eyebrow">Welcome Back</span>
          <h1>Pick up the campaign where your agents left off.</h1>
          <p>Review drafts, inspect gates, send approved emails, and keep the Campaign Leader in control of every risky step.</p>
          <div className="auth-proof-list">
            {["Drafts stay approval-gated", "Research and decisions are persisted", "Sending requires valid gates"].map((item) => (
              <span key={item}><CheckCircle2 size={16} />{item}</span>
            ))}
          </div>
        </section>
        <section className="auth-panel auth-form-panel">
          <div className="auth-tabs"><a className={active === "login" ? "active" : ""} href="/login">Sign in</a><a className={active === "signup" ? "active" : ""} href="/signup">Sign up</a></div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {error ? <div className="status failed" style={{ marginBottom: 14 }}>{error}</div> : null}
          {children}
          <div className="auth-security-note">
            <ShieldCheck size={16} />
            <span>Your data is encrypted. We never sell it.</span>
          </div>
        </section>
      </div>
    </div>
  );
}

function AuthInput({ icon, id, name, label, placeholder, type = "text" }: { icon: React.ReactNode; id: string; name: string; label: string; placeholder: string; type?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="control auth-input-control">
        {icon}
        <input id={id} name={name} type={type} required placeholder={placeholder} suppressHydrationWarning />
      </div>
    </div>
  );
}
