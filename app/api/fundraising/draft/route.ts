import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { enqueueAgentTask } from "@/lib/agents/agent-helpers";

const schema = z.object({
  campaignId: z.string().uuid(),
  investorId: z.string().uuid().optional(),
  pitchAngle: z.string().min(2),
  approvedSecuritiesLanguage: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before drafting fundraising outreach.");
    const input = schema.parse(await request.json());
    await enqueueAgentTask({
      userId: user.id,
      campaignId: input.campaignId,
      agentName: "fundraising",
      taskType: "draft_fundraising_outreach",
      priority: 3,
      inputJson: {
        investor_id: input.investorId,
        pitch_angle: input.pitchAngle,
        approved_securities_language: input.approvedSecuritiesLanguage,
      },
    });
    return ok({ queued: true });
  } catch (error) {
    return fail(error);
  }
}
