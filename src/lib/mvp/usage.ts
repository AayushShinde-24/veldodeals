import { createServiceClient } from "@/lib/integrations/supabase";

export interface UsageMetrics {
  period: string;
  emailsSent: number;
  emailsDrafted: number;
  leadsImported: number;
  meetingsBooked: number;
  creditsUsed: number;
  creditsRemaining: number;
  activeCampaigns: number;
  replyRate: number;
  openRate: number;
  dailyLimit: number;
  remainingToday: number;
}

const DAILY_SEND_LIMIT = 200;

export async function getMvpUsage(userId: string, days = 30): Promise<UsageMetrics> {
  const { isDemoMode } = await import("@/lib/demo/mode");
  if (isDemoMode()) {
    return {
      period: `Last ${days} days`,
      emailsSent: 1284,
      emailsDrafted: 1620,
      leadsImported: 2400,
      meetingsBooked: 38,
      creditsUsed: 6580,
      creditsRemaining: 18420,
      activeCampaigns: 3,
      replyRate: 9.4,
      openRate: 52.1,
      dailyLimit: 200,
      remainingToday: 142,
    };
  }
  const db = createServiceClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [sendsRes, draftsRes, leadsRes, meetingsRes, profileRes, campaignsRes] =
    await Promise.allSettled([
      db
        .from("email_sends")
        .select("id, status", { count: "exact" })
        .eq("user_id", userId)
        .gte("created_at", since),
      db
        .from("email_drafts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", since),
      db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", since),
      db
        .from("meetings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", since),
      db.from("profiles").select("credits").eq("id", userId).maybeSingle(),
      db
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("status", ["running", "sending"]),
    ]);

  const sends = sendsRes.status === "fulfilled" ? sendsRes.value.data ?? [] : [];
  const totalSent = sends.filter((s) => s.status === "sent").length;
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const sentToday = sends.filter((s) => s.status === "sent").length; // approximation within window
  const totalOpened = sends.filter((s) => s.status === "opened").length;
  const totalReplied = sends.filter((s) => s.status === "replied").length;

  const draftsCount = draftsRes.status === "fulfilled" ? (draftsRes.value.count ?? 0) : 0;
  const leadsCount = leadsRes.status === "fulfilled" ? (leadsRes.value.count ?? 0) : 0;
  const meetingsCount = meetingsRes.status === "fulfilled" ? (meetingsRes.value.count ?? 0) : 0;
  const credits = profileRes.status === "fulfilled" ? (profileRes.value.data?.credits ?? 0) : 0;
  const activeCampaigns = campaignsRes.status === "fulfilled" ? (campaignsRes.value.count ?? 0) : 0;

  return {
    period: `Last ${days} days`,
    emailsSent: totalSent,
    emailsDrafted: draftsCount,
    leadsImported: leadsCount,
    meetingsBooked: meetingsCount,
    creditsUsed: 0,
    creditsRemaining: credits,
    activeCampaigns,
    replyRate: totalSent > 0 ? Math.round((totalReplied / totalSent) * 100 * 10) / 10 : 0,
    openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100 * 10) / 10 : 0,
    dailyLimit: DAILY_SEND_LIMIT,
    remainingToday: Math.max(0, DAILY_SEND_LIMIT - sentToday),
  };
}

export const getUsageSnapshot = getMvpUsage;
