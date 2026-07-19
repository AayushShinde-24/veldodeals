"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, Bot, CheckCircle2, FileCheck, Loader2, Mail, Pause, Play,
  RefreshCw, Send, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, UserCheck, Wrench, Zap,
} from "lucide-react";
import styles from "./agents.module.css";

type QueueKind = "Verification" | "Compliance" | "Send approvals" | "Exceptions";
type Priority = "High" | "Medium";

interface AgentGroup { name: string; desc: string; agents: number; running: boolean }
interface ApprovalTask {
  id: string; item: string; sub: string; type: QueueKind; agent: string;
  priority: Priority; value: string; waiting: string;
  status: "pending" | "approving" | "approved" | "rejected";
}

const INITIAL_GROUPS: AgentGroup[] = [
  { name: "Outreach & Research", desc: "Lead research, enrichment, and scoring", agents: 12, running: true },
  { name: "Content & Personalization", desc: "Email writing, personalization, and A/B tests", agents: 8, running: true },
  { name: "Campaign Execution", desc: "Multi-channel outreach and follow-ups", agents: 15, running: true },
  { name: "Data & CRM Sync", desc: "CRM updates, deduping, and data hygiene", agents: 6, running: true },
  { name: "Analytics & Insights", desc: "Reporting, attribution, and recommendations", agents: 4, running: true },
];

const INITIAL_TASKS: ApprovalTask[] = [
  { id: "t1", item: "Enterprise Lead: Global Corp", sub: "High-intent inbound lead", type: "Verification", agent: "Lead Researcher", priority: "High", value: "$12,400", waiting: "18m ago", status: "pending" },
  { id: "t2", item: "Email Campaign: Q3 Outreach", sub: "New sequence to 1,240 prospects", type: "Send approvals", agent: "Campaign Writer", priority: "High", value: "$8,900", waiting: "32m ago", status: "pending" },
  { id: "t3", item: "ICP Scoring Model Update", sub: "Model threshold change", type: "Compliance", agent: "ICP Scoring", priority: "Medium", value: "—", waiting: "45m ago", status: "pending" },
  { id: "t4", item: "Unusual Bounce Rate Spike", sub: "Bounce rate above threshold", type: "Exceptions", agent: "Email Verifier", priority: "High", value: "—", waiting: "1h ago", status: "pending" },
  { id: "t5", item: "New Domain Detected", sub: "Unverified domain in sequence", type: "Compliance", agent: "Email Verifier", priority: "Medium", value: "—", waiting: "1h 20m ago", status: "pending" },
];

const QUEUE_META: { kind: QueueKind; desc: string; base: number; icon: typeof UserCheck; delta: string }[] = [
  { kind: "Verification", desc: "Items awaiting your verification", base: 14, icon: UserCheck, delta: "+28% vs yesterday" },
  { kind: "Compliance", desc: "Policies & compliance validations", base: 6, icon: ShieldCheck, delta: "+15% vs yesterday" },
  { kind: "Send approvals", desc: "Approve messages & campaigns", base: 9, icon: Send, delta: "+12% vs yesterday" },
  { kind: "Exceptions", desc: "Anomalies & items needing review", base: 3, icon: AlertTriangle, delta: "+8% vs yesterday" },
];

const FLOW_AUTO = ["Discover", "Enrich", "Personalize", "Execute"];
const FLOW_GATED = ["Review", "Approve", "Learn"];

const RECOS = [
  { title: "Auto-approve safe sends", body: "78% of similar campaigns were approved. Potential time saved: 2.4 hrs/day.", cta: "Configure" },
  { title: "Update ICP thresholds", body: "Leads below 65 score rarely convert. Potential lift: 18% fewer SQLs.", cta: "Review" },
  { title: "Add compliance rule", body: "New domain risk detected in replies. Recommended rule update.", cta: "Configure" },
];

function HealthGauge({ pct }: { pct: number }) {
  const r = 40, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return (
    <svg viewBox="0 0 100 100" className={styles.gauge} aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="#22c55e" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 50 50)" style={{ filter: "drop-shadow(0 0 8px rgba(34,197,94,0.7))" }} />
      <text x="50" y="47" textAnchor="middle" className={styles.gaugePct}>{pct}%</text>
      <text x="50" y="62" textAnchor="middle" className={styles.gaugeSub}>Healthy</text>
    </svg>
  );
}

