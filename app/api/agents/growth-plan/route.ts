import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { generateGrowthPlan } from "@/lib/agents/growth-os";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    return ok(await generateGrowthPlan(userId));
  } catch (error) {
    return fail(error);
  }
}
