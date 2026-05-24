import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { getCampaign } from "@/lib/campaigns/service";
import { getUserIdFromRequest } from "@/lib/security/request";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserIdFromRequest(request);
    const { id } = await context.params;
    return ok(await getCampaign(userId, id));
  } catch (error) {
    return fail(error);
  }
}
