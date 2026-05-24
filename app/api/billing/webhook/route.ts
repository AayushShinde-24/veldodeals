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
      agentName: "billing_credits",
      taskType: "payment_webhook",
      inputJson: { ...body, payment_webhook: true },
      priority: 1,
    }));
  } catch (error) {
    return fail(error);
  }
}
