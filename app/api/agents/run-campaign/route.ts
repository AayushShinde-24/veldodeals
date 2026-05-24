import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { processQueuedTask } from "@/lib/agents/agent-runner";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    const limit = Math.min(Number(body.limit ?? 10), 50);
    const results = [];
    for (let index = 0; index < limit; index += 1) {
      const result = await processQueuedTask(userId);
      results.push(result);
      if (!result.ran) break;
    }
    return ok({ results });
  } catch (error) {
    return fail(error);
  }
}
