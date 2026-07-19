"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Bookmark, CheckCircle2, Download, Linkedin, Loader2, RefreshCw,
  Save, Search, SlidersHorizontal, Sparkles, TrendingUp, Users,
} from "lucide-react";
import styles from "./lead-finder.module.css";

type Fit = "High" | "Medium" | "Low";
type Status = "Qualified" | "Queued" | "Saved" | "Rejected";
interface DM { name: string; title: string }
interface Account {
  name: string; initial: string; color: string; industry: string; employees: number;
  location: string; fit: Fit; confidence: number; dms: DM[]; extraDms: number; status: Status; ago: string;
}

const ACCOUNTS: Account[] = [
  { name: "Northwind", initial: "N", color: "#22c55e", industry: "B2B SaaS", employees: 120, location: "San Francisco, CA", fit: "High", confidence: 92, dms: [{ name: "Jordan Lee", title: "VP of Revenue" }, { name: "Taylor Foster", title: "Head of Sales" }], extraDms: 1, status: "Qualified", ago: "2h ago" },
  { name: "Globex", initial: "G", color: "#3b82f6", industry: "AI Infrastructure", employees: 180, location: "Austin, TX", fit: "High", confidence: 87, dms: [{ name: "Sam Rivera", title: "Head of RevOps" }, { name: "Riley Chen", title: "VP Growth" }], extraDms: 2, status: "Queued", ago: "5h ago" },
  { name: "Initech", initial: "I", color: "#8b5cf6", industry: "DevTools", employees: 95, location: "Boston, MA", fit: "Medium", confidence: 73, dms: [{ name: "Priya Nair", title: "Director of Sales" }, { name: "Alex Kim", title: "RevOps Lead" }], extraDms: 0, status: "Saved", ago: "1d ago" },
  { name: "Umbrella", initial: "U", color: "#22d3ee", industry: "Cybersecurity", employees: 250, location: "New York, NY", fit: "High", confidence: 90, dms: [{ name: "Chris Taylor", title: "Head of Growth" }, { name: "Jamie Patel", title: "VP Sales" }], extraDms: 1, status: "Qualified", ago: "3h ago" },
  { name: "Hooli", initial: "H", color: "#ec4899", industry: "Cloud Data", employees: 60, location: "Seattle, WA", fit: "Medium", confidence: 68, dms: [{ name: "Mia Chen", title: "Founder" }, { name: "Devon Park", title: "Head of Ops" }], extraDms: 0, status: "Queued", ago: "8h ago" },
  { name: "Soylent", initial: "S", color: "#f43f5e", industry: "FoodTech", employees: 150, location: "Chicago, IL", fit: "Low", confidence: 42, dms: [{ name: "Casey Jones", title: "Marketing Director" }, { name: "Morgan Lee", title: "Growth Lead" }], extraDms: 0, status: "Rejected", ago: "1d ago" },
];

const ALL_INDUSTRIES = ["B2B SaaS", "DevTools", "AI Infrastructure", "Cloud Computing", "Fintech", "Cybersecurity"];
const ALL_TITLES = ["VP of Sales", "Head of Growth", "Founder", "CRO", "CEO", "RevOps Lead"];

interface Trigger { key: string; label: string; desc: string; strength: "Strong" | "Medium" | "Weak"; on: boolean }
const DEFAULT_TRIGGERS: Trigger[] = [
  { key: "hiring", label: "Hiring", desc: "Actively hiring for sales or growth roles", strength: "Strong", on: true },
  { key: "funding", label: "Funding", desc: "Raised funding in the last 6 months", strength: "Strong", on: true },
  { key: "tech", label: "Tech adoption", desc: "Using intent-heavy or relevant technologies", strength: "Medium", on: true },
  { key: "web", label: "Website activity", desc: "High intent from website visits", strength: "Weak", on: false },
];

