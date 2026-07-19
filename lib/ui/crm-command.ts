import { isDemoMode } from "@/lib/demo/mode";
import { getOperationalData } from "@/lib/ui/data";

// Data for the CRM "Deal execution and pipeline intelligence" board.

export type Priority = "Low" | "Medium" | "High";
export interface Deal { company: string; amount: number; prob: number; delta: number; lastTouch: string; priority: Priority }
export interface Stage { num: string; name: string; value: number; count: number; deals: Deal[] }
export interface CrmStat { label: string; value: string; delta: string; spark: number[] }
export interface FollowUp { title: string; company: string; risk: Priority; due: string }
export interface Risk { company: string; risk: Priority; reason: string }
export interface Activity { time: string; kind: "email" | "meeting" | "stage" | "note"; title: string; company: string; detail: string }
export interface Suggestion { kind: "nudge" | "risk" | "cross" | "task"; tag: string; title: string; body: string; cta: string }
export interface CrmData {
  stats: CrmStat[];
  health: { score: number; label: string };
  stages: Stage[];
  forecast: { value: string; delta: string; points: number[]; months: string[] };
  byStage: { name: string; value: number; color: string }[];
  followUps: FollowUp[];
  risks: Risk[];
  activity: Activity[];
  suggestions: Suggestion[];
}

