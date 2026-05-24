import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { enqueueAndRun } from "@/lib/api/enqueue-run";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const campaignId = request.nextUrl.searchParams.get("campaign_id");
    if (!campaignId) throw new Error("campaign_id is required.");
    const { data, error } = await createServiceClient()
      .from("campaign_learnings")
      .select("*")
      .eq("user_id", userId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    return ok(await enqueueAndRun({
      userId,
      campaignId: String(body.campaign_id),
      agentName: "analytics_learning",
      taskType: "learn_campaign",
      inputJson: body,
    }));
  } catch (error) {
    return fail(error);
  }
}
