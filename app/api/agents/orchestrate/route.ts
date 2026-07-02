import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { orchestrateGrowthTask } from "@/lib/agents/growth-os";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    const task = typeof body.task === "string" ? body.task : "Generate weekly growth plan";
    return ok(await orchestrateGrowthTask(userId, { task }));
  } catch (error) {
    return fail(error);
  }
}
