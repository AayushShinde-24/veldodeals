import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, ArrowRight, Inbox, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "blue" | "violet" | "cyan" | "green" | "orange" | "red" | "muted";

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("content premium-content", className)}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="premium-page-head">
      <div>
        {eyebrow ? <span className="premium-eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="premium-actions">{actions}</div> : null}
    </header>
  );
}

export function GlassCard({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <section className={cn("premium-card", className)} style={style}>
      {children}
    </section>
  );
}

export function MetricCard({ icon: Icon, label, value, trend, tone = "blue" }: { icon?: LucideIcon; label: string; value: ReactNode; trend?: ReactNode; tone?: Tone }) {
  return (
    <GlassCard className="premium-metric">
      <div className="premium-metric-top">
        <div>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
        {Icon ? (
          <span className={cn("premium-icon", `tone-${tone}`)}>
            <Icon size={20} />
          </span>
        ) : null}
      </div>
      {trend ? <p>{trend}</p> : null}
      <Sparkline tone={tone} />
    </GlassCard>
  );
}

export function Badge({ children, tone = "muted", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn("premium-badge", `tone-${tone}`, className)}>{children}</span>;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: { icon?: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="premium-empty">
      <span className="premium-empty-icon">
        <Icon size={22} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="premium-actions">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="premium-empty error">
      <span className="premium-empty-icon">
        <AlertCircle size={22} />
      </span>
      <h3>Could not load this view</h3>
      <p>{message}</p>
    </div>
  );
}

export function SearchBox({ label = "Search anything..." }: { label?: string }) {
  return (
    <div className="premium-search">
      <Search size={17} />
      <span>{label}</span>
      <kbd>Ctrl K</kbd>
    </div>
  );
}

export function DataTable({ headers, rows, empty }: { headers: string[]; rows: ReactNode[][]; empty: ReactNode }) {
  if (!rows.length) return <>{empty}</>;
  return (
    <div className="table-wrap">
      <table className="table premium-table">
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="premium-section-head">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ProgressLine({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return <span className="premium-progress"><span style={{ width: `${clamped}%` }} /></span>;
}

export function Bars({ values }: { values: number[] }) {
  return (
    <div className="premium-bars">
      {values.map((value, index) => <span key={`${value}-${index}`} style={{ height: `${Math.max(8, value)}%` }} />)}
    </div>
  );
}

export function PipelineMini({ items }: { items: Array<{ label: string; status: ReactNode }> }) {
  return (
    <div className="premium-pipeline">
      {items.map((item, index) => (
        <div className="premium-pipeline-step" key={item.label}>
          <span>{index + 1}</span>
          <strong>{item.label}</strong>
          {item.status}
        </div>
      ))}
    </div>
  );
}

export function SettingsList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <div className="premium-list">
      {items.map((item) => (
        <div className="premium-list-row" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="premium-arrow-link" href={href}>
      {children}
      <ArrowRight size={15} />
    </a>
  );
}

function Sparkline({ tone = "blue" }: { tone?: Tone }) {
  const color = tone === "cyan" ? "#22d3ee" : tone === "violet" ? "#8b5cf6" : tone === "green" ? "#22c55e" : "#3b82f6";
  return (
    <svg className="premium-spark" viewBox="0 0 112 44" aria-hidden="true">
      <path d="M2 35 C15 32 18 34 28 29 S43 25 50 26 61 16 67 22 78 34 84 12 98 31 110 8" fill="none" stroke={color} strokeWidth="2.4" />
      <path d="M2 44 C22 41 42 38 56 32 S82 23 110 13 L110 44 Z" fill={color} opacity=".16" />
    </svg>
  );
}
