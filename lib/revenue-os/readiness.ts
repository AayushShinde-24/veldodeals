import { createServiceClient } from "@/lib/integrations/supabase";

export interface ReadinessScore {
  overall: number;
  label: "Not Ready" | "Getting Started" | "On Track" | "Ready to Scale";
  dimensions: {
    dataQuality: number;
    campaignSetup: number;
    integrations: number;
    deliverability: number;
  };
  topBlockers: string[];
  nextSteps: string[];
}

export type ReadinessStatus = "ready" | "mocked" | "blocked";

export interface ReadinessArea {
  area: string;
  status: ReadinessStatus;
  owner: string;
  detail: string;
}

/** Static launch-readiness matrix surfaced across integrations/calls/fundraising pages. */
export function getLaunchReadiness(): ReadinessArea[] {
  const has = (key: string) => Boolean(process.env[key]);
  return [
    { area: "Mailbox sending", status: has("GOOGLE_CLIENT_ID") ? "ready" : "blocked", owner: "Platform", detail: "Gmail OAuth send pipeline." },
    { area: "AI models", status: has("ANTHROPIC_API_KEY") || has("OPENAI_API_KEY") ? "ready" : "blocked", owner: "AI", detail: "Anthropic + OpenAI routing." },
    { area: "Lead sourcing", status: has("APOLLO_API_KEY") ? "ready" : "mocked", owner: "Sales", detail: "Apollo contact data." },
    { area: "Email verification", status: has("ZEROBOUNCE_API_KEY") ? "ready" : "mocked", owner: "Deliverability", detail: "Pre-send verification." },
    { area: "Company research", status: has("TAVILY_API_KEY") ? "ready" : "mocked", owner: "AI", detail: "Real-time web research." },
    { area: "Billing", status: has("STRIPE_SECRET_KEY") ? "ready" : "blocked", owner: "Revenue", detail: "Stripe checkout + webhooks." },
    { area: "AI voice calls", status: has("VOICE_PROVIDER_API_KEY") ? "ready" : "mocked", owner: "Sales", detail: "Voice provider not yet integrated." },
    { area: "DNC checks", status: "mocked", owner: "Compliance", detail: "Do-not-call list verification." },
    { area: "Investor sourcing", status: has("INVESTOR_DB_API_KEY") ? "ready" : "mocked", owner: "Fundraising", detail: "Investor database integration." },
    { area: "Fundraising compliance", status: "mocked", owner: "Legal", detail: "Securities-language review gate." },
  ];
}

export async function getRevenueReadiness(userId: string): Promise<ReadinessScore> {
  const { isDemoMode } = await import("@/lib/demo/mode");
  if (isDemoMode()) {
    return {
      overall: 86,
      label: "Ready to Scale",
      dimensions: { dataQuality: 90, campaignSetup: 100, integrations: 80, deliverability: 74 },
      topBlockers: [],
      nextSteps: ["Warm up the 2nd sending mailbox", "Enable auto-send for ICP ≥ 80"],
    };
  }
  const db = createServiceClient();

  const [profileRes, campaignsRes, googleRes, leadsRes] = await Promise.allSettled([
    db.from("profiles").select("credits, plan, company_name").eq("id", userId).maybeSingle(),
    db.from("campaigns").select("id, status").eq("user_id", userId).limit(5),
    db.from("google_tokens").select("id").eq("user_id", userId).maybeSingle(),
    db.from("leads").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const profile = profileRes.status === "fulfilled" ? profileRes.value.data : null;
  const campaigns = campaignsRes.status === "fulfilled" ? campaignsRes.value.data ?? [] : [];
  const googleConnected = googleRes.status === "fulfilled" && !!googleRes.value.data;
  const leadCount = leadsRes.status === "fulfilled" ? (leadsRes.value.count ?? 0) : 0;

  const blockers: string[] = [];
  const nextSteps: string[] = [];

  // Data quality dimension (0-100)
  let dataQuality = 30;
  if (profile?.company_name) dataQuality += 20;
  if (leadCount >= 10) dataQuality += 25;
  if (leadCount >= 100) dataQuality += 25;
  else nextSteps.push(`Import at least 100 leads (you have ${leadCount}).`);

  // Campaign setup (0-100)
  let campaignSetup = 0;
  if (campaigns.length > 0) campaignSetup = 40;
  const activeCampaigns = campaigns.filter((c) => ["running", "sending"].includes(c.status ?? ""));
  if (activeCampaigns.length > 0) campaignSetup = 100;
  else nextSteps.push("Create and activate a campaign.");

  // Integrations (0-100)
  let integrations = 20;
  if (googleConnected) integrations = 80;
  else {
    blockers.push("Gmail not connected. Emails cannot be sent.");
    nextSteps.push("Connect Gmail in Settings → Integrations.");
  }
  if (process.env.ANTHROPIC_API_KEY) integrations = Math.min(100, integrations + 20);

  // Deliverability (0-100)
  const deliverability = googleConnected ? 70 : 20;
  if (!googleConnected) blockers.push("No sending account configured.");

  const overall = Math.round((dataQuality + campaignSetup + integrations + deliverability) / 4);
  const label =
    overall >= 80 ? "Ready to Scale" : overall >= 60 ? "On Track" : overall >= 35 ? "Getting Started" : "Not Ready";

  return {
    overall,
    label,
    dimensions: { dataQuality, campaignSetup, integrations, deliverability },
    topBlockers: blockers,
    nextSteps: nextSteps.slice(0, 3),
  };
}
