import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { runLeadOutboundWorkflow } from "@/lib/agents/campaign-workflow";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";

const schema = z.object({
  campaign_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  cheap_draft: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    const input = schema.parse(body);
    return ok(await runLeadOutboundWorkflow({
      userId,
      campaignId: input.campaign_id,
      leadId: input.lead_id,
      cheapDraft: input.cheap_draft === true,
    }));
  } catch (error) {
    return fail(error);
  }
}
