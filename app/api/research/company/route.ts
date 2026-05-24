import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { enqueueAndRun } from "@/lib/api/enqueue-run";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";

const schema = z.object({
  campaign_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  company_website: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    const input = schema.parse(body);
    return ok(await enqueueAndRun({
      userId,
      campaignId: input.campaign_id,
      leadId: input.lead_id,
      agentName: "company_research",
      taskType: "research_company",
      inputJson: input,
    }));
  } catch (error) {
    return fail(error);
  }
}
