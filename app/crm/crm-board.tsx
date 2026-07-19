import {
  ArrowRight, Calendar, ChevronDown, FileText, Filter, LayoutGrid, List, Mail, Plus,
  Sparkles, StickyNote, TrendingUp, X, Zap,
} from "lucide-react";
import type { CrmData, Deal, CrmStat } from "@/lib/ui/crm-command";
import styles from "./crm.module.css";

function money(n: number): string { return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`; }

function Spark({ data, color }: { data: number[]; color: string }) {
  const w = 100, h = 26, max = Math.max(...data, 1), min = Math.min(...data, 0), r = Math.max(1, max - min);
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - ((v - min) / r) * (h - 3) - 2).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={styles.spark} aria-hidden="true">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${color}aa)` }} />
    </svg>
  );
}

function HealthGauge({ score, label }: { score: number; label: string }) {
  const r = 26, c = 2 * Math.PI * r, off = c - (score / 100) * c;
  return (
    <div className={styles.healthCard}>
      <div><div className={styles.statLabel}>Pipeline health</div><div className={styles.healthLabel}>{label}</div></div>
      <svg viewBox="0 0 64 64" className={styles.healthGauge} aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 32 32)" style={{ filter: "drop-shadow(0 0 5px #22c55eaa)" }} />
        <text x="32" y="37" textAnchor="middle" className={styles.healthNum}>{score}</text>
      </svg>
    </div>
  );
}

function StatCard({ s, i }: { s: CrmStat; i: number }) {
  const accents = ["#8b5cf6", "#3b82f6", "#22d3ee", "#22c55e", "#f59e0b"];
  const accent = accents[i % accents.length];
  return (
    <div className={styles.statCard} style={{ ["--accent" as string]: accent, animationDelay: `${i * 60}ms` }}>
      <div className={styles.statLabel}>{s.label}</div>
      <div className={styles.statValue}>{s.value}</div>
      <div className={styles.statFoot}><span className={styles.statDelta}><TrendingUp size={11} /> {s.delta}</span><span className={styles.statVs}>vs last month</span></div>
      <div className={styles.statSpark}><Spark data={s.spark} color={accent} /></div>
    </div>
  );
}

const PRIO_CLASS: Record<string, string> = { Low: "pLow", Medium: "pMed", High: "pHigh" };

function DealCard({ d }: { d: Deal }) {
  return (
    <div className={styles.deal}>
      <div className={styles.dealTop}><span className={styles.dealCo}>{d.company}</span><ChevronDown size={13} className={styles.dealMenu} /></div>
      <div className={styles.dealAmt}>{money(d.amount)}</div>
      <div className={styles.dealMeta}>Prob {d.prob}%{d.delta ? <span className={styles.dealDelta}>+{d.delta}%</span> : null}</div>
      <div className={styles.dealFoot}><span className={styles.dealTouch}>Last touch {d.lastTouch}</span><span className={`${styles.prio} ${styles[PRIO_CLASS[d.priority]]}`}>{d.priority}</span></div>
    </div>
  );
}

function AreaChart({ points, color }: { points: number[]; color: string }) {
  const w = 300, h = 90, max = Math.max(...points, 1), min = Math.min(...points, 0), r = Math.max(1, max - min);
  const xy = points.map((v, i) => [(i / (points.length - 1)) * w, h - ((v - min) / r) * (h - 8) - 4]);
  const line = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={styles.area} aria-hidden="true">
      <defs><linearGradient id="crmArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.4" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill="url(#crmArea)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 5px ${color}88)` }} />
    </svg>
  );
}

