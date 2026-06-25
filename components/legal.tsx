import { ArrowLeft, ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import styles from "./legal.module.css";

export interface LegalSection {
  id: string;
  heading: string;
}

export function LegalLayout({
  title,
  updated,
  intro,
  sections,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
  children: React.ReactNode;
}) {
  return (
    <div className={styles.root}>
      <nav className="marketing-nav" style={{ position: "relative", zIndex: 2 }}>
        <a className="brand" href="/"><BrandMark /><span>Veldo</span></a>
        <div className="marketing-links">
          <a href="/">Home</a>
          <a href="/pricing">Pricing</a>
          <a href="/security">Security</a>
        </div>
        <div className="premium-actions">
          <a className="btn" href="/login">Sign in</a>
          <a className="btn primary" href="/signup">Get started <ArrowRight size={15} /></a>
        </div>
      </nav>

      <main className={styles.main}>
        <a className={styles.back} href="/"><ArrowLeft size={14} /> Back to home</a>

        <span className={styles.eyebrow}>Legal</span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Last updated {updated}</p>

        <p className={styles.intro}>{intro}</p>

        <nav className={styles.toc} aria-label="Table of contents">
          <div className={styles.tocTitle}>On this page</div>
          <div className={styles.tocList}>
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`}>{s.heading}</a>
            ))}
          </div>
        </nav>

        <article className={styles.article}>{children}</article>

        <div className={styles.footer}>
          <span>© {new Date().getFullYear()} Veldo, Inc. All rights reserved.</span>
          <div className={styles.footerLinks}>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/acceptable-use">Acceptable Use</a>
            <a href="/data-deletion">Data Deletion</a>
            <a href="/security">Security</a>
          </div>
        </div>
      </main>
    </div>
  );
}
