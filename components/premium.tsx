import type { LucideIcon } from "lucide-react";
export { StatusPill } from "@/components/status-pill";

// Page-level shell — wraps all authenticated page content
export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`premium-content content${className ? ` ${className}` : ""}`}>{children}</div>;
}

// Page header with eyebrow, title, description, and optional action buttons
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const right = actions ?? action;
  return (
    <div className="premium-page-head">
      <div>
        {eyebrow && <span className="premium-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {right && <div className="premium-actions">{right}</div>}
    </div>
  );
}

// Card section header with optional description and actions
export function SectionHeader({
  title,
  description,
  actions,
  action,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const right = actions ?? action;
  return (
    <div className="premium-section-head">
      <div>
        <h2 className="card-title">{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

// Glassmorphic card wrapper
export function GlassCard({
  children,
  glow,
  className,
  style,
}: {
  children: React.ReactNode;
  glow?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`premium-card${glow ? " glow" : ""}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

// Metric card with icon, label, value, and trend
export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  tone?: "blue" | "cyan" | "green" | "violet" | "orange" | "red";
}) {
  const toneClass = tone ? `tone-${tone}` : "tone-blue";
  return (
    <div className="premium-card premium-metric">
      <div className="premium-metric-top">
        <div>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
        <div className={`premium-icon ${toneClass}`}>
          <Icon size={20} />
        </div>
      </div>
      {trend && <p>{trend}</p>}
    </div>
  );
}

// Data table with headers, rows, and optional empty state
export function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
  empty?: React.ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table className="table premium-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length}>{empty ?? <EmptyState title="No data" />}</td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Empty state placeholder with icon, title, description, and optional CTA
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  error,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div className={`premium-empty${error ? " error" : ""}`}>
      {Icon && (
        <div className="premium-empty-icon">
          <Icon size={22} />
        </div>
      )}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

// Bar chart — values are pixel heights
export function Bars({ values, labels }: { values: number[]; labels?: string[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="premium-bars">
      {values.map((v, i) => (
        <span
          key={i}
          style={{ height: `${Math.max(12, Math.round((v / max) * 190))}px` }}
          title={labels?.[i] ?? String(v)}
        />
      ))}
    </div>
  );
}

// Inline spinner
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// Simple tag/badge
export function Badge({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: "blue" | "green" | "violet" | "orange" | "red" | "cyan";
}) {
  return <span className={`premium-badge tone-${tone}`}>{children}</span>;
}

// Horizontal progress bar
export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <span className="premium-progress">
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}

// Thin inline progress line (used inside log-line rows)
export function ProgressLine({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <span className="premium-progress" style={{ height: 5 }}>
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}

// Error state (red variant of EmptyState)
export function ErrorState({ message, icon: Icon }: { message: string; icon?: LucideIcon }) {
  return (
    <div className="premium-empty error" style={{ border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)" }}>
      <div className="premium-empty-icon">
        {Icon ? <Icon size={22} /> : (
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <circle cx={12} cy={12} r={10} />
            <line x1={12} y1={8} x2={12} y2={12} />
            <line x1={12} y1={16} x2={12.01} y2={16} />
          </svg>
        )}
      </div>
      <h3 style={{ color: "#fca5a5" }}>Something went wrong</h3>
      <p>{message}</p>
    </div>
  );
}

// Mini pipeline list (used in dashboard campaign leader section)
export function PipelineMini({
  items,
}: {
  items: Array<{ label: string; status: React.ReactNode }>;
}) {
  return (
    <div className="premium-list">
      {items.map((item, i) => (
        <div className="premium-list-row" key={i}>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
          {item.status}
        </div>
      ))}
    </div>
  );
}

// Settings list — renders a vertical list of setting rows with label, description, and optional action
export function SettingsList({
  items,
}: {
  items: Array<{
    label: string;
    description?: string;
    value?: React.ReactNode;
    action?: React.ReactNode;
  }>;
}) {
  return (
    <div className="premium-list">
      {items.map((item, i) => (
        <div
          className="premium-list-row"
          key={i}
          style={{ alignItems: "flex-start", padding: "14px 20px", gap: 16 }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{item.label}</div>
            {item.description && (
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{item.description}</div>
            )}
          </div>
          {item.value && <div style={{ fontSize: 13 }}>{item.value}</div>}
          {item.action && <div style={{ flexShrink: 0 }}>{item.action}</div>}
        </div>
      ))}
    </div>
  );
}
