import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { PricingClient } from "./pricing-client";
import { getCurrentUser } from "@/lib/auth/server";
import styles from "./pricing.module.css";

export const metadata: Metadata = {
  title: "Pricing — Veldo",
  description:
    "Veldo pricing across Solo, Team, and Enterprise tiers. One credit model for sales, fundraising, and marketing.",
};

// Resolve the signed-in user's current plan + balance so the storefront can show
// "you are here". Every account starts on Free and moves up as they purchase — so a
// missing/unknown plan resolves to Free (never hard-coded to a paid plan). Logged-out
// visitors get null (no current-plan panel).
async function getCurrentPlan(): Promise<{ planKey: string | null; credits: number | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { planKey: null, credits: null };
    const { isDemoMode } = await import("@/lib/demo/mode");
    if (isDemoMode()) {
      // Demo represents a fresh account so the "starts on Free" flow is visible.
      return { planKey: "free", credits: 100 };
    }
    const { createServiceClient } = await import("@/lib/integrations/supabase");
    const db = createServiceClient();
    const { data } = await db.from("profiles").select("plan,credits_balance").eq("id", user.id).maybeSingle();
    const key = (data?.plan ?? "").replace(/_/g, "-") || "free";
    return { planKey: key, credits: data?.credits_balance ?? 100 };
  } catch {
    return { planKey: "free", credits: 100 };
  }
}

export default async function PricingPage() {
  const current = await getCurrentPlan();
  return (
    <div className={styles.page}>
      <div className={styles.orbs} aria-hidden="true">
        <div className={`${styles.orb} ${styles.orb1}`} />
        <div className={`${styles.orb} ${styles.orb2}`} />
        <div className={`${styles.orb} ${styles.orb3}`} />
      </div>

      <nav className="marketing-nav" style={{ position: "relative", zIndex: 2 }}>
        <a className="brand" href="/"><BrandMark /><span>Veldo</span></a>
        <div className="marketing-links"><a href="/">Product</a><strong>Pricing</strong><a href="/security">Security</a></div>
        <div className="premium-actions">
          <a className="btn" href="/login">Sign in</a>
          <a className="btn primary" href="/signup">Start free trial <ArrowRight size={16} /></a>
        </div>
      </nav>

      <PricingClient currentPlanKey={current.planKey} currentCredits={current.credits} />
    </div>
  );
}
