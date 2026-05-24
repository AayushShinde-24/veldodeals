import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { enqueueAgentTask } from "@/lib/agents/agent-helpers";

const schema = z.object({
  campaignId: z.string().uuid(),
  leadId: z.string().uuid(),
  consentBasis: z.enum(["express_written", "existing_business_relationship", "manual_review_required"]).default("manual_review_required"),
  jurisdiction: z.string().default("US"),
  callTimeAllowed: z.boolean().default(false),
  recordingConsentObtained: z.boolean().default(false),
  optOutSupported: z.boolean().default(true),
  userApprovedCampaignPurpose: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before preparing calls.");
    const input = schema.parse(await request.json());
    await enqueueAgentTask({
      userId: user.id,
      campaignId: input.campaignId,
      leadId: input.leadId,
      agentName: "voice_call",
      taskType: "prepare_voice_call",
      priority: 2,
      inputJson: {
        consent_basis: input.consentBasis,
        jurisdiction: input.jurisdiction,
        call_time_allowed: input.callTimeAllowed,
        recording_consent_obtained: input.recordingConsentObtained,
        opt_out_supported: input.optOutSupported,
        user_approved_campaign_purpose: input.userApprovedCampaignPurpose,
      },
    });
    return ok({ queued: true });
  } catch (error) {
    return fail(error);
  }
}
