import { ArrowRight, CheckCircle2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { isDemoMode } from "@/lib/demo/mode";
import { signUpAction } from "@/app/auth-actions";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const demo = isDemoMode();
  return (
    <div className="auth-root">
      <a className="auth-brand" href="/"><BrandMark /><strong>Veldo</strong><span>AI Sales Team OS</span></a>
      <div className="auth-grid">
        <section className="auth-copy-panel">
          <span className="premium-eyebrow">Create Workspace</span>
          <h1>Your autonomous revenue team, set up in minutes.</h1>
          <p>Veldo coordinates research, ICP scoring, personalization, QA, verification, sending, follow-ups, and reply learning from one operating system — at the autonomy level you choose.</p>
          <div className="auth-proof-list">
            {["Pick your autonomy in one click", "Every decision is logged", "Credits only spent on real work"].map((item) => (
              <span key={item}><CheckCircle2 size={16} />{item}</span>
            ))}
          </div>
        </section>
        <section className="auth-panel auth-form-panel">
          <div className="auth-tabs"><a href="/login">Sign in</a><a className="active" href="/signup">Sign up</a></div>
          <h1>Create your account</h1>
          <p>Two ways in — no passwords to remember if you use Google.</p>
          {error ? <div className="status failed" style={{ marginBottom: 14 }}>{error}</div> : null}
          <GoogleAuthButton demo={demo} next="/onboarding" />
          <div className="auth-divider"><span>or</span></div>
          <form className="form" action={signUpAction}>
            <AuthInput icon={<Mail size={18} />} id="email" name="email" label="Work email" placeholder="name@company.com" type="email" />
            <AuthInput icon={<LockKeyhole size={18} />} id="password" name="password" label="Password" placeholder="Create a password" type="password" />
            <button className="btn primary" type="submit">Continue with email <ArrowRight size={16} /></button>
          </form>
          <div className="auth-security-note">
            <ShieldCheck size={16} />
            <span>Your data is encrypted and stored securely.</span>
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
