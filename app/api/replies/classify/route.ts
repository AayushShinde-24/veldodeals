import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { enqueueAndRun } from "@/lib/api/enqueue-run";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";
import { advancePositiveReplyToCalendarMeeting } from "@/src/lib/revenue-os/meeting-automation";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    const result = await enqueueAndRun({
      userId,
      campaignId: String(body.campaign_id),
      leadId: String(body.lead_id),
      agentName: "reply_classification",
      taskType: "classify_reply",
      inputJson: body,
    });

    const classification = String(body.reply_class ?? body.classification ?? body.intent ?? "").toLowerCase();
    if (["positive", "interested", "meeting_ready", "meeting-ready"].includes(classification)) {
      try {
        const meeting = await advancePositiveReplyToCalendarMeeting({
          userId,
          campaignId: String(body.campaign_id),
          leadId: String(body.lead_id),
          replyId: typeof body.reply_id === "string" ? body.reply_id : undefined,
          replyClass: classification,
          leadEmail: typeof body.lead_email === "string" ? body.lead_email : undefined,
          leadName: typeof body.lead_name === "string" ? body.lead_name : undefined,
          company: typeof body.company === "string" ? body.company : undefined,
          scheduledAt: typeof body.scheduled_at === "string" ? body.scheduled_at : undefined,
        });
        return ok({ classification: result, meeting });
      } catch (meetingError) {
        return ok({
          classification: result,
          meeting_error: meetingError instanceof Error ? meetingError.message : "Meeting handoff failed.",
        });
      }
    }

    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