export function AgentsBoard() {
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [filter, setFilter] = useState<"All" | QueueKind>("All");
  const [reviewedToday, setReviewedToday] = useState(37);
  const [toast, setToast] = useState("");

  const pendingCount = useMemo(() => tasks.filter((t) => t.status === "pending").length, [tasks]);
  const decided = useMemo(() => tasks.filter((t) => t.status === "approved" || t.status === "rejected").length, [tasks]);

  const visibleTasks = useMemo(
    () => tasks.filter((t) => (filter === "All" ? true : t.type === filter)),
    [tasks, filter]
  );

  function toggleGroup(name: string) {
    setGroups((gs) => gs.map((g) => (g.name === name ? { ...g, running: !g.running } : g)));
    const g = groups.find((x) => x.name === name);
    if (g) setToast(g.running ? `${name} paused — ${g.agents} agents idle until resumed.` : `${name} resumed — ${g.agents} agents back online.`);
  }

  async function decide(id: string, decision: "approve" | "reject") {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: "approving" } : t)));
    try {
      // Real decision endpoint — persists to agent_tasks when a live DB is connected.
      await fetch("/api/agents/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id, decision }),
      });
    } catch {
      /* optimistic UI still records the decision locally */
    }
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: decision === "approve" ? "approved" : "rejected" } : t)));
    setReviewedToday((n) => n + 1);
    const task = tasks.find((t) => t.id === id);
    setToast(decision === "approve" ? `Approved: ${task?.item}. The agent will proceed.` : `Rejected: ${task?.item}. The agent has been halted on this item.`);
  }

  function queueCount(kind: QueueKind, base: number) {
    const decidedOfKind = tasks.filter((t) => t.type === kind && t.status !== "pending").length;
    return Math.max(0, base - decidedOfKind);
  }

  const approvalsPending = Math.max(0, 14 - decided);

  return (
    <div className={styles.wrap}>
      {/* hero */}
      <div className={styles.hero}>
        <div>
          <span className={styles.eyebrow}><Bot size={12} /> Autonomous Ops · Human Approval</span>
          <h1 className={styles.title}>Autonomy where it scales.<br />Human approval where it matters.</h1>
          <p className={styles.sub}>Veldo coordinates AI execution while surfacing only the highest-value review points.</p>
        </div>
        <span className={styles.healthy}><CheckCircle2 size={12} /> System healthy</span>
      </div>

      {/* stats */}
      <div className={styles.stats}>
        {[
          { label: "Approvals pending", value: approvalsPending, delta: "-28% vs yesterday", icon: FileCheck, accent: "#f59e0b" },
          { label: "Reviewed today", value: reviewedToday, delta: "+12% vs yesterday", icon: CheckCircle2, accent: "#22c55e" },
          { label: "Auto-resolved tasks", value: 128, delta: "+31% vs yesterday", icon: Zap, accent: "#8b5cf6" },
          { label: "Manual interventions", value: 5, delta: "-17% vs yesterday", icon: Wrench, accent: "#22d3ee" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div className={styles.stat} key={s.label} style={{ ["--accent" as string]: s.accent, animationDelay: `${i * 60}ms` }}>
              <div className={styles.statTop}><span className={styles.statLabel}>{s.label}</span><span className={styles.statIcon}><Icon size={14} /></span></div>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statDelta}>{s.delta}</div>
            </div>
          );
        })}
      </div>

      <div className={styles.grid}>
        {/* left column */}
        <div className={styles.col}>
          <div className={styles.card}>
            <div className={styles.cardHead}><span>Automated agent groups</span></div>
            <p className={styles.cardSub}>AI agents executing operations across your systems.</p>
            <div className={styles.groups}>
              {groups.map((g) => (
                <div className={styles.group} key={g.name}>
                  <span className={styles.groupIcon}><Bot size={13} /></span>
                  <div className={styles.groupInfo}><strong>{g.name}</strong><span>{g.desc}</span></div>
                  <span className={`${styles.runPill} ${g.running ? "" : styles.pausedPill}`}>{g.running ? "Running" : "Paused"}</span>
                  <span className={styles.groupAgents}>{g.agents} agents</span>
                  <button className={styles.groupToggle} type="button" onClick={() => toggleGroup(g.name)} aria-label={g.running ? "Pause group" : "Resume group"}>
                    {g.running ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                </div>
              ))}
            </div>
            <a className={styles.viewLink} href="/agents/tasks">View all agent groups <ArrowRight size={12} /></a>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}><span>System health</span></div>
            <p className={styles.cardSub}>Everything operating within normal parameters.</p>
            <div className={styles.healthRow}>
              <HealthGauge pct={98} />
              <div className={styles.healthStats}>
                <div className={styles.hStat}><span>Agents online</span><b>{groups.filter((g) => g.running).reduce((s, g) => s + g.agents, 0)} / 45</b></div>
                <div className={styles.hStat}><span>Success rate (24h)</span><b>98%</b></div>
                <div className={styles.hStat}><span>Avg. task time</span><b>2.1 min</b></div>
                <div className={styles.hStat}><span>API &amp; integrations</span><b className={styles.opGreen}>Operational</b></div>
              </div>
            </div>
            <a className={styles.viewLink} href="/analytics">View system status <ArrowRight size={12} /></a>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}><span>How Veldo works: Autonomous → Human-gated</span><span className={styles.liveTag}>Live flow</span></div>
            <p className={styles.cardSub}>AI executes end-to-end, surfacing only what matters.</p>
            <div className={styles.flow}>
              {FLOW_AUTO.map((f, i) => (
                <span className={styles.flowStep} key={f}><i>{i + 1}</i>{f}</span>
              ))}
              <span className={styles.flowGate}><ShieldCheck size={13} /></span>
              {FLOW_GATED.map((f, i) => (
                <span className={`${styles.flowStep} ${styles.flowGated}`} key={f}><i>{FLOW_AUTO.length + i + 1}</i>{f}</span>
              ))}
            </div>
            <div className={styles.flowLegend}>
              <span><i className={styles.dotAuto} /> Autonomous step</span>
              <span><i className={styles.dotGated} /> Human-gated step</span>
              <span><i className={styles.dotLearn} /> Continuous learning</span>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}><span><Sparkles size={13} className={styles.aiIcon} /> AI recommendations</span></div>
            <p className={styles.cardSub}>Insights to help you optimize approvals and outcomes.</p>
            <div className={styles.recos}>
              {RECOS.map((r) => (
                <div className={styles.reco} key={r.title}>
                  <strong>{r.title}</strong>
                  <p>{r.body}</p>
                  <button className={styles.recoBtn} type="button" onClick={() => setToast(`"${r.title}" opened for configuration in the AI Command Center.`)}>{r.cta}</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right column — approval center */}
        <div className={styles.col}>
          <div className={styles.card}>
            <div className={styles.cardHead}><span>Approval Center</span><a className={styles.viewLink} href="/agents/tasks">View all <ArrowRight size={12} /></a></div>
            <p className={styles.cardSub}>Review high-value items that require your attention.</p>
            <div className={styles.queues}>
              {QUEUE_META.map((q) => {
                const Icon = q.icon;
                const count = queueCount(q.kind, q.base);
                return (
                  <div className={styles.queue} key={q.kind}>
                    <div className={styles.queueTop}><span className={styles.queueName}>{q.kind === "Verification" ? "Verification queue" : q.kind === "Compliance" ? "Compliance checks" : q.kind}</span><span className={styles.queueIcon}><Icon size={13} /></span></div>
                    <div className={styles.queueCount}>{count}</div>
                    <div className={styles.queueDelta}>{q.delta}</div>
                    <button className={styles.queueBtn} type="button" onClick={() => setFilter(q.kind)}>Review now</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}><span>Approval tasks</span></div>
            <p className={styles.cardSub}>High-impact items awaiting your review.</p>
            <div className={styles.tabs}>
              {(["All", "Verification", "Compliance", "Send approvals", "Exceptions"] as const).map((t) => (
                <button key={t} className={`${styles.tab} ${filter === t ? styles.tabOn : ""}`} type="button" onClick={() => setFilter(t)}>
                  {t}{t === "All" ? ` ${pendingCount}` : ""}
                </button>
              ))}
            </div>
            <div className={styles.taskHead}><span>Item</span><span>Type</span><span>Agent</span><span>Priority</span><span>Value</span><span>Waiting</span><span>Action</span></div>
            <div className={styles.taskRows}>
              {visibleTasks.map((t) => (
                <div className={`${styles.taskRow} ${t.status !== "pending" && t.status !== "approving" ? styles.taskDone : ""}`} key={t.id}>
                  <div className={styles.taskItem}><strong>{t.item}</strong><span>{t.sub}</span></div>
                  <span className={styles.typePill}>{t.type}</span>
                  <span className={styles.taskAgent}><Bot size={11} /> {t.agent}</span>
                  <span className={`${styles.prio} ${t.priority === "High" ? styles.prioHigh : styles.prioMed}`}>{t.priority}</span>
                  <span className={styles.taskValue}>{t.value}</span>
                  <span className={styles.taskWait}>{t.waiting}</span>
                  <span className={styles.taskAction}>
                    {t.status === "pending" && (
                      <>
                        <button className={styles.approveBtn} type="button" onClick={() => decide(t.id, "approve")} aria-label="Approve"><ThumbsUp size={12} /></button>
                        <button className={styles.rejectBtn} type="button" onClick={() => decide(t.id, "reject")} aria-label="Reject"><ThumbsDown size={12} /></button>
                      </>
                    )}
                    {t.status === "approving" && <Loader2 className="spin" size={14} />}
                    {t.status === "approved" && <span className={styles.decided}><CheckCircle2 size={12} /> Approved</span>}
                    {t.status === "rejected" && <span className={styles.decidedNo}><AlertTriangle size={12} /> Rejected</span>}
                  </span>
                </div>
              ))}
              {!visibleTasks.length && <div className={styles.emptyQ}><RefreshCw size={14} /> No items in this queue — all clear.</div>}
            </div>
            <a className={styles.viewLink} href="/agents/tasks">View all tasks <ArrowRight size={12} /></a>
          </div>
        </div>
      </div>

      {toast && <div className={styles.toast}><Mail size={14} /> {toast}</div>}
    </div>
  );
}
