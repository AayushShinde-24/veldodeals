import {
  ArrowRight, Building2, Calendar, CheckCircle2, Clock, Database, FileCheck, Handshake,
  MessageSquare, Sparkles, Target, TrendingUp, Users, Wallet, Zap,
} from "lucide-react";
import type { FundraisingData, FrStat, Check, Temp } from "@/lib/ui/fundraising-command";
import styles from "./fundraising.module.css";

function money(n: number): string { return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`; }

const STAT_ICON = [Users, MessageSquare, Calendar, FileCheck, Wallet, TrendingUp];
const STAT_ACCENT = ["#8b5cf6", "#3b82f6", "#22d3ee", "#f59e0b", "#22c55e", "#ec4899"];
const PILLS: { Icon: typeof Zap; t: string; d: string }[] = [
  { Icon: Zap, t: "AI-powered outreach", d: "Personalized at scale" },
  { Icon: Handshake, t: "Smart deal orchestration", d: "From first touch to close" },
  { Icon: Target, t: "Data-driven fundraising", d: "Forecast with confidence" },
];

function StatCard({ s, i }: { s: FrStat; i: number }) {
  const Icon = STAT_ICON[i % STAT_ICON.length];
  const accent = STAT_ACCENT[i % STAT_ACCENT.length];
  return (
    <div className={styles.stat} style={{ ["--accent" as string]: accent, animationDelay: `${i * 60}ms` }}>
      <div className={styles.statTop}><span className={styles.statIcon}><Icon size={14} /></span><span className={styles.statLabel}>{s.label}</span></div>
      <div className={styles.statValue}>{s.value}</div>
      <div className={styles.statDelta}>{s.healthy ? <><CheckCircle2 size={11} /> {s.delta}</> : <><TrendingUp size={11} /> {s.delta} <span>vs last 30 days</span></>}</div>
    </div>
  );
}

function RaiseDonut({ pct }: { pct: number }) {
  const r = 40, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return (
    <svg viewBox="0 0 100 100" className={styles.raiseDonut} aria-hidden="true">
      <defs><linearGradient id="raiseG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#3b82f6" /></linearGradient></defs>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="url(#raiseG)" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 50 50)" style={{ filter: "drop-shadow(0 0 6px rgba(124,58,237,0.7))" }} />
      <text x="50" y="47" textAnchor="middle" className={styles.raisePct}>{pct}%</text>
      <text x="50" y="62" textAnchor="middle" className={styles.raiseSub}>of target</text>
    </svg>
  );
}

function MultiLine({ series }: { series: { data: number[]; color: string }[] }) {
  const w = 320, h = 120;
  const all = series.flatMap((s) => s.data);
  const max = Math.max(...all, 1), min = 0, r = Math.max(1, max - min);
  const path = (data: number[]) => data.map((v, i) => `${i === 0 ? "M" : "L"}${((i / (data.length - 1)) * w).toFixed(1)},${(h - ((v - min) / r) * (h - 10) - 5).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={styles.chart} aria-hidden="true">
      <defs><linearGradient id="frArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity="0.28" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient></defs>
      <path d={`${path(series[0].data)} L${w},${h} L0,${h} Z`} fill="url(#frArea)" />
      {series.map((s, i) => <path key={i} d={path(s.data)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${s.color}88)` }} />)}
    </svg>
  );
}

const BADGE_CLASS: Record<Temp, string> = { Warm: "bWarm", Engaged: "bEngaged", Replied: "bReplied" };
const CHECK_CLASS: Record<Check["status"], string> = { Completed: "cDone", Uploaded: "cDone", "In progress": "cProg", Pending: "cPend" };

export function FundraisingBoard({ data }: { data: FundraisingData }) {
  return (
    <div className={styles.wrap}>
      {/* header */}
      <div className={styles.header}>
        <div className={styles.headMain}>
          <h1 className={styles.title}>Autonomous investor outreach and fundraising operations</h1>
          <p className={styles.sub}>Veldo runs your investor pipeline end-to-end so you can focus on building.</p>
          <div className={styles.pills}>
            {PILLS.map(({ Icon, t, d }) => (
              <div className={styles.pill} key={t}><span className={styles.pillIcon}><Icon size={14} /></span><div><strong>{t}</strong><span>{d}</span></div></div>
            ))}
          </div>
        </div>
        <div className={styles.insight}>
          <div className={styles.insightHead}><Sparkles size={14} /> Veldo insights</div>
          <p>{data.insight}</p>
          <a className={styles.insightLink} href="/analytics">View full analysis <ArrowRight size={13} /></a>
        </div>
      </div>

      {/* stats */}
      <div className={styles.stats}>{data.stats.map((s, i) => <StatCard key={s.label} s={s} i={i} />)}</div>

      {/* row 1 */}
      <div className={styles.row1}>
        <div className={styles.card}>
          <div className={styles.cardHead}><span>Raise progress</span><span className={styles.tag}>Seed Round</span></div>
          <div className={styles.raiseRow}>
            <div className={styles.raiseDonutWrap}><RaiseDonut pct={data.raise.pct} /></div>
            <div className={styles.raiseStats}>
              <div className={styles.rStat}><span>Target raise</span><b>{money(data.raise.target)}</b></div>
              <div className={styles.rStat}><span>Committed</span><b>{money(data.raise.committed)}</b></div>
              <div className={styles.rStat}><span>Soft commitments</span><b>{money(data.raise.soft)}</b></div>
              <div className={styles.rStat}><span>Gap to target</span><b className={styles.gap}>{money(data.raise.gap)}</b></div>
            </div>
          </div>
          <div className={styles.trending}><TrendingUp size={13} /> You&apos;re trending ahead. <b>Keep the momentum going.</b></div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}><span>Outreach performance</span><span className={styles.tag}>Last 30 days</span></div>
          <MultiLine series={[{ data: data.outreach.emails, color: "#8b5cf6" }, { data: data.outreach.replies, color: "#22d3ee" }, { data: data.outreach.meetings, color: "#22c55e" }]} />
          <div className={styles.chartLabels}>{data.outreach.labels.map((l) => <span key={l}>{l}</span>)}</div>
          <div className={styles.chartLegend}>
            <span><i style={{ background: "#8b5cf6" }} /> Emails sent</span>
            <span><i style={{ background: "#22d3ee" }} /> Replies</span>
            <span><i style={{ background: "#22c55e" }} /> Meetings booked</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}><span>Top interested investors</span><a className={styles.viewLink} href="/investors">View all</a></div>
          <div className={styles.invList}>
            {data.topInvestors.map((iv) => (
              <div className={styles.invRow} key={iv.name}>
                <span className={styles.invAvatar} style={{ background: `linear-gradient(135deg, ${iv.color}, ${iv.color}99)` }}>{iv.initial}</span>
                <div className={styles.invInfo}><div className={styles.invName}>{iv.name}</div><div className={styles.invNote}>{iv.note}</div></div>
                <span className={`${styles.badge} ${styles[BADGE_CLASS[iv.badge]]}`}>{iv.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* row 2 */}
      <div className={styles.row2}>
        <div className={styles.card}>
          <div className={styles.cardHead}><span>Investor profiles</span><a className={styles.viewLink} href="/investors">View all</a></div>
          <div className={styles.profList}>
            {data.profiles.map((p) => (
              <div className={styles.profRow} key={p.name}>
                <span className={styles.profAvatar} style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}99)` }}>{p.initial}</span>
                <div className={styles.invInfo}><div className={styles.invName}>{p.name}</div><div className={styles.invNote}>{p.role}</div></div>
                <div className={styles.profRight}><span className={`${styles.badge} ${styles[BADGE_CLASS[p.badge]]}`}>{p.badge}</span><span className={styles.profStatus}>{p.status}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}><span>Compliance &amp; readiness</span></div>
          <div className={styles.checkList}>
            {data.compliance.map((c) => (
              <div className={styles.checkRow} key={c.label}><CheckStatus c={c} /><span className={styles.checkLabel}>{c.label}</span></div>
            ))}
          </div>
          <div className={styles.readyBar}><CheckCircle2 size={13} /> You&apos;re {data.compliancePct}% ready to close. <b>{data.compliance.filter((c) => c.status !== "Completed").length} items need attention.</b></div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}><span>Data room checklist</span><a className={styles.viewLink} href="/data-room">View data room</a></div>
          <div className={styles.checkList}>
            {data.dataRoom.map((c) => (
              <div className={styles.checkRow} key={c.label}><span className={styles.docIcon}><Database size={12} /></span><span className={styles.checkLabel}>{c.label}</span><span className={`${styles.docStatus} ${styles[CHECK_CLASS[c.status]]}`}>{c.status}</span></div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}><span>Meeting preparation</span><a className={styles.viewLink} href="/analytics">View calendar</a></div>
          <div className={styles.meetSub}>Upcoming meetings</div>
          <div className={styles.meetList}>
            {data.meetings.map((m) => (
              <div className={styles.meetRow} key={m.name}>
                <span className={styles.invAvatar} style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}99)` }}>{m.initial}</span>
                <div className={styles.invInfo}><div className={styles.invName}>{m.name}</div><div className={styles.invNote}><Clock size={10} /> {m.when}</div></div>
                <a className={styles.prepBtn} href="/agent">Prepare</a>
              </div>
            ))}
          </div>
          <div className={styles.meetReady}><CheckCircle2 size={13} /> {data.meetings.length} meetings this week — <b>you&apos;re all set. Great work!</b></div>
        </div>
      </div>
    </div>
  );
}

function CheckStatus({ c }: { c: Check }) {
  if (c.status === "Completed") return <CheckCircle2 size={14} className={styles.cDone} />;
  if (c.status === "In progress") return <Clock size={14} className={styles.cProg} />;
  return <Building2 size={14} className={styles.cPend} />;
}
