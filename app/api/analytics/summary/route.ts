import { ok, fail } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getWorkspaceContext } from "@/src/lib/workspace/context";

export async function GET() {
  try {
    const context = await getWorkspaceContext();
    if (!context) throw new Error("Sign in before loading analytics.");
    const db = createServiceClient();
    const [events, emails, replies, deals, meetings] = await Promise.all([
      db.from("analytics_events").select("*").eq("workspace_id", context.workspaceId).order("created_at", { ascending: false }).limit(500),
      db.from("emails").select("*").eq("workspace_id", context.workspaceId).limit(500),
      db.from("replies").select("*").eq("workspace_id", context.workspaceId).limit(500),
      db.from("crm_deals").select("*").eq("workspace_id", context.workspaceId).limit(500),
      db.from("calendar_events").select("*").eq("workspace_id", context.workspaceId).limit(200),
    ]);
    const firstError = [events, emails, replies, deals, meetings].find((result) => result.error)?.error;
    if (firstError) throw new Error(firstError.message);
    return ok({
      events: events.data ?? [],
      metrics: {
        emailsSent: (emails.data ?? []).filter((email) => email.status === "sent").length,
        replies: replies.data?.length ?? 0,
        replyRate: emails.data?.length ? Math.round(((replies.data?.length ?? 0) / emails.data.length) * 100) : 0,
        openDeals: (deals.data ?? []).filter((deal) => !["won", "lost"].includes(String(deal.stage))).length,
        meetingsBooked: meetings.data?.length ?? 0,
      },
    });
  } catch (error) {
    return fail(error);
  }
}
