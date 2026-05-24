import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { runSendGateAgent } from "@/lib/agents/send-gate-agent";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    const campaignId = String(body.campaign_id ?? "");
    const leadId = String(body.lead_id ?? "");
    if (!campaignId || !leadId) throw new Error("campaign_id and lead_id are required.");
    return ok(await runSendGateAgent(body, { userId, campaignId, leadId }));
  } catch (error) {
    return fail(error);
  }
}
