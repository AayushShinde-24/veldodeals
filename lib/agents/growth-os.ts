import "server-only";

import { z } from "zod";
import { getDb } from "@/lib/agents/agent-helpers";

const recommendationSchema = z.object({
  title: z.string(),
  reason: z.string(),
  priority: z.enum(["low", "medium", "high"]),
});

export const growthPlanSchema = z.object({
  week: z.string(),
  mainGoal: z.string(),
  targetNiche: z.string(),
  whyThisNiche: z.string(),
  growthExperiments: z.array(recommendationSchema),
  outboundCampaigns: z.array(recommendationSchema),
  productImprovements: z.array(recommendationSchema),
  financeTargets: z.record(z.string(), z.unknown()),
  expectedResults: z.record(z.string(), z.unknown()),
  risks: z.array(z.string()),
  dailyExecutionPlan: z.array(z.string()),
  confidence: z.number().int().min(0).max(100),
  needs_review: z.boolean(),
});

export const businessInsightSchema = z.object({
  summary: z.string(),
  bestNiche: z.string(),
  revenueSignal: z.string(),
  bottlenecks: z.array(z.string()),
  recommendations: z.array(recommendationSchema),
  risks: z.array(z.string()),
  confidence: z.number().int().min(0).max(100),
  needs_review: z.boolean(),
});

export const expansionOpportunitySchema = z.object({
  opportunities: z.array(recommendationSchema),
  suggestedCampaigns: z.array(recommendationSchema),
  partnershipIdeas: z.array(recommendationSchema),
  confidence: z.number().int().min(0).max(100),
  needs_review: z.boolean(),
});

export const orchestratorOutputSchema = z.object({
  agentName: z.string(),
  task: z.string(),
  status: z.enum(["success", "failed", "needs_user_input"]),
  confidence: z.number().int().min(0).max(100),
  summary: z.string(),
  recommendations: z.array(recommendationSchema),
  nextActions: z.array(z.string()),
  data: z.record(z.string(), z.unknown()),
  risks: z.array(z.string()),
  logs: z.array(z.string()),
});

export type GrowthPlan = z.infer<typeof growthPlanSchema>;
export type BusinessInsight = z.infer<typeof businessInsightSchema>;
export type ExpansionOpportunity = z.infer<typeof expansionOpportunitySchema>;

type BusinessSnapshot = {
  campaigns: Array<Record<string, unknown>>;
  leads: Array<Record<string, unknown>>;
  sends: Array<Record<string, unknown>>;
  replies: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  credits: number;
};

