import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { runSendGateAgent } from "@/lib/agents/send-gate-agent";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    const campaignId = String(body.campaign_id ?? "");
    const leadId = String(body.lead_id ?? "");
    const approved = body.approved !== false && body.approved !== "false";
    if (!campaignId || !leadId) throw new Error("campaign_id and lead_id are required.");

    const db = createServiceClient();
    const { error } = await db.from("personalized_emails").update({
      approval_status: approved ? "approved" : "rejected",
      approved_at: approved ? new Date().toISOString() : null,
    }).eq("user_id", userId).eq("campaign_id", campaignId).eq("lead_id", leadId);
    if (error) throw new Error(error.message);

    const gates = await runSendGateAgent({}, { userId, campaignId, leadId });
    return ok({ approval_status: approved ? "approved" : "rejected", gates });
  } catch (error) {
    return fail(error);
  }
}
