import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { getAgentStatus } from "@/lib/agents/growth-os";
import { getUserIdFromRequest } from "@/lib/security/request";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    return ok(await getAgentStatus(userId));
  } catch (error) {
    return fail(error);
  }
}