export async function getAgentStatus(userId: string) {
  const db = getDb();
  const [tasks, logs, campaigns] = await Promise.all([
    db.from("agent_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    db.from("agent_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(25),
    db.from("campaigns").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(25),
  ]);
  if (tasks.error) throw new Error(tasks.error.message);
  if (logs.error) throw new Error(logs.error.message);
  if (campaigns.error) throw new Error(campaigns.error.message);

  return {
    agents: [
      { name: "Campaign Leader", status: "active", confidence: 92 },
      { name: "CEO Growth", status: "idle", confidence: 82 },
      { name: "Analytics", status: "active", confidence: 86 },
      { name: "Finance", status: "idle", confidence: 79 },
      { name: "Product Improvement", status: "idle", confidence: 75 },
      { name: "Support", status: "active", confidence: 83 },
    ],
    tasks: tasks.data ?? [],
    logs: logs.data ?? [],
    campaigns: campaigns.data ?? [],
  };
}

export async function generateGrowthPlan(userId: string) {
  const snapshot = await loadBusinessSnapshot(userId);
  const output = growthPlanSchema.parse({
    week: currentWeekLabel(),
    mainGoal: "Increase qualified reply volume while keeping send safety gates strict.",
    targetNiche: chooseNiche(snapshot),
    whyThisNiche: "Existing campaign and lead data point to SaaS revenue teams as the clearest near-term expansion motion.",
    growthExperiments: [
      high("Reply-rate diagnostic offer", "Pairs naturally with Veldo's quality scoring and personalization workflow."),
      medium("Founder-led outbound sequence", "Useful while product proof and case studies are still forming."),
    ],
    outboundCampaigns: [
      high("AI-native SaaS operators", "Strong fit for multi-agent workflow messaging."),
      medium("Revenue operations leaders", "Likely to value verification, routing, and auditability."),
    ],
    productImprovements: [
      high("Inline review console", "Human approval is mandatory, so review friction directly affects send velocity."),
      medium("Campaign health explanation", "Make leader decisions easier to trust and debug."),
    ],
    financeTargets: {
      creditsAvailable: snapshot.credits,
      targetCostPerApprovedSend: "keep below plan margin threshold",
    },
    expectedResults: {
      qualifiedReplies: Math.max(3, Math.round(snapshot.leads.length * 0.12)),
      meetings: Math.max(1, Math.round(snapshot.leads.length * 0.04)),
    },
    risks: ["Do not scale sends until email verification and human approval gates pass.", "Weak public signals should stay in review."],
    dailyExecutionPlan: [
      "Day 1: choose target niche and enrich first lead batch.",
      "Day 2: run company research and public signal collection.",
      "Day 3: score ICP and build personalization strategy.",
      "Day 4: draft, score, and review emails.",
      "Day 5: send approved drafts and monitor replies.",
    ],
    confidence: snapshot.campaigns.length || snapshot.leads.length ? 82 : 62,
    needs_review: snapshot.campaigns.length === 0 && snapshot.leads.length === 0,
  });

  await persistGrowthOutput(userId, "ceo_growth", "growth_plan", output);
  assertSupabase(await getDb().from("growth_plans").insert({ user_id: userId, plan_json: output, confidence: output.confidence, needs_review: output.needs_review }));
  return output;
}

export async function analyzeBusiness(userId: string) {
  const snapshot = await loadBusinessSnapshot(userId);
  const output = businessInsightSchema.parse({
    summary: `Veldo has ${snapshot.campaigns.length} campaigns, ${snapshot.leads.length} leads, ${snapshot.sends.length} sends, and ${snapshot.replies.length} classified replies available for analysis.`,
    bestNiche: chooseNiche(snapshot),
    revenueSignal: snapshot.replies.length > 0 ? "Replies are available for learning and CRM routing." : "Reply data is thin; prioritize approved sends and reply classification.",
    bottlenecks: deriveBottlenecks(snapshot),
    recommendations: [
      high("Improve review throughput", "The MVP requires user approval before sending, so review UX is a growth lever."),
      medium("Track niche-level reply quality", "Segment analytics will improve Campaign Leader routing."),
    ],
    risks: ["Do not treat weak signals as strong.", "Do not deduct credits before successful send usage events."],
    confidence: snapshot.campaigns.length ? 84 : 60,
    needs_review: snapshot.campaigns.length === 0,
  });

  await persistGrowthOutput(userId, "analytics_growth", "business_insight", output);
  assertSupabase(await getDb().from("business_insights").insert({ user_id: userId, insight_json: output, confidence: output.confidence, needs_review: output.needs_review }));
  return output;
}

export async function findExpansionOpportunities(userId: string) {
  const snapshot = await loadBusinessSnapshot(userId);
  const output = expansionOpportunitySchema.parse({
    opportunities: [
      high("AI-native SaaS revenue teams", "The product promise maps cleanly to workflow automation and personalization quality."),
      medium("Outbound agencies", "Agencies can resell repeatable campaign systems once controls are clear."),
      medium("Sales operations consultants", "They understand credits, approvals, deliverability, and CRM handoff pain."),
    ],
    suggestedCampaigns: [
      high("Reply-rate audit campaign", "A concrete offer with measurable pain."),
      medium("Personalization risk cleanup", "Strong for teams worried about AI-generated outreach quality."),
    ],
    partnershipIdeas: [
      medium("Deliverability consultants", "Adds trust around verification and sending gates."),
      medium("CRM implementation partners", "Extends reply-to-deal workflows."),
    ],
    confidence: snapshot.leads.length ? 80 : 65,
    needs_review: snapshot.leads.length === 0,
  });

  await persistGrowthOutput(userId, "ceo_growth", "expansion_opportunity", output);
  assertSupabase(await getDb().from("growth_experiments").insert({
    user_id: userId,
    name: "Expansion opportunity scan",
    experiment_json: output,
    status: output.needs_review ? "needs_review" : "planned",
  }));
  return output;
}

export async function orchestrateGrowthTask(userId: string, task: string) {
  const normalized = task.toLowerCase();
  const data = normalized.includes("finance") || normalized.includes("business")
    ? await analyzeBusiness(userId)
    : normalized.includes("expand") || normalized.includes("opportun")
      ? await findExpansionOpportunities(userId)
      : await generateGrowthPlan(userId);

  const output = orchestratorOutputSchema.parse({
    agentName: "growth_orchestrator",
    task,
    status: data.needs_review ? "needs_user_input" : "success",
    confidence: data.confidence,
    summary: "Growth Orchestrator routed the task to the best advisory agent and persisted the typed output.",
    recommendations: "recommendations" in data ? data.recommendations : "opportunities" in data ? data.opportunities : data.growthExperiments,
    nextActions: ["Review the saved output.", "Approve any external action manually.", "Run Campaign Leader for execution tasks."],
    data,
    risks: "risks" in data ? data.risks : ["Expansion ideas require human review before execution."],
    logs: ["Task received", "Agent selected", "Output validated", "Decision logged"],
  });

  await persistGrowthOutput(userId, "growth_orchestrator", "orchestrate", output);
  return output;
}

async function loadBusinessSnapshot(userId: string): Promise<BusinessSnapshot> {
  const db = getDb();
  const [campaigns, leads, sends, replies, tasks, user] = await Promise.all([
    db.from("campaigns").select("*").eq("user_id", userId).limit(200),
    db.from("leads").select("*").eq("user_id", userId).limit(500),
    db.from("email_send_events").select("*").eq("user_id", userId).limit(500),
    db.from("reply_events").select("*").eq("user_id", userId).limit(500),
    db.from("agent_tasks").select("*").eq("user_id", userId).limit(500),
    db.from("users").select("credits_balance").eq("id", userId).maybeSingle(),
  ]);

  for (const result of [campaigns, leads, sends, replies, tasks, user]) {
    if (result.error) throw new Error(result.error.message);
  }

  return {
    campaigns: campaigns.data ?? [],
    leads: leads.data ?? [],
    sends: sends.data ?? [],
    replies: replies.data ?? [],
    tasks: tasks.data ?? [],
    credits: Number(user.data?.credits_balance ?? 0),
  };
}

async function persistGrowthOutput(userId: string, agentName: string, taskType: string, output: Record<string, unknown>) {
  const db = getDb();
  const confidence = typeof output.confidence === "number" ? output.confidence : 0;
  const needsReview = output.needs_review === true || output.status === "needs_user_input";

  const writes = await Promise.all([
    db.from("agent_logs").insert({
      user_id: userId,
      agent_name: agentName,
      level: needsReview ? "warn" : "info",
      message: `${taskType} completed by Growth OS.`,
      metadata: { confidence, needs_review: needsReview },
    }),
    db.from("agent_decisions").insert({
      user_id: userId,
      agent_name: agentName,
      decision_json: output,
      confidence,
      needs_human_review: needsReview,
    }),
    db.from("agent_memory").insert({
      user_id: userId,
      memory_type: taskType,
      content_json: output,
      confidence,
      needs_review: needsReview,
    }),
  ]);
  writes.forEach(assertSupabase);
}

function assertSupabase(result: { error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
}

function chooseNiche(snapshot: BusinessSnapshot) {
  const firstCampaign = snapshot.campaigns.find((campaign) => typeof campaign.name === "string");
  if (firstCampaign) return String(firstCampaign.name);
  return "AI-native B2B SaaS revenue teams";
}

function deriveBottlenecks(snapshot: BusinessSnapshot) {
  const blockers = snapshot.tasks.filter((task) => ["failed", "blocked", "needs_review"].includes(String(task.status)));
  const values = [];
  if (blockers.length) values.push(`${blockers.length} agent tasks need review or recovery.`);
  if (snapshot.sends.length === 0) values.push("No successful send events yet, so learning data is limited.");
  if (snapshot.replies.length === 0) values.push("No classified replies yet, so CRM and revenue attribution are thin.");
  return values.length ? values : ["No major blocker detected from available data."];
}

function high(title: string, reason: string) {
  return { title, reason, priority: "high" as const };
}

function medium(title: string, reason: string) {
  return { title, reason, priority: "medium" as const };
}

function currentWeekLabel() {
  const now = new Date();
  return `${now.getUTCFullYear()}-W${Math.ceil((now.getUTCDate() + 6) / 7)}`;
}
