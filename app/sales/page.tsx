import {
  ArrowUpRight, Calendar, CheckCircle2, Coins, FileText, Handshake, Lightbulb, Mail,
  MessageSquare, Pause, PhoneCall, Rocket, Sparkles, Upload,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getDashboardData, getOperationalData, type LedgerRow } from "@/lib/ui/data";
import { listSalesCampaigns, type SalesCampaignListItem } from "@/lib/sales/campaigns-data";
import styles from "./sales.module.css";

export const dynamic = "force-dynamic";

const RANGES = [
  { key: "7", label: "7d" },
  { key: "30", label: "30d" },
  { key: "90", label: "90d" },
];

// Sales Overview — the pillar's pulse. Owns the pillar numbers: every figure is
// computed server-side from live workspace rows for the selected range, and
// every widget deep-links into the tab that owns the underlying work.
export default async function SalesOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const rangeDays = sp.range === "7" ? 7 : sp.range === "90" ? 90 : 30;
  const cutoff = Date.now() - rangeDays * 86_400_000;
  const prevCutoff = cutoff - rangeDays * 86_400_000;
  const inRange = (iso: string | null | undefined) => !!iso && new Date(iso).getTime() >= cutoff;
  const inPrevRange = (iso: string | null | undefined) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= prevCutoff && t < cutoff;
  };

  const [data, ops, campaignList] = await Promise.all([
    getDashboardData(user.id),
    getOperationalData(user.id),
    listSalesCampaigns(user.id),
  ]);

  const deals = ops?.deals ?? [];
  const allReplies = (ops?.replies?.length ? ops.replies : ops?.canonicalReplies) ?? [];
  const callTasks = (ops?.callTasks ?? []).filter((c) => inRange(c.created_at));
  const ledger = ops?.ledger ?? [];
  const allSends = ops?.emailSends?.length ? ops.emailSends : data.sends;

  const sends = allSends.filter((s) => inRange(s.created_at));
  const replies = allReplies.filter((r) => inRange(r.created_at));
  const meetings = data.meetings.filter((m) => inRange(m.created_at));
  const rangeLedger = ledger.filter((l) => inRange(l.created_at));

  const pipelineValue = deals.filter((d) => d.stage !== "lost").reduce((sum, d) => sum + Number(d.amount ?? d.value ?? 0), 0);
  const sentCount = sends.filter((s) => s.status === "sent").length;
  const replyRate = sentCount ? Math.round((replies.length / sentCount) * 100) : 0;
  const credits = data.user?.credits_balance ?? 0;
  const creditsSpent = rangeLedger.filter((l) => l.credit_change < 0).reduce((sum, l) => sum + Math.abs(l.credit_change), 0);

  const isPositive = (r: { classification?: string | null; reply_class?: string | null; sentiment?: string | null }) =>
    /positive|interested/i.test(String(r.classification ?? r.reply_class ?? r.sentiment ?? ""));
  const warmReplies = replies.filter(isPositive);
  const warmWaiting = Math.max(0, warmReplies.length - meetings.length);

  const kpis = [
    { label: "Pipeline value", value: fmtMoney(pipelineValue), icon: Handshake, accent: "#3b82f6", href: "/crm", spark: seriesFrom(deals.map((d) => Number(d.amount ?? d.value ?? 0))) },
    { label: "Emails sent", value: String(sentCount), icon: Mail, accent: "#22d3ee", href: "/sales/campaigns", spark: dailySeries(sends.map((s) => s.created_at)) },
    { label: "Reply rate", value: `${replyRate}%`, icon: MessageSquare, accent: "#8b5cf6", href: "/inbox", spark: dailySeries(replies.map((r) => r.created_at)) },
    { label: "Calls queued", value: String(callTasks.length), icon: PhoneCall, accent: "#22d3ee", href: "/inbox", spark: dailySeries(callTasks.map((c) => c.created_at)) },
    { label: "Meetings", value: String(meetings.length), icon: Calendar, accent: "#4ade80", href: "/sales/meetings", spark: dailySeries(meetings.map((m) => m.created_at)) },
    { label: "Credits left", value: credits.toLocaleString(), icon: Coins, accent: "#f6c453", href: "/settings/usage", spark: seriesFrom(ledger.map((l) => l.new_balance).reverse()) },
  ];

  const funnel = buildFunnel({
    sourced: data.leads.length,
    contacted: sentCount,
    replied: replies.length,
    qualified: warmReplies.length,
    meeting: meetings.length,
    won: deals.filter((d) => d.stage === "won").length,
  });

  const needsYou = buildNeedsYou({ campaigns: campaignList, warmWaiting, credits });
  const activeCampaigns = campaignList.filter((c) => c.status !== "completed").slice(0, 5);
  const insights = buildInsights({
    currSent: sentCount,
    currReplies: replies.length,
    prevSent: allSends.filter((s) => inPrevRange(s.created_at)).length,
    prevReplies: allReplies.filter((r) => inPrevRange(r.created_at)).length,
    replyTimestamps: replies.map((r) => r.created_at),
    warmWaiting,
    rangeDays,
  });
  const firstRun = campaignList.length === 0 && data.leads.length === 0;

  return (
    <div className={`premium-content content ${styles.wrap}`}>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>
            Sales <span className={styles.titleGrad}>Engine</span>
          </h1>
          <p className={styles.sub}>
            Vel finds your buyers, writes, calls, and books the meetings — you approve. Live pipeline across{" "}
            {campaignList.length} campaign{campaignList.length === 1 ? "" : "s"} and {data.leads.length} leads.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primary} href="/sales/campaigns/new">
              <Sparkles size={14} /> New campaign
            </a>
            <a className={styles.ghost} href="/crm">
              Open pipeline
            </a>
            <nav className={styles.rangeNav} aria-label="Date range">
              {RANGES.map((r) => (
                <a key={r.key} className={`${styles.rangeLink} ${String(rangeDays) === r.key ? styles.rangeOn : ""}`} href={`/sales?range=${r.key}`}>
                  {r.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <aside className={styles.reco}>
          <div className={styles.recoHead}>
            <span>
              <Sparkles size={14} /> Vel recommends
            </span>
            <i>LIVE</i>
          </div>
          {warmWaiting > 0 ? (
            <>
              <p>
                {warmWaiting} warm {warmWaiting === 1 ? "reply hasn't" : "replies haven't"} been turned into a meeting yet. Review
                them and let me propose times.
              </p>
              <div className={styles.recoStats}>
                <span>
                  Reply rate <b>{replyRate}%</b>
                </span>
                <span>
                  Pipeline <b>{fmtMoney(pipelineValue)}</b>
                </span>
              </div>
              <a className={styles.recoBtn} href="/sales/meetings">
                Review & book <ArrowUpRight size={13} />
              </a>
            </>
          ) : (
            <>
              <p>Pipeline is quiet. Launch a campaign and I&apos;ll start filling it.</p>
              <a className={styles.recoBtn} href="/sales/campaigns/new">
                Plan a campaign <ArrowUpRight size={13} />
              </a>
            </>
          )}
        </aside>
      </section>

      {firstRun ? (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span>Get your first meeting booked</span>
            <span className={styles.tag}>3 steps</span>
          </div>
          <div className={styles.checklist}>
            <a className={styles.checkItem} href="/leads/import">
              <span className={styles.checkNum}>1</span>
              <span>
                Stage contacts<small>Import a list, or source them with Veldo AI inside the campaign builder.</small>
              </span>
              <Upload size={14} />
            </a>
            <a className={styles.checkItem} href="/sales/campaigns/new">
              <span className={styles.checkNum}>2</span>
              <span>
                Build a campaign<small>Pick the audience, set the sequence goals — Veldo AI writes every email.</small>
              </span>
              <Mail size={14} />
            </a>
            <a className={styles.checkItem} href="/sales/campaigns">
              <span className={styles.checkNum}>3</span>
              <span>
                Approve the launch card<small>See the credit cost and estimated results, then approve. Nothing sends before that.</small>
              </span>
              <Rocket size={14} />
            </a>
          </div>
        </section>
      ) : (
        <>
          <section className={styles.kpis}>
            {kpis.map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <a className={styles.kpi} key={kpi.label} href={kpi.href} style={{ "--accent": kpi.accent, animationDelay: `${i * 60}ms` } as React.CSSProperties}>
                  <div className={styles.kpiTop}>
                    <span className={styles.kpiIcon}>
                      <Icon size={13} />
                    </span>
                    <span className={styles.kpiLabel}>{kpi.label}</span>
                  </div>
                  <div className={styles.kpiValue}>{kpi.value}</div>
                  <div className={styles.kpiSpark}>
                    <Sparkline points={kpi.spark} />
                  </div>
                </a>
              );
            })}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHead}>
              <span>Funnel — last {rangeDays} days</span>
              <a className={styles.viewLink} href="/crm">
                Open pipeline
              </a>
            </div>
            <div className={styles.funnelWide}>
              {funnel.map((stage, i) => (
                <div className={styles.fwStage} key={stage.label}>
                  {i > 0 && <span className={styles.fwConv}>{stage.conv}%</span>}
                  <div className={`${styles.fwBox} ${stage.won ? styles.fwWon : ""}`}>
                    <b>{stage.count}</b>
                    <span>{stage.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.splitRow}>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <span>Needs you</span>
                <span className={styles.tag}>
                  {needsYou.length} item{needsYou.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className={styles.feed}>
                {needsYou.length ? (
                  needsYou.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div className={styles.fItem} key={item.key} style={{ "--accent": item.accent, animationDelay: `${i * 50}ms` } as React.CSSProperties}>
                        <span className={styles.fIcon}>
                          <Icon size={13} />
                        </span>
                        <span className={styles.fText}>
                          {item.title}
                          <small>{item.detail}</small>
                        </span>
                        <a className={styles.actBtn} href={item.href}>
                          {item.cta}
                        </a>
                      </div>
                    );
                  })
                ) : (
                  <p className={styles.tag}>
                    <CheckCircle2 size={12} style={{ verticalAlign: -2 }} /> All clear — Veldo AI is handling everything that doesn&apos;t need
                    your sign-off.
                  </p>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHead}>
                <span>Active campaigns</span>
                <a className={styles.viewLink} href="/sales/campaigns">
                  All campaigns
                </a>
              </div>
              <div className={styles.feed}>
                {activeCampaigns.length ? (
                  activeCampaigns.map((c) => {
                    const total = c.sent + c.queued;
                    const pct = total ? Math.round((c.sent / total) * 100) : 0;
                    return (
                      <a className={styles.railItem} key={c.id} href={`/sales/campaigns/${c.id}`}>
                        <span className={styles.railTop}>
                          <b>{c.name}</b>
                          <i className={`${styles.railPill} ${styles[`rp_${c.status}`] ?? ""}`}>{railLabel(c.status)}</i>
                        </span>
                        <span className={styles.railTrack}>
                          <span className={styles.railBar} style={{ width: `${pct}%` }} />
                        </span>
                        <small>
                          {c.sent}/{total || c.contacts} sent · {c.replies} replies · {c.creditsSpent.toLocaleString()} credits
                        </small>
                      </a>
                    );
                  })
                ) : (
                  <p className={styles.tag}>
                    No active campaigns.{" "}
                    <a className={styles.viewLink} href="/sales/campaigns/new">
                      Launch one →
                    </a>
                  </p>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHead}>
                <span>Credit burn</span>
                <span className={styles.tag}>{creditsSpent.toLocaleString()} spent · {rangeDays}d</span>
              </div>
              <div className={styles.burn}>
                {burnByDay(rangeLedger).map((day) => (
                  <div className={styles.bCol} key={day.label}>
                    <span className={styles.bVal}>{day.spent || ""}</span>
                    <div className={styles.bBar} style={{ height: `${day.pct}%` }} />
                    <span className={styles.bLabel}>{day.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {insights.length > 0 && (
            <section className={styles.insights}>
              {insights.map((text, i) => (
                <div className={styles.insight} key={i} style={{ animationDelay: `${i * 80}ms` }}>
                  <Lightbulb size={13} /> {text}
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ── data shaping ──────────────────────────────────────────────────────────

function fmtMoney(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}

function dailySeries(timestamps: string[]): number[] {
  const days = Array.from({ length: 7 }, () => 0);
  const now = Date.now();
  for (const ts of timestamps) {
    const age = Math.floor((now - new Date(ts).getTime()) / 86_400_000);
    if (age >= 0 && age < 7) days[6 - age] += 1;
  }
  return days;
}

function seriesFrom(values: number[]): number[] {
  if (!values.length) return [0, 0, 0, 0, 0, 0, 0];
  const out = values.slice(-7);
  while (out.length < 7) out.unshift(out[0] ?? 0);
  return out;
}

function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(1, ...points);
  const coords = points.map((v, i) => `${(i / (points.length - 1)) * 100},${20 - (v / max) * 16 - 2}`).join(" ");
  return (
    <svg className={styles.spark} viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={coords} fill="none" stroke="var(--accent, #3b82f6)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

function buildFunnel(counts: { sourced: number; contacted: number; replied: number; qualified: number; meeting: number; won: number }) {
  const seq = [
    { label: "Sourced", count: counts.sourced },
    { label: "Contacted", count: counts.contacted },
    { label: "Replied", count: counts.replied },
    { label: "Positive", count: counts.qualified },
    { label: "Meeting", count: counts.meeting },
    { label: "Won", count: counts.won },
  ];
  return seq.map((stage, i) => ({
    ...stage,
    won: stage.label === "Won",
    conv: i > 0 && seq[i - 1].count > 0 ? Math.round((stage.count / seq[i - 1].count) * 100) : 0,
  }));
}

type NeedsYouItem = {
  key: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
  accent: string;
  icon: typeof Mail;
};

function buildNeedsYou(input: { campaigns: SalesCampaignListItem[]; warmWaiting: number; credits: number }): NeedsYouItem[] {
  const items: NeedsYouItem[] = [];
  for (const c of input.campaigns.filter((c) => c.status === "draft").slice(0, 3)) {
    items.push({
      key: `launch-${c.id}`,
      title: `“${c.name}” is waiting for launch approval`,
      detail: `${c.contacts} contacts staged · ${c.steps}-step sequence · created ${timeAgo(c.createdAt)} ago`,
      href: `/sales/campaigns/${c.id}`,
      cta: "Review launch",
      accent: "#3b82f6",
      icon: FileText,
    });
  }
  if (input.warmWaiting > 0) {
    items.push({
      key: "warm",
      title: `${input.warmWaiting} positive ${input.warmWaiting === 1 ? "reply has" : "replies have"} no follow-up yet`,
      detail: "Turn interest into booked meetings while it's hot.",
      href: "/inbox",
      cta: "Open replies",
      accent: "#8b5cf6",
      icon: MessageSquare,
    });
  }
  for (const c of input.campaigns.filter((c) => c.status === "paused").slice(0, 2)) {
    items.push({
      key: `paused-${c.id}`,
      title: `“${c.name}” is paused`,
      detail: `${c.queued} sends waiting in the queue.`,
      href: `/sales/campaigns/${c.id}`,
      cta: "Resume",
      accent: "#f59e0b",
      icon: Pause,
    });
  }
  if (input.credits < 100) {
    items.push({
      key: "credits",
      title: "Credit balance is running low",
      detail: `${input.credits.toLocaleString()} credits left — campaigns pause automatically at zero.`,
      href: "/settings/billing",
      cta: "Top up",
      accent: "#f6c453",
      icon: Coins,
    });
  }
  return items.slice(0, 6);
}

function buildInsights(input: {
  currSent: number;
  currReplies: number;
  prevSent: number;
  prevReplies: number;
  replyTimestamps: string[];
  warmWaiting: number;
  rangeDays: number;
}): string[] {
  const out: string[] = [];
  const currRate = input.currSent ? input.currReplies / input.currSent : 0;
  const prevRate = input.prevSent ? input.prevReplies / input.prevSent : 0;
  if (input.currSent >= 10 && input.prevSent >= 10) {
    const delta = Math.round((currRate - prevRate) * 100);
    if (Math.abs(delta) >= 2) {
      out.push(
        delta > 0
          ? `Reply rate is up ${delta} points vs the previous ${input.rangeDays} days — the current messaging is landing.`
          : `Reply rate is down ${Math.abs(delta)} points vs the previous ${input.rangeDays} days — consider refreshing the sequence goals.`
      );
    }
  }
  if (input.replyTimestamps.length >= 5) {
    const byDay = new Map<number, number>();
    for (const ts of input.replyTimestamps) {
      const d = new Date(ts).getDay();
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    const best = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    if (best && best[1] >= 2) out.push(`${names[best[0]]} is your best reply day — ${best[1]} of your last ${input.replyTimestamps.length} replies landed then.`);
  }
  if (input.warmWaiting >= 2) {
    out.push(`${input.warmWaiting} warm leads are sitting without a next step — meetings booked within a day of a positive reply convert best.`);
  }
  return out.slice(0, 3);
}

function railLabel(status: SalesCampaignListItem["status"]): string {
  return status === "draft" ? "Awaiting approval" : status === "running" ? "Running" : status === "paused" ? "Paused" : "Done";
}

function burnByDay(ledger: LedgerRow[]) {
  const labels = ["6d", "5d", "4d", "3d", "2d", "1d", "now"];
  const days = Array.from({ length: 7 }, () => 0);
  const now = Date.now();
  for (const row of ledger) {
    if (row.credit_change >= 0) continue;
    const age = Math.floor((now - new Date(row.created_at).getTime()) / 86_400_000);
    if (age >= 0 && age < 7) days[6 - age] += Math.abs(row.credit_change);
  }
  const max = Math.max(1, ...days);
  return days.map((spent, i) => ({
    label: labels[i],
    spent,
    pct: Math.max(spent > 0 ? 8 : 2, Math.round((spent / max) * 100)),
  }));
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
