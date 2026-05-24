import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { getConnectedGoogleAccessToken } from "@/src/lib/apis/google/connected-account";
import { createCalendarMeeting } from "@/src/lib/apis/google/google-calendar-client";
import { writeAuditLog } from "@/src/lib/audit/log";
import { recordAnalyticsEvent } from "@/src/lib/analytics/events";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  attendees: z.array(z.string().email()).min(1),
  leadId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  confirmCreate: z.literal(true),
});

export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext();
    if (!context) throw new Error("Sign in before creating meetings.");
    const input = schema.parse(await request.json());
    const google = await getConnectedGoogleAccessToken(context.workspaceId, "google_calendar");
    const event = await createCalendarMeeting({ accessToken: google.accessToken, ...input });
    const { data, error } = await createServiceClient().from("calendar_events").insert({
      workspace_id: context.workspaceId,
      lead_id: input.leadId ?? null,
      deal_id: input.dealId ?? null,
      provider_event_id: event.id,
      title: input.title,
      start_at: input.startAt,
      end_at: input.endAt,
      attendees: input.attendees,
      status: "scheduled",
      metadata: { htmlLink: event.htmlLink ?? null },
    }).select("*").single();
    if (error) throw new Error(error.message);
    await writeAuditLog({ workspaceId: context.workspaceId, userId: context.userId, action: "calendar.meeting.created", metadata: { eventId: event.id, dealId: input.dealId ?? null } });
    await recordAnalyticsEvent({ workspaceId: context.workspaceId, eventType: "meeting_booked", entityId: data.id, metadata: { attendees: input.attendees.length } });
    return ok({ event, calendarEvent: data });
  } catch (error) {
    return fail(error);
  }
}
