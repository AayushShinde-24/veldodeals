"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight, BarChart3, CheckCircle2, Coins, DollarSign, Image as ImageIcon, Layers,
  Loader2, Megaphone, Play, Plus, Radio, Sparkles, Target, TrendingUp, Users, Wand2, X, Zap,
} from "lucide-react";
import styles from "./marketing.module.css";

// ── demo dataset (display); actions below are real ──
const KPIS = [
  { label: "Campaigns live", value: "9", delta: "+12% vs last 7 days", accent: "#8b5cf6", icon: Megaphone },
  { label: "Influenced revenue", value: "$124,830", delta: "+18% vs last 7 days", accent: "#22c55e", icon: DollarSign },
  { label: "CAC trend (30d)", value: "$38.42", delta: "-9% vs prior 30 days", accent: "#3b82f6", icon: TrendingUp },
  { label: "Active audiences", value: "28", delta: "+16% vs last 7 days", accent: "#ec4899", icon: Users },
  { label: "Content generated", value: "342", delta: "+31% vs last 7 days", accent: "#22d3ee", icon: Layers },
  { label: "Publish success rate", value: "97.6%", delta: "+1.2pp vs last 7 days", accent: "#f59e0b", icon: CheckCircle2 },
];

const CAMPAIGNS = [
  { name: "Q3 Awareness – Founders", channel: "Meta, Google", status: "Live", spend: "$12,409", roas: "4.21x", spark: [30, 44, 40, 58, 52, 66, 74] },
  { name: "Search – RevOps", channel: "Google", status: "Live", spend: "$8,907", roas: "3.67x", spark: [24, 30, 42, 38, 50, 56, 61] },
  { name: "Retarget – Trial Signups", channel: "Meta", status: "Live", spend: "$6,230", roas: "5.13x", spark: [18, 26, 34, 48, 44, 60, 72] },
  { name: "LinkedIn ABM – ICP", channel: "LinkedIn", status: "Live", spend: "$7,812", roas: "4.86x", spark: [22, 28, 26, 40, 52, 58, 66] },
  { name: "Product Launch – Video", channel: "YouTube", status: "Live", spend: "$9,921", roas: "3.18x", spark: [16, 22, 30, 28, 40, 46, 55] },
];

const GALLERY = [
  { caption: "Turn strategy into scalable revenue.", tag: "Meta Ads", hue: "#8b5cf6" },
  { caption: "AI that runs your marketing.", tag: "Google Ads", hue: "#3b82f6" },
  { caption: "Close more deals with better signals.", tag: "LinkedIn", hue: "#22d3ee" },
  { caption: "Veldo in action.", tag: "YouTube", hue: "#ec4899", video: true },
  { caption: "Revenue starts with relevance.", tag: "TikTok", hue: "#f59e0b" },
];

const FUNNEL = [
  { label: "Impressions", value: "2.4M", pct: 100 },
  { label: "Clicks", value: "98.3K", pct: 78 },
  { label: "Engaged sessions", value: "28.7K", pct: 56 },
  { label: "Leads", value: "3.2K", pct: 38 },
  { label: "Customers", value: "412", pct: 22 },
  { label: "Influenced revenue", value: "$124,830", pct: 100, money: true },
];

const OUTPUTS = [
  { name: "Q3 Awareness – Founders | Video Ad", sub: "YouTube Video", ago: "Generated 2h ago" },
  { name: "Search – RevOps | Ad Image", sub: "Google Image", ago: "Generated 5h ago" },
  { name: "Retarget – Trial Signups | Carousel", sub: "Meta Carousel", ago: "Generated 7h ago" },
];

interface Channel { id: string; name: string; configured: boolean }
interface AdVariant { channel: string; headline: string; primaryText: string; cta: string }
interface AdResult { variants: AdVariant[]; creativeConcept: string; demo: boolean }

function Area({ points, color }: { points: number[]; color: string }) {
  const w = 320, h = 110, max = Math.max(...points, 1), r = Math.max(1, max);
  const xy = points.map((v, i) => [(i / (points.length - 1)) * w, h - (v / r) * (h - 10) - 5]);
  const line = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={styles.area} aria-hidden="true">
      <defs><linearGradient id="mkA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="url(#mkA)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 5px ${color}88)` }} />
    </svg>
  );
}

