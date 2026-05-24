import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/server";
import { advancePositiveReplyToMeeting } from "@/src/lib/revenue-os/meeting-automation";

const schema = z.object({
  campaignId: z.string().uuid(),
  leadId: z.string().uuid(),
  replyClass: z.string().min(1),
  title: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before booking meetings.");
    const profile = await getCurrentProfile();
    if (!profile?.workspace_id) throw new Error("Workspace is required before meeting handoff.");
    const input = schema.parse(await request.json());
    return ok(await advancePositiveReplyToMeeting({
      userId: user.id,
      workspaceId: profile.workspace_id,
      campaignId: input.campaignId,
      leadId: input.leadId,
      replyClass: input.replyClass,
      title: input.title,
    }));
  } catch (error) {
    return fail(error);
  }
}
