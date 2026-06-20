import { ArrowRight, Building2, CheckCircle2, LockKeyhole, Mail, ShieldCheck, UserCircle } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { signUpAction } from "@/app/auth-actions";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="auth-root">
      <a className="auth-brand" href="/"><BrandMark /><strong>Veldo</strong><span>AI Sales Team OS</span></a>
      <div className="auth-grid">
        <section className="auth-copy-panel">
          <span className="premium-eyebrow">Create Workspace</span>
          <h1>Launch with review-first outbound, not risky automation.</h1>
          <p>Veldo coordinates research, ICP scoring, personalization, QA, verification, approvals, sending, follow-ups, and reply learning from one operating system.</p>
          <div className="auth-proof-list">
            {["Campaign decisions are logged", "Validated agent outputs", "Credits deducted after successful sends"].map((item) => (
              <span key={item}><CheckCircle2 size={16} />{item}</span>
            ))}
          </div>
        </section>
        <section className="auth-panel auth-form-panel">
          <div className="auth-tabs"><a href="/login">Sign in</a><a className="active" href="/signup">Sign up</a></div>
          <h1>Create your workspace</h1>
          <p>Start in approval-gated mode. Research, score, draft, verify, then approve before any send.</p>
          {error ? <div className="status failed" style={{ marginBottom: 14 }}>{error}</div> : null}
          <form className="form" action={signUpAction}>
            <AuthInput icon={<UserCircle size={18} />} id="full_name" name="full_name" label="Full name" placeholder="Andrew Carter" />
            <AuthInput icon={<Building2 size={18} />} id="company_name" name="company_name" label="Company" placeholder="Acme Corp" />
            <AuthInput icon={<Mail size={18} />} id="email" name="email" label="Work email" placeholder="name@company.com" type="email" />
            <AuthInput icon={<LockKeyhole size={18} />} id="password" name="password" label="Password" placeholder="Create a password" type="password" />
            <button className="btn primary" type="submit">Create workspace <ArrowRight size={16} /></button>
          </form>
          <div className="auth-security-note">
            <ShieldCheck size={16} />
            <span>Human approval is required before production sends.</span>
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