function spark(seed: string, n = 10): number[] {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const out: number[] = []; let v = 40 + (h % 25);
  for (let i = 0; i < n; i++) { h = (h * 1103515245 + 12345) >>> 0; v = Math.max(15, Math.min(92, v + ((h % 30) - 13))); out.push(Math.round(v)); }
  return out;
}
function money(n: number): string { return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`; }

function demoCrm(): CrmData {
  const stages: Stage[] = [
    { num: "01", name: "Interested", value: 1_400_000, count: 6, deals: [
      { company: "Northwind Labs", amount: 220_000, prob: 10, delta: 10, lastTouch: "2d ago", priority: "Low" },
      { company: "BluePeak Ventures", amount: 180_000, prob: 5, delta: 10, lastTouch: "5d ago", priority: "Low" },
      { company: "Greenfield Capital", amount: 400_000, prob: 10, delta: 30, lastTouch: "7d ago", priority: "Medium" },
    ] },
    { num: "02", name: "Meeting booked", value: 3_600_000, count: 5, deals: [
      { company: "Stratus Technologies", amount: 650_000, prob: 20, delta: 10, lastTouch: "1d ago", priority: "Low" },
      { company: "Crestline Holdings", amount: 500_000, prob: 20, delta: 10, lastTouch: "2d ago", priority: "Low" },
      { company: "Summit Ridge Group", amount: 1_450_000, prob: 40, delta: 20, lastTouch: "3d ago", priority: "Medium" },
    ] },
    { num: "03", name: "Demo done", value: 3_700_000, count: 4, deals: [
      { company: "Apex Industries", amount: 900_000, prob: 30, delta: 40, lastTouch: "1d ago", priority: "High" },
      { company: "Pioneer Holdings", amount: 870_000, prob: 20, delta: 30, lastTouch: "2d ago", priority: "Medium" },
      { company: "Beacon Solutions", amount: 1_930_000, prob: 40, delta: 30, lastTouch: "4d ago", priority: "Medium" },
    ] },
    { num: "04", name: "Proposal sent", value: 5_800_000, count: 4, deals: [
      { company: "Orbitus Systems", amount: 2_100_000, prob: 60, delta: 0, lastTouch: "1d ago", priority: "High" },
      { company: "Vertex Global", amount: 1_400_000, prob: 70, delta: 10, lastTouch: "3d ago", priority: "Medium" },
      { company: "OmniBridge Corp", amount: 2_300_000, prob: 60, delta: 30, lastTouch: "1d ago", priority: "High" },
    ] },
    { num: "05", name: "Negotiation", value: 5_100_000, count: 3, deals: [
      { company: "Titan Horizon", amount: 2_250_000, prob: 80, delta: 0, lastTouch: "1d ago", priority: "High" },
      { company: "Equinox Partners", amount: 850_000, prob: 80, delta: 40, lastTouch: "2d ago", priority: "Medium" },
      { company: "Vector Analytics", amount: 700_000, prob: 80, delta: 10, lastTouch: "3d ago", priority: "Medium" },
    ] },
    { num: "06", name: "Won", value: 1_700_000, count: 1, deals: [
      { company: "Aurora Capital", amount: 1_300_000, prob: 100, delta: 0, lastTouch: "6d ago", priority: "Low" },
    ] },
  ];
  const stageColors = ["#8b5cf6", "#6366f1", "#3b82f6", "#22d3ee", "#f59e0b", "#22c55e"];
  return {
    stats: [
      { label: "Pipeline value", value: "$18.7M", delta: "+24%", spark: spark("pv") },
      { label: "Weighted forecast", value: "$6.4M", delta: "+18%", spark: spark("wf") },
      { label: "Deals in pipeline", value: "28", delta: "+12", spark: spark("dp") },
      { label: "Win rate (weighted)", value: "34%", delta: "+6pp", spark: spark("wr") },
      { label: "Avg deal size", value: "$667K", delta: "+8%", spark: spark("ad") },
    ],
    health: { score: 76, label: "Good" },
    stages,
    forecast: { value: "$6.4M", delta: "+18%", points: [30, 42, 38, 55, 60, 72, 68, 84], months: ["May", "Jun", "Jul"] },
    byStage: stages.map((s, i) => ({ name: s.name, value: s.value, color: stageColors[i] })),
    followUps: [
      { title: "Send proposal to Orbitus Systems", company: "Orbitus Systems", risk: "High", due: "Today" },
      { title: "Prepare ROI model for Titan Horizon", company: "Titan Horizon", risk: "High", due: "Tomorrow" },
      { title: "Security review — Apex Industries", company: "Apex Industries", risk: "Medium", due: "2d" },
      { title: "Executive call with Vertex Global", company: "Vertex Global", risk: "Low", due: "3d" },
      { title: "Contract finalization — Aurora Capital", company: "Aurora Capital", risk: "Low", due: "5d" },
    ],
    risks: [
      { company: "OmniBridge Corp", risk: "High", reason: "No activity in 6 days" },
      { company: "Greenfield Capital", risk: "Medium", reason: "Budget not confirmed" },
      { company: "Pioneer Holdings", risk: "Medium", reason: "Decision maker MIA" },
    ],
    activity: [
      { time: "11:24 AM", kind: "email", title: "Email opened by", company: "Orbitus Systems", detail: "Proposal Follow-up" },
      { time: "10:08 AM", kind: "meeting", title: "Meeting completed with", company: "Titan Horizon", detail: "Discovery Call" },
      { time: "09:15 AM", kind: "stage", title: "Deal stage updated", company: "Apex Industries", detail: "Demo → Proposal sent" },
      { time: "08:42 AM", kind: "note", title: "New note added", company: "Vertex Global", detail: "Pricing discussion" },
    ],
    suggestions: [
      { kind: "nudge", tag: "High impact", title: "Orbitus Systems has high engagement", body: "Send a case study to accelerate.", cta: "Do it now" },
      { kind: "risk", tag: "At risk", title: "Greenfield Capital shows no activity for 7 days", body: "", cta: "Re-engage" },
      { kind: "cross", tag: "Cross-sell opportunity", title: "Apex Industries is a good fit for Veldo Insights", body: "", cta: "Create campaign" },
      { kind: "task", tag: "Smart task created", title: "Follow-up task created for Titan Horizon", body: "", cta: "View task" },
    ],
  };
}

function computeCrm(ops: Awaited<ReturnType<typeof getOperationalData>>): CrmData {
  const base = demoCrm();
  const deals = ops.deals ?? [];
  if (!deals.length) return base;
  const total = deals.reduce((s, d) => s + (Number(d.amount ?? d.value ?? 0) || 0), 0);
  const weighted = deals.reduce((s, d) => s + (Number(d.amount ?? d.value ?? 0) || 0) * (Number(d.probability ?? 0) / 100), 0);
  const won = deals.filter((d) => String(d.stage) === "won").length;
  base.stats[0].value = money(total);
  base.stats[1].value = money(weighted);
  base.stats[2].value = String(deals.length);
  base.stats[3].value = `${deals.length ? Math.round((won / deals.length) * 100) : 0}%`;
  base.stats[4].value = money(deals.length ? Math.round(total / deals.length) : 0);
  return base;
}

export async function getCrmCommand(userId: string): Promise<CrmData> {
  if (isDemoMode()) return demoCrm();
  try { return computeCrm(await getOperationalData(userId)); } catch { return demoCrm(); }
}