const STATUS_CLASS: Record<Status, string> = { Qualified: "stQualified", Queued: "stQueued", Saved: "stSaved", Rejected: "stRejected" };
const FIT_COLOR: Record<Fit, string> = { High: "#22c55e", Medium: "#f59e0b", Low: "#f43f5e" };
const FIT_DOTS: Record<Fit, number> = { High: 5, Medium: 3, Low: 2 };

function Gauge({ value, color }: { value: number; color: string }) {
  const r = 20, c = 2 * Math.PI * r, off = c - (value / 100) * c;
  return (
    <svg viewBox="0 0 52 52" className={styles.gauge} aria-hidden="true">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 26 26)" style={{ filter: `drop-shadow(0 0 4px ${color}aa)` }} />
      <text x="26" y="30" textAnchor="middle" className={styles.gaugeText}>{value}</text>
    </svg>
  );
}

function Chips({ options, selected, onToggle }: { options: string[]; selected: Set<string>; onToggle: (v: string) => void }) {
  return (
    <div className={styles.chips}>
      {options.map((o) => (
        <button key={o} type="button" className={`${styles.chip} ${selected.has(o) ? styles.chipOn : ""}`} onClick={() => onToggle(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function LeadFinderBoard() {
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [industries, setIndustries] = useState<Set<string>>(new Set(ALL_INDUSTRIES.slice(0, 4)));
  const [titles, setTitles] = useState<Set<string>>(new Set(ALL_TITLES.slice(0, 4)));
  const [companySize, setCompanySize] = useState("11-200 employees");
  const [leadCount, setLeadCount] = useState("50-500 leads");
  const [triggers, setTriggers] = useState<Trigger[]>(DEFAULT_TRIGGERS);
  const [tab, setTab] = useState<"saved" | "preview">("preview");
  const [searching, setSearching] = useState(false);
  const [ranAt, setRanAt] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/campaigns/list").then((r) => r.json()).then((j) => {
      if (j?.ok && Array.isArray(j.data)) { setCampaigns(j.data); setCampaignId((c) => c || j.data[0]?.id || ""); }
    }).catch(() => undefined);
  }, []);

  function toggleSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, v: string) {
    setter((prev) => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; });
  }

  // Live-scored accounts. Deltas are centered on the default selection (4 industries,
  // 3 active triggers) so the initial board shows the exact base scores, and confidence
  // moves as the user tightens or loosens the ICP + trigger signals.
  const scored = useMemo(() => {
    const activeTriggers = triggers.filter((t) => t.on).length;
    return ACCOUNTS.map((a) => {
      let conf = a.confidence + (activeTriggers - 3) * 2 + (industries.size - 4) * 1;
      if (ranAt < 0) conf += 0; // ranAt kept in deps to re-run/refresh; does not skew score
      conf = Math.max(10, Math.min(99, conf));
      const fit: Fit = conf >= 85 ? "High" : conf >= 60 ? "Medium" : "Low";
      return { ...a, confidence: conf, fit };
    });
  }, [industries, triggers, ranAt]);

  const rows = useMemo(
    () => (tab === "saved" ? scored.filter((a) => a.status === "Qualified" || a.status === "Saved") : scored),
    [scored, tab]
  );

  const stats = useMemo(() => {
    // Quality score = avg confidence of accounts that clear the fit bar (exclude Low).
    const qualified = scored.filter((a) => a.fit !== "Low");
    const quality = qualified.length ? Math.round(qualified.reduce((s, a) => s + a.confidence, 0) / qualified.length) : 0;
    return {
      searchVolume: (12.4 + (industries.size - 4) * 0.3 + (titles.size - 4) * 0.2).toFixed(1),
      quality,
      saved: 340,
      readiness: quality >= 78 ? "High" : quality >= 55 ? "Medium" : "Low",
    };
  }, [scored, industries, titles]);

  function runSearch() {
    setSearching(true);
    setTimeout(() => { setSearching(false); setRanAt((n) => n + 1); setToast("Search complete — preview refreshed with the latest matches."); }, 1300);
  }
  function handoff() { setToast(`Handed ${rows.length} qualified accounts to Campaign Leader.`); }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <span className={styles.eyebrow}><Search size={13} /> Lead finder</span>
          <h1 className={styles.title}>Find companies your agents can actually use</h1>
          <p className={styles.sub}>Build ICP filters, preview fit, and hand qualified leads to Campaign Leader.</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className={styles.kpis}>
        <Kpi icon={Search} accent="#8b5cf6" label="Search volume" value={`${stats.searchVolume}K`} delta="+24.8%" />
        <Kpi icon={TrendingUp} accent="#22c55e" label="Quality score" value={String(stats.quality)} delta="+18.3%" />
        <Kpi icon={Bookmark} accent="#22d3ee" label="Saved accounts" value={String(stats.saved)} delta="+31.4%" />
        <div className={`${styles.kpi} ${styles.readyKpi}`}>
          <div className={styles.kpiTop}><span className={styles.kpiLabel}>Campaign readiness</span><span className={styles.kpiIcon} style={{ ["--accent" as string]: "#a855f7" }}><CheckCircle2 size={15} /></span></div>
          <div className={styles.kpiValue}>{stats.readiness}</div>
          <div className={styles.readyNote}><CheckCircle2 size={12} /> Ready to hand off</div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* filter builder */}
        <div className={styles.filterCard}>
          <div className={styles.cardHead}>
            <div><div className={styles.cardTitle}><SlidersHorizontal size={15} /> Filter builder</div><p className={styles.cardSub}>Define your ideal customer and trigger signals.</p></div>
            <button className={styles.linkBtn} type="button" onClick={() => setToast("Search saved to your library.")}><Save size={13} /> Save search</button>
          </div>

          <label className={styles.flabel}>Campaign</label>
          <select className={styles.select} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">Choose a campaign</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <label className={styles.flabel}>Industry</label>
          <Chips options={ALL_INDUSTRIES} selected={industries} onToggle={(v) => toggleSet(setIndustries, v)} />

          <label className={styles.flabel}>Job titles <span className={styles.dim}>(any of)</span></label>
          <Chips options={ALL_TITLES} selected={titles} onToggle={(v) => toggleSet(setTitles, v)} />

          <div className={styles.two}>
            <div><label className={styles.flabel}>Company size</label>
              <select className={styles.select} value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
                {["1-10 employees", "11-200 employees", "201-1000 employees", "1000+ employees"].map((o) => <option key={o}>{o}</option>)}
              </select></div>
            <div><label className={styles.flabel}>Lead count</label>
              <select className={styles.select} value={leadCount} onChange={(e) => setLeadCount(e.target.value)}>
                {["10-50 leads", "50-500 leads", "500-1000 leads", "1000+ leads"].map((o) => <option key={o}>{o}</option>)}
              </select></div>
          </div>

          <label className={styles.flabel}>Triggers <span className={styles.dim}>(any of)</span></label>
          <div className={styles.triggers}>
            {triggers.map((t, i) => (
              <div className={styles.trigger} key={t.key}>
                <div className={styles.trigInfo}><strong>{t.label}</strong><span>{t.desc}</span></div>
                <span className={`${styles.strength} ${styles[`str_${t.strength}`]}`}>{t.strength}</span>
                <button type="button" className={`${styles.toggle} ${t.on ? styles.toggleOn : ""}`} aria-pressed={t.on}
                  onClick={() => setTriggers((ts) => ts.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}><span /></button>
              </div>
            ))}
          </div>

          <button className={styles.runBtn} type="button" onClick={runSearch} disabled={searching}>
            {searching ? <><Loader2 className="spin" size={16} /> Searching…</> : <><Search size={16} /> Run search</>}
          </button>
          <div className={styles.estimate}>Estimated time: 30–60 seconds</div>
        </div>

        {/* qualified preview */}
        <div className={styles.previewCard}>
          <div className={styles.cardHead}>
            <div><div className={styles.cardTitle}><Sparkles size={15} /> Qualified preview</div><p className={styles.cardSub}>Live preview of companies matching your filters, scored and ready for outreach.</p></div>
            <div className={styles.previewTools}>
              <span className={styles.resultCount}>{scored.length} results</span>
              <button className={styles.iconLink} type="button" onClick={runSearch}><RefreshCw size={13} className={searching ? "spin" : ""} /> Refresh</button>
            </div>
          </div>

          <div className={styles.tabRow}>
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${tab === "saved" ? styles.tabOn : ""}`} onClick={() => setTab("saved")}>Saved leads <span>178</span></button>
              <button className={`${styles.tab} ${tab === "preview" ? styles.tabOn : ""}`} onClick={() => setTab("preview")}>Account preview <span>312</span></button>
            </div>
            <div className={styles.previewActions}>
              <button className={styles.ghostBtn} type="button" onClick={() => setToast("Exported qualified accounts to CSV.")}><Download size={14} /> Export CSV</button>
              <button className={styles.handoffBtn} type="button" onClick={handoff}><ArrowRight size={14} /> Hand off to campaign</button>
            </div>
          </div>

          <div className={styles.colHead}>
            <span>Company</span><span>Fit stage</span><span>Confidence</span><span>Top decision makers</span><span>Status</span>
          </div>
          <div className={`${styles.rows} ${searching ? styles.rowsBusy : ""}`}>
            {rows.map((a) => (
              <div className={styles.row} key={a.name}>
                <div className={styles.cCompany}>
                  <span className={styles.avatar} style={{ background: `linear-gradient(135deg, ${a.color}, ${a.color}99)`, boxShadow: `0 4px 14px ${a.color}66` }}>{a.initial}</span>
                  <div><div className={styles.coName}>{a.name}</div><div className={styles.coMeta}>{a.industry} · {a.employees} employees</div><div className={styles.coLoc}>{a.location}</div></div>
                </div>
                <div className={styles.cFit}>
                  <span className={styles.fitLabel} style={{ color: FIT_COLOR[a.fit] }}>{a.fit} fit</span>
                  <span className={styles.dots}>{Array.from({ length: 5 }).map((_, i) => <span key={i} className={styles.dot} style={{ background: i < FIT_DOTS[a.fit] ? FIT_COLOR[a.fit] : "rgba(255,255,255,0.12)" }} />)}</span>
                </div>
                <div className={styles.cConf}><Gauge value={a.confidence} color={FIT_COLOR[a.fit]} /></div>
                <div className={styles.cDm}>
                  {a.dms.map((d) => (
                    <div className={styles.dm} key={d.name}>
                      <span className={styles.dmAvatar}>{d.name[0]}</span>
                      <div><div className={styles.dmName}>{d.name} <Linkedin size={11} className={styles.li} /></div><div className={styles.dmTitle}>{d.title}</div></div>
                    </div>
                  ))}
                  {a.extraDms > 0 && <span className={styles.moreDm}>+{a.extraDms}</span>}
                </div>
                <div className={styles.cStatus}>
                  <span className={`${styles.pill} ${styles[STATUS_CLASS[a.status]]}`}>{a.status}</span>
                  <span className={styles.statusAgo}>{a.ago}</span>
                </div>
              </div>
            ))}
          </div>
          <a className={styles.viewAll} href="/leads">View all results <ArrowRight size={14} /></a>
        </div>
      </div>

      {toast && <div className={styles.toast}><CheckCircle2 size={15} /> {toast}</div>}
    </div>
  );
}

function Kpi({ icon: Icon, accent, label, value, delta }: { icon: typeof Users; accent: string; label: string; value: string; delta: string }) {
  return (
    <div className={styles.kpi} style={{ ["--accent" as string]: accent }}>
      <div className={styles.kpiTop}><span className={styles.kpiLabel}>{label}</span><span className={styles.kpiIcon}><Icon size={15} /></span></div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiDelta}><TrendingUp size={11} /> {delta} <span>vs last 7 days</span></div>
    </div>
  );
}
