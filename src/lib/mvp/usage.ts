import "server-only";

import { createServiceClient } from "@/lib/integrations/supabase";

const planLimits: Record<string, number> = {
  free: 10,
  starter: 50,
  go: 100,
  growth: 150,
  grow: 150,
  pro: 300,
  plus: 350,
  expand: 500,
  advanced_expansion: 750,
  custom_enterprise: 1000,
};

export async function getUsageSnapshot(userId: string) {
  const db = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const [{ data: user }, { data: todayUsage }, { data: monthRows }, { data: account }] = await Promise.all([
    db.from("users").select("plan").eq("id", userId).maybeSingle(),
    db.from("usage").select("*").eq("user_id", userId).eq("usage_date", today).maybeSingle(),
    db.from("usage").select("*").eq("user_id", userId).eq("usage_month", month),
    db.from("connected_accounts").select("created_at,connected_at").eq("user_id", userId).eq("provider", "gmail").eq("status", "connected").order("created_at", { ascending: true }).limit(1).maybeSingle(),
  ]);

  const plan = String(user?.plan ?? "free");
  const baseLimit = planLimits[plan] ?? planLimits.free;
  const connectedAt = account?.connected_at ?? account?.created_at;
  const accountAgeDays = connectedAt ? Math.floor((Date.now() - new Date(connectedAt).getTime()) / 86400000) : null;
  const dailyLimit = accountAgeDays !== null && accountAgeDays < 7 ? Math.min(baseLimit, 20) : baseLimit;
  const sentToday = Number(todayUsage?.emails_sent ?? 0);
  const monthUsage = (monthRows ?? []).reduce((acc, row) => ({
    emails_generated: acc.emails_generated + Number(row.emails_generated ?? 0),
    emails_sent: acc.emails_sent + Number(row.emails_sent ?? 0),
    leads_fetched: acc.leads_fetched + Number(row.leads_fetched ?? 0),
    leads_enriched: acc.leads_enriched + Number(row.leads_enriched ?? 0),
  }), { emails_generated: 0, emails_sent: 0, leads_fetched: 0, leads_enriched: 0 });

  return {
    plan,
    dailyLimit,
    sentToday,
    remainingToday: Math.max(0, dailyLimit - sentToday),
    month,
    monthUsage,
  };
}

export async function assertCanSendByUsage(userId: string) {
  const usage = await getUsageSnapshot(userId);
  if (usage.remainingToday <= 0) throw new Error("Daily sending limit reached.");
  return usage;
}

export async function incrementUsage(userId: string, field: "emails_generated" | "emails_sent" | "leads_fetched" | "leads_enriched", amount = 1) {
  const db = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const { data: row } = await db.from("usage").select("*").eq("user_id", userId).eq("usage_date", today).maybeSingle();
  if (!row) {
    await db.from("usage").insert({
      user_id: userId,
      usage_date: today,
      usage_month: month,
      [field]: amount,
    });
    return;
  }
  await db.from("usage").update({ [field]: Number(row[field] ?? 0) + amount }).eq("id", row.id);
}
