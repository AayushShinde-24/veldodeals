import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getUserIdFromRequest } from "@/lib/security/request";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const campaignId = request.nextUrl.searchParams.get("campaign_id");
    let query = createServiceClient().from("agent_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (campaignId) query = query.eq("campaign_id", campaignId);
    const { data, error } = await query.limit(200);
    if (error) throw new Error(error.message);
    return ok(data ?? []);
  } catch (error) {
    return fail(error);
  }
}
