import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { enqueueAndRun } from "@/lib/api/enqueue-run";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";
import { applyPolicy } from "@/lib/security/rate-limit";

const schema = z.object({
  campaign_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  cheap_variant: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    if (!applyPolicy(userId, "email_write")) return fail("Too many email write requests. Please slow down.", 429);
    const input = schema.parse(body);
    return ok(await enqueueAndRun({
      userId,
      campaignId: input.campaign_id,
      leadId: input.lead_id,
      agentName: "email_writer",
      taskType: "write_email",
      inputJson: input,
    }));
  } catch (error) {
    return fail(error);
  }
}
