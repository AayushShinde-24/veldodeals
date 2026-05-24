import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { enqueueAndRun } from "@/lib/api/enqueue-run";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    return ok(await enqueueAndRun({
      userId,
      campaignId: typeof body.campaign_id === "string" ? body.campaign_id : undefined,
      leadId: typeof body.lead_id === "string" ? body.lead_id : undefined,
      agentName: "crm_sync",
      taskType: "sync_crm",
      inputJson: body,
    }));
  } catch (error) {
    return fail(error);
  }
}
