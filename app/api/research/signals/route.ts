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
      campaignId: String(body.campaign_id),
      leadId: String(body.lead_id),
      agentName: "public_signal_research",
      taskType: "research_public_signals",
      inputJson: body,
    }));
  } catch (error) {
    return fail(error);
  }
}
