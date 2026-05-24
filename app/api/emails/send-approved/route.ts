import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { enqueueAndRun } from "@/lib/api/enqueue-run";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    const leadId = String(body.lead_id);
    const campaignId = String(body.campaign_id);
    const approvalStatus = body.approved === false ? "rejected" : "approved";
    const db = createServiceClient();

    const { error } = await db
      .from("personalized_emails")
      .update({ approval_status: approvalStatus, approved_at: approvalStatus === "approved" ? new Date().toISOString() : null })
      .eq("user_id", userId)
      .eq("campaign_id", campaignId)
      .eq("lead_id", leadId);
    if (error) throw new Error(error.message);

    if (approvalStatus === "rejected") return ok({ approval_status: "rejected" });

    return ok(await enqueueAndRun({
      userId,
      campaignId,
      leadId,
      agentName: "sending",
      taskType: "send_approved_email",
      inputJson: body,
      priority: 2,
    }));
  } catch (error) {
    return fail(error);
  }
}