function DonutBreakdown({ items }: { items: { name: string; value: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const r = 30, c = 2 * Math.PI * r; let acc = 0;
  return (
    <div className={styles.donutRow}>
      <svg viewBox="0 0 80 80" className={styles.donut} aria-hidden="true">
        {items.map((it, i) => {
          const frac = it.value / total, dash = frac * c, off = -acc * c; acc += frac;
          return <circle key={i} cx="40" cy="40" r={r} fill="none" stroke={it.color} strokeWidth="10" strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={off} transform="rotate(-90 40 40)" />;
        })}
        <text x="40" y="38" textAnchor="middle" className={styles.donutTotal}>{money(total)}</text>
        <text x="40" y="50" textAnchor="middle" className={styles.donutSub}>Total</text>
      </svg>
      <div className={styles.legend}>
        {items.map((it) => (
          <div className={styles.legRow} key={it.name}><span className={styles.legDot} style={{ background: it.color }} /><span className={styles.legName}>{it.name}</span><span className={styles.legPct}>{Math.round((it.value / total) * 100)}%</span></div>
        ))}
      </div>
    </div>
  );
}

const ACT_ICON = { email: Mail, meeting: Calendar, stage: TrendingUp, note: StickyNote };
const SUG_ICON = { nudge: Zap, risk: X, cross: Sparkles, task: FileText };

export function CrmBoard({ data }: { data: CrmData }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.layout}>
        <div className={styles.main}>
          {/* header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Deal execution and pipeline intelligence</h1>
              <p className={styles.sub}>Real-time visibility into deal progress, risks, and revenue movement.</p>
            </div>
            <div className={styles.orb} aria-hidden="true"><span /><span /><span /></div>
          </div>

          {/* stats */}
          <div className={styles.stats}>
            {data.stats.map((s, i) => <StatCard key={s.label} s={s} i={i} />)}
            <HealthGauge score={data.health.score} label={data.health.label} />
          </div>

          {/* toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.tbLeft}>
              <button className={styles.tbBtn}><Filter size={13} /> All pipelines <ChevronDown size={12} /></button>
              <button className={styles.tbBtn}><Calendar size={13} /> This quarter <ChevronDown size={12} /></button>
              <button className={styles.tbBtn}>Group by: Stage <ChevronDown size={12} /></button>
            </div>
            <div className={styles.tbRight}>
              <button className={styles.tbBtn}>Actions <ChevronDown size={12} /></button>
              <span className={styles.viewToggle}><LayoutGrid size={14} className={styles.viewOn} /><List size={14} /></span>
              <a className={styles.addBtn} href="/campaigns/new"><Plus size={14} /> Add deal</a>
            </div>
          </div>

          {/* kanban */}
          <div className={styles.kanban}>
            {data.stages.map((st) => (
              <div className={styles.col} key={st.num}>
                <div className={styles.colHead}>
                  <span className={styles.colNum}>{st.num}</span>
                  <div><div className={styles.colName}>{st.name}</div><div className={styles.colMeta}>{money(st.value)} · {st.count} deal{st.count === 1 ? "" : "s"}</div></div>
                </div>
                {st.deals.map((d) => <DealCard key={d.company} d={d} />)}
                <button className={styles.addDeal}><Plus size={12} /> Add deal</button>
              </div>
            ))}
          </div>

          {/* bottom widgets */}
          <div className={styles.widgets}>
            <div className={styles.widget}>
              <div className={styles.wHead}><span>Forecast trend</span><span className={styles.wTag}>This quarter</span></div>
              <div className={styles.forecastVal}>{data.forecast.value}<span className={styles.forecastDelta}>{data.forecast.delta} vs last quarter</span></div>
              <div className={styles.forecastLabel}>Weighted forecast</div>
              <AreaChart points={data.forecast.points} color="#8b5cf6" />
              <div className={styles.months}>{data.forecast.months.map((m) => <span key={m}>{m}</span>)}</div>
            </div>

            <div className={styles.widget}>
              <div className={styles.wHead}><span>Pipeline by stage</span><span className={styles.wTag}>Total value</span></div>
              <DonutBreakdown items={data.byStage} />
            </div>

            <div className={styles.widget}>
              <div className={styles.wHead}><span>Follow-up tasks</span><span className={styles.wTag}>Next 7 days</span></div>
              <div className={styles.taskList}>
                {data.followUps.map((t) => (
                  <div className={styles.task} key={t.title}>
                    <span className={styles.check} />
                    <div><div className={styles.taskTitle}>{t.title}</div><div className={styles.taskMeta}><span className={`${styles.riskTag} ${styles[PRIO_CLASS[t.risk]]}`}>{t.risk} risk</span> {t.company}</div></div>
                    <span className={styles.taskDue}>{t.due}</span>
                  </div>
                ))}
              </div>
              <a className={styles.viewAll} href="/agents/tasks">View all tasks <ArrowRight size={13} /></a>
            </div>

            <div className={styles.widget}>
              <div className={styles.wHead}><span>Risk insights</span><span className={styles.wTag}>Top deals at risk</span></div>
              <div className={styles.taskList}>
                {data.risks.map((rk) => (
                  <div className={styles.task} key={rk.company}>
                    <span className={`${styles.riskDot} ${styles[PRIO_CLASS[rk.risk]]}`} />
                    <div><div className={styles.taskTitle}>{rk.company}</div><div className={styles.taskMeta}><span className={`${styles.riskTag} ${styles[PRIO_CLASS[rk.risk]]}`}>{rk.risk} risk</span> {rk.reason}</div></div>
                  </div>
                ))}
              </div>
              <a className={styles.viewAll} href="/analytics">View all risks <ArrowRight size={13} /></a>
            </div>
          </div>
        </div>

        {/* right rail */}
        <aside className={styles.rail}>
          <div className={styles.railCard}>
            <div className={styles.railHead}><span>CRM activity feed</span><X size={14} className={styles.railClose} /></div>
            <div className={styles.railToday}>Today</div>
            <div className={styles.feed}>
              {data.activity.map((a, i) => {
                const Icon = ACT_ICON[a.kind];
                return (
                  <div className={styles.feedItem} key={i}>
                    <span className={styles.feedTime}>{a.time}</span>
                    <span className={styles.feedIcon}><Icon size={12} /></span>
                    <div><div className={styles.feedTitle}>{a.title} <b>{a.company}</b></div><div className={styles.feedDetail}>{a.detail}</div></div>
                  </div>
                );
              })}
            </div>
            <a className={styles.viewAll} href="/inbox">View full timeline <ArrowRight size={13} /></a>
          </div>

          <div className={styles.railCard}>
            <div className={styles.railHead}><span><Sparkles size={13} className={styles.aiIcon} /> AI suggestions</span><Plus size={14} /></div>
            <div className={styles.railPowered}>Powered by Vel AI</div>
            <div className={styles.sugList}>
              {data.suggestions.map((s, i) => {
                const Icon = SUG_ICON[s.kind];
                return (
                  <div className={`${styles.sug} ${styles[`sug_${s.kind}`]}`} key={i}>
                    <span className={styles.sugIcon}><Icon size={12} /></span>
                    <div>
                      <div className={styles.sugTag}>{s.tag}</div>
                      <div className={styles.sugTitle}>{s.title}</div>
                      {s.body && <div className={styles.sugBody}>{s.body}</div>}
                      <a className={styles.sugCta} href="/agent">{s.cta} <ArrowRight size={11} /></a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
