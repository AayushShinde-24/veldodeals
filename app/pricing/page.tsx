import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { PricingClient } from "./pricing-client";
import styles from "./pricing.module.css";

export const metadata: Metadata = {
  title: "Pricing — Veldo",
  description:
    "Veldo pricing across Solo, Team, and Enterprise tiers. One credit model for sales and fundraising.",
};

export default function PricingPage() {
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

      <PricingClient />
    </div>
  );
}