function Spark({ data, color }: { data: number[]; color: string }) {
  const w = 80, h = 22, max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - (v / max) * (h - 3) - 1).toFixed(1)}`);
  return <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={styles.spark} aria-hidden="true"><polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
}

/** Real ad generation — POSTs /api/marketing/generate and renders the result. */
function AdGenerator({ onClose }: { onClose: () => void }) {
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [goal, setGoal] = useState("leads");
  const [format, setFormat] = useState<"image" | "video" | "carousel">("image");
  const [channels, setChannels] = useState<string[]>(["meta", "google"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AdResult | null>(null);

  function toggleChannel(id: string) {
    setChannels((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  async function generate() {
    if (!product.trim() || busy) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/marketing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, audience: audience || undefined, goal, format, channels: channels.length ? channels : ["meta"] }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Generation failed.");
      setResult(json.data as AdResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.genOverlay} role="dialog" aria-label="Ad generator">
      <div className={styles.genPanel}>
        <div className={styles.genHead}><span><Wand2 size={16} /> Generate ad creatives</span><button className={styles.genClose} type="button" onClick={onClose}><X size={16} /></button></div>
        <div className={styles.genForm}>
          <input className={styles.genInput} placeholder="Product / offer — e.g. Veldo, the autonomous revenue OS" value={product} onChange={(e) => setProduct(e.target.value)} />
          <input className={styles.genInput} placeholder="Audience (optional) — e.g. B2B SaaS founders" value={audience} onChange={(e) => setAudience(e.target.value)} />
          <div className={styles.genRow}>
            <select className={styles.genSelect} value={goal} onChange={(e) => setGoal(e.target.value)}>
              {["awareness", "leads", "sales", "signups"].map((g) => <option key={g} value={g}>Goal: {g}</option>)}
            </select>
            <select className={styles.genSelect} value={format} onChange={(e) => setFormat(e.target.value as typeof format)}>
              {["image", "video", "carousel"].map((f) => <option key={f} value={f}>Format: {f}</option>)}
            </select>
          </div>
          <div className={styles.genChannels}>
            {["meta", "google", "tiktok", "linkedin", "x"].map((c) => (
              <button key={c} type="button" className={`${styles.genChip} ${channels.includes(c) ? styles.genChipOn : ""}`} onClick={() => toggleChannel(c)}>{c}</button>
            ))}
          </div>
          <button className={styles.genBtn} type="button" disabled={busy || !product.trim()} onClick={generate}>
            {busy ? <><Loader2 className="spin" size={15} /> Generating…</> : <><Sparkles size={15} /> Generate</>}
          </button>
          {error && <div className={styles.genError}>{error}</div>}
        </div>
        {result && (
          <div className={styles.genResult}>
            <div className={styles.genConcept}><ImageIcon size={13} /> {result.creativeConcept}{result.demo ? " (media renders once FAL_KEY is set)" : ""}</div>
            {result.variants.map((v) => (
              <div className={styles.genVariant} key={v.channel}>
                <span className={styles.genVarChannel}>{v.channel}</span>
                <strong>{v.headline}</strong>
                <p>{v.primaryText}</p>
                <span className={styles.genCta}>{v.cta}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MarketingBoard() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [genOpen, setGenOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/marketing/channels").then((r) => r.json()).then((j) => { if (j?.ok) setChannels(j.data); }).catch(() => undefined);
  }, []);

  return (
    <div className={styles.wrap}>
      {/* hero */}
      <div className={styles.hero}>
        <div>
          <h1 className={styles.title}>Your AI marketing engine for <span className={styles.titleGrad}>revenue growth.</span></h1>
          <p className={styles.sub}>From strategy and creative to distribution and attribution, Veldo runs the full campaign loop.</p>
          <div className={styles.heroActions}>
            <a className={styles.primary} href="/campaigns/new"><Plus size={14} /> New campaign</a>
            <a className={styles.ghost} href="/agent"><Zap size={14} /> AI Command Center</a>
          </div>
        </div>
        <div className={styles.reco}>
          <div className={styles.recoHead}><span><Sparkles size={13} /> AI Recommendation</span><i>New</i></div>
          <p>Increase budgets on 2 high-performing campaigns</p>
          <div className={styles.recoStats}>Projected lift <b>+$8,420 revenue</b> <b className={styles.roas}>+24% ROAS</b></div>
          <button className={styles.recoBtn} type="button" onClick={() => setToast("Recommendations queued for your review in the AI Command Center.")}>Review recommendations <ArrowRight size={12} /></button>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpis}>
        {KPIS.map((k, i) => {
          const Icon = k.icon;
          return (
            <div className={styles.kpi} key={k.label} style={{ ["--accent" as string]: k.accent, animationDelay: `${i * 55}ms` }}>
              <div className={styles.kpiTop}><span className={styles.kpiIcon}><Icon size={14} /></span><span className={styles.kpiLabel}>{k.label}</span></div>
              <div className={styles.kpiValue}>{k.value}</div>
              <div className={styles.kpiDelta}><TrendingUp size={11} /> {k.delta}</div>
              <div className={styles.kpiSpark}><Spark data={[20, 34, 28, 44, 40, 56, 62]} color={k.accent} /></div>
            </div>
          );
        })}
      </div>

      {/* row: performance + live campaigns + channels */}
      <div className={styles.row1}>
        <div className={styles.card}>
          <div className={styles.cardHead}><span>Performance overview</span><span className={styles.tag}>Last 30 days</span></div>
          <div className={styles.chartLegend}><span><i style={{ background: "#8b5cf6" }} /> Influenced revenue</span><span><i style={{ background: "#22d3ee" }} /> Spend</span></div>
          <Area points={[22, 30, 26, 38, 34, 46, 42, 56, 52, 64, 70, 82]} color="#8b5cf6" />
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}><span>Live campaigns</span><a className={styles.viewLink} href="/campaigns">View all campaigns</a></div>
          <div className={styles.tableHead}><span>Campaign</span><span>Channel</span><span>Status</span><span>Spend</span><span>ROAS</span><span>Trend</span></div>
          {CAMPAIGNS.map((c) => (
            <div className={styles.tRow} key={c.name}>
              <span className={styles.tName}>{c.name}</span>
              <span className={styles.tChannel}>{c.channel}</span>
              <span className={styles.livePill}><Play size={9} /> {c.status}</span>
              <span className={styles.tNum}>{c.spend}</span>
              <span className={styles.tRoas}>{c.roas}</span>
              <span className={styles.tSpark}><Spark data={c.spark} color="#8b5cf6" /></span>
            </div>
          ))}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}><span>Channel connections</span><a className={styles.viewLink} href="/settings/integrations">Manage</a></div>
          <div className={styles.chList}>
            {channels.map((c) => (
              <div className={styles.chRow} key={c.id}>
                <span className={styles.chLogo}>{c.name[0]}</span>
                <span className={styles.chName}>{c.name}</span>
                {c.configured ? (
                  <span className={styles.chOn}><CheckCircle2 size={11} /> Connected</span>
                ) : (
                  <a className={styles.chConnect} href="/settings/integrations">Connect</a>
                )}
                <span className={styles.chSync}>{c.configured ? "Syncing" : "—"}</span>
              </div>
            ))}
            {!channels.length && <div className={styles.empty}>Loading channels…</div>}
          </div>
        </div>
      </div>

      {/* creative gallery */}
      <div className={styles.card}>
        <div className={styles.cardHead}><span>Creative gallery</span><button className={styles.viewLink} type="button" onClick={() => setGenOpen(true)}>Generate new creative</button></div>
        <div className={styles.gallery}>
          {GALLERY.map((g) => (
            <div className={styles.creative} key={g.caption} style={{ ["--hue" as string]: g.hue }}>
              {g.video && <span className={styles.playBadge}><Play size={13} /></span>}
              <strong>{g.caption}</strong>
              <span className={styles.creativeTag}><Radio size={10} /> {g.tag}</span>
            </div>
          ))}
        </div>
      </div>

      {/* bottom row */}
      <div className={styles.row2}>
        <div className={styles.card}>
          <div className={styles.cardHead}><span>Attribution funnel</span><span className={styles.tag}>How revenue is influenced</span></div>
          <div className={styles.funnel}>
            {FUNNEL.map((f) => (
              <div className={styles.fRow} key={f.label}>
                <span className={styles.fLabel}>{f.label}</span>
                <span className={styles.fBar}><span style={{ width: `${f.pct}%`, background: f.money ? "linear-gradient(90deg,#22c55e,#22d3ee)" : "linear-gradient(90deg,#8b5cf6,#6366f1)" }} /></span>
                <span className={styles.fValue}>{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}><span>Budget &amp; credit usage</span><span className={styles.tag}>Renews in 9 days</span></div>
          <div className={styles.budget}>
            <div className={styles.bRow}><span>Marketing budget</span><b>63%</b></div>
            <div className={styles.bBar}><span style={{ width: "63%" }} /></div>
            <div className={styles.bRow}><span>Marketing credits</span><b>41%</b></div>
            <div className={styles.bBar}><span style={{ width: "41%", background: "linear-gradient(90deg,#22d3ee,#3b82f6)" }} /></div>
            <a className={styles.buyBtn} href="/pricing"><Coins size={13} /> Buy credits</a>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}><span>Recent outputs</span><a className={styles.viewLink} href="/campaigns">View all outputs</a></div>
          <div className={styles.outList}>
            {OUTPUTS.map((o) => (
              <div className={styles.outRow} key={o.name}>
                <span className={styles.outIcon}><ImageIcon size={13} /></span>
                <div><div className={styles.outName}>{o.name}</div><div className={styles.outSub}>{o.sub} · {o.ago}</div></div>
                <span className={styles.pubPill}>Published</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}><span>Quick actions</span></div>
          <div className={styles.qaList}>
            <a className={styles.qa} href="/campaigns/new"><span className={styles.qaIcon}><Megaphone size={14} /></span><div><strong>Launch a new campaign</strong><span>Create a campaign in minutes</span></div></a>
            <button className={styles.qa} type="button" onClick={() => setGenOpen(true)}><span className={styles.qaIcon}><Wand2 size={14} /></span><div><strong>Generate ad creatives</strong><span>AI images, videos &amp; copy</span></div></button>
            <a className={styles.qa} href="/lead-finder"><span className={styles.qaIcon}><Target size={14} /></span><div><strong>Build an audience</strong><span>From CRM, site, or integrations</span></div></a>
            <a className={styles.qa} href="/analytics"><span className={styles.qaIcon}><BarChart3 size={14} /></span><div><strong>View performance reports</strong><span>Deep insights and attribution</span></div></a>
          </div>
        </div>
      </div>

      {toast && <div className={styles.toast}><CheckCircle2 size={14} /> {toast}</div>}
      {genOpen && <AdGenerator onClose={() => setGenOpen(false)} />}
    </div>
  );
}
