import { FileText, Pause, Play, Plus, Search, Send, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { listSalesCampaigns, type SalesCampaignStatus } from "@/lib/sales/campaigns-data";
import styles from "./campaigns.module.css";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "running", label: "Running" },
  { key: "paused", label: "Paused" },
  { key: "completed", label: "Completed" },
];

const STATUS_META: Record<SalesCampaignStatus, { label: string; cls: string; icon: typeof Play }> = {
  draft: { label: "Draft", cls: "stDraft", icon: FileText },
  running: { label: "Running", cls: "stRunning", icon: Play },
  paused: { label: "Paused", cls: "stPaused", icon: Pause },
  completed: { label: "Completed", cls: "stDone", icon: Send },
};

export default async function SalesCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "all";
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";

  const all = await listSalesCampaigns(user.id);
  const campaigns = all.filter(
    (c) => (status === "all" || c.status === status) && (!q || c.name.toLowerCase().includes(q) || c.audienceSummary.toLowerCase().includes(q))
  );

  return (
    <div className={`premium-content content ${styles.wrap}`}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>
            Sales <span className={styles.titleGrad}>Campaigns</span>
          </h1>
          <p className={styles.sub}>
            Your outbound engine — Veldo AI writes and sends every touch, you approve every launch.
          </p>
        </div>
        <div className={styles.headActions}>
          <a className={styles.primary} href="/sales/campaigns/new">
            <Plus size={14} /> New campaign
          </a>
        </div>
      </div>

      <div className={styles.toolbar}>
        <form className={styles.search} method="get" action="/sales/campaigns">
          <Search size={13} />
          <input name="q" defaultValue={q} placeholder="Search campaigns…" aria-label="Search campaigns" />
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
        </form>
        <nav className={styles.pills} aria-label="Filter by status">
          {FILTERS.map((f) => (
            <a
              key={f.key}
              className={`${styles.pillLink} ${status === f.key ? styles.pillActive : ""}`}
              href={`/sales/campaigns?status=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            >
              {f.label}
            </a>
          ))}
        </nav>
      </div>

      {campaigns.length === 0 ? (
        <div className={styles.empty}>
          <h3>{all.length === 0 ? "No campaigns yet" : "Nothing matches that filter"}</h3>
          <p>
            {all.length === 0
              ? "Stage an audience, set the sequence, and approve the launch card — Veldo AI handles the rest."
              : "Clear the search or pick a different status."}
          </p>
          <a className={styles.primary} href="/sales/campaigns/new">
            <Sparkles size={14} /> Build your first campaign
          </a>
        </div>
      ) : (
        <div className={styles.list}>
          {campaigns.map((c, i) => {
            const meta = STATUS_META[c.status];
            const Icon = meta.icon;
            const total = c.sent + c.queued;
            const pct = total ? Math.round((c.sent / total) * 100) : 0;
            return (
              <a className={styles.rowCard} key={c.id} href={`/sales/campaigns/${c.id}`} style={{ animationDelay: `${i * 45}ms` }}>
                <div>
                  <div className={styles.cName}>{c.name}</div>
                  <div className={styles.cMeta}>
                    {c.contacts} contact{c.contacts === 1 ? "" : "s"} · {c.audienceSummary} · {c.steps}-step email
                  </div>
                </div>
                <span className={`${styles.pill} ${styles[meta.cls]}`}>
                  <Icon size={11} /> {meta.label}
                </span>
                <div className={styles.progress}>
                  <div className={styles.pTrack}>
                    <div className={styles.pBar} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={styles.pLabel}>
                    {c.sent} sent / {total || c.contacts} planned
                  </span>
                </div>
                <div className={styles.cNum}>
                  {c.replies}
                  <small>replies</small>
                </div>
                <div className={styles.cNum}>
                  {c.positive}
                  <small>positive</small>
                </div>
                <div className={styles.cNum}>
                  {c.creditsSpent.toLocaleString()}
                  <small>credits</small>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
