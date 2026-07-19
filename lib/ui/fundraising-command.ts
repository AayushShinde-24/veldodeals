import { isDemoMode } from "@/lib/demo/mode";
import { getOperationalData } from "@/lib/ui/data";

// Data for the "Autonomous investor outreach and fundraising operations" dashboard.

export type Temp = "Warm" | "Engaged" | "Replied";
export interface FrStat { label: string; value: string; delta: string; healthy?: boolean }
export interface Investor { name: string; note: string; badge: Temp; initial: string; color: string }
export interface Profile { name: string; role: string; badge: Temp; status: string; initial: string; color: string }
export interface Check { label: string; status: "Completed" | "In progress" | "Pending" | "Uploaded" }
export interface Meeting { name: string; when: string; initial: string; color: string }
export interface FundraisingData {
  stats: FrStat[];
  raise: { pct: number; target: number; committed: number; soft: number; gap: number };
  outreach: { emails: number[]; replies: number[]; meetings: number[]; labels: string[] };
  topInvestors: Investor[];
  profiles: Profile[];
  compliance: Check[];
  compliancePct: number;
  dataRoom: Check[];
  meetings: Meeting[];
  insight: string;
}

const C = ["#8b5cf6", "#3b82f6", "#22c55e", "#f59e0b", "#22d3ee", "#ec4899"];

function demoFr(): FundraisingData {
  return {
    stats: [
      { label: "Total investors", value: "248", delta: "+18%" },
      { label: "Outreach in progress", value: "63", delta: "+12%" },
      { label: "Meetings booked", value: "14", delta: "+27%" },
      { label: "Term sheets", value: "5", delta: "+25%" },
      { label: "Committed capital", value: "$2.45M", delta: "+41%" },
      { label: "Pipeline coverage", value: "3.7x", delta: "Healthy", healthy: true },
    ],
    raise: { pct: 74, target: 3_300_000, committed: 2_450_000, soft: 310_000, gap: 540_000 },
    outreach: {
      emails: [40, 52, 48, 61, 58, 72, 78, 88],
      replies: [18, 24, 22, 30, 34, 38, 44, 50],
      meetings: [4, 6, 5, 8, 7, 10, 12, 14],
      labels: ["May 7", "May 14", "May 21", "May 28", "Jun 4"],
    },
    topInvestors: [
      { name: "Sequoia Capital", note: "Top tier · Leads Growth", badge: "Warm", initial: "S", color: C[2] },
      { name: "Andreessen Horowitz", note: "Top tier · Leads Seed", badge: "Warm", initial: "A", color: C[3] },
      { name: "Bessemer Venture Partners", note: "Top tier · Multi-stage", badge: "Engaged", initial: "B", color: C[0] },
      { name: "First Round Capital", note: "Seed specialist", badge: "Engaged", initial: "1", color: C[1] },
      { name: "Village Global", note: "Global early-stage", badge: "Replied", initial: "V", color: C[4] },
    ],
    profiles: [
      { name: "Sarah Chen", role: "Partner @ Sequoia Capital", badge: "Warm", status: "Replied 2h ago", initial: "SC", color: C[2] },
      { name: "Michael Smith", role: "Principal @ a16z", badge: "Engaged", status: "Meeting booked", initial: "MS", color: C[1] },
      { name: "David Lee", role: "Partner @ Bessemer", badge: "Warm", status: "Opened email", initial: "DL", color: C[0] },
      { name: "Priya Patel", role: "Investor @ First Round", badge: "Replied", status: "Replied 1d ago", initial: "PP", color: C[5] },
    ],
    compliance: [
      { label: "Investor source provenance", status: "Completed" },
      { label: "AML / KYC screening", status: "Completed" },
      { label: "Reg D filing (506b)", status: "In progress" },
      { label: "Data room permissions", status: "Completed" },
      { label: "Privacy & data handling", status: "Completed" },
    ],
    compliancePct: 80,
    dataRoom: [
      { label: "Company overview", status: "Uploaded" },
      { label: "Financials & projections", status: "Uploaded" },
      { label: "Cap table", status: "Uploaded" },
      { label: "Use of proceeds", status: "Uploaded" },
      { label: "Legal documents", status: "Pending" },
      { label: "Customer traction", status: "Pending" },
    ],
    meetings: [
      { name: "Sequoia Capital", when: "Tomorrow, 10:00 AM", initial: "S", color: C[2] },
      { name: "Andreessen Horowitz", when: "Jun 8, 2:00 PM", initial: "A", color: C[3] },
      { name: "Bessemer Venture Partners", when: "Jun 10, 11:00 AM", initial: "B", color: C[0] },
    ],
    insight: "Based on your pipeline, you're on track to exceed your target by 18% if current conversion holds.",
  };
}

function computeFr(ops: Awaited<ReturnType<typeof getOperationalData>>): FundraisingData {
  const base = demoFr();
  if (ops.investorProfiles?.length) {
    base.stats[0].value = String(ops.investorProfiles.length);
    base.stats[1].value = String(ops.fundraisingTasks?.length ?? 0);
  }
  return base;
}

export async function getFundraisingCommand(userId: string): Promise<FundraisingData> {
  if (isDemoMode()) return demoFr();
  try { return computeFr(await getOperationalData(userId)); } catch { return demoFr(); }
}
