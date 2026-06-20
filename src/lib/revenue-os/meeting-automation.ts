import { createServiceClient } from "@/lib/integrations/supabase";
import { getConnectedGoogleAccessToken } from "@/src/lib/apis/google/connected-account";
import { createCalendarEvent } from "@/src/lib/apis/google/google-calendar-client";
import { trackEvent } from "@/src/lib/analytics/events";
import { emitCustomerWebhook } from "@/lib/webhooks/customer";

export interface MeetingBookingRequest {
  userId: string;
  leadId: string;
  campaignId?: string;
  leadEmail: string;
  leadName: string;
  company: string;
  preferredDuration?: 15 | 30 | 45 | 60;
  notes?: string;
}

export interface BookedMeeting {
  id: string;
  userId: string;
  leadId: string;
  campaignId: string | null;
  attendeeEmail: string;
  attendeeName: string;
  company: string;
  scheduledAt: string | null;
  duration: number;
  meetLink: string | null;
  calendarEventId: string | null;
  status: "pending" | "scheduled" | "completed" | "cancelled" | "no_show";
  notes: string | null;
  createdAt: string;
}

export async function createMeetingRecord(
  input: MeetingBookingRequest
): Promise<BookedMeeting> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("meetings")
    .insert({
      user_id: input.userId,
      lead_id: input.leadId,
      campaign_id: input.campaignId ?? null,
      attendee_email: input.leadEmail,
      attendee_name: input.leadName,
      company: input.company,
      duration: input.preferredDuration ?? 30,
      status: "pending",
      notes: input.notes ?? null,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`Failed to create meeting record: ${error?.message}`);
  return mapMeeting(data);
}

export async function getMeetings(
  userId: string,
  status?: BookedMeeting["status"]
): Promise<BookedMeeting[]> {
  const db = createServiceClient();
  let q = db.from("meetings").select("*").eq("user_id", userId);
  if (status) q = q.eq("status", status);
  const { data } = await q.order("created_at", { ascending: false }).limit(50);
  return (data ?? []).map(mapMeeting);
}

export async function updateMeetingStatus(
  userId: string,
  meetingId: string,
  status: BookedMeeting["status"],
  scheduledAt?: string
): Promise<BookedMeeting> {
  const db = createServiceClient();
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (scheduledAt) update.scheduled_at = scheduledAt;

  const { data, error } = await db
    .from("meetings")
    .update(update)
    .eq("id", meetingId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) throw new Error(`Failed to update meeting: ${error?.message}`);
  return mapMeeting(data);
}

export interface AdvanceReplyInput {
  userId: string;
  workspaceId?: string;
  campaignId?: string;
  leadId?: string;
  replyId?: string;
  replyClass?: string;
  leadEmail?: string;
  leadName?: string;
  company?: string;
  title?: string;
  scheduledAt?: string;
}

export async function advancePositiveReplyToMeeting(input: AdvanceReplyInput): Promise<BookedMeeting>;
export async function advancePositiveReplyToMeeting(
  userId: string,
  replyId: string,
  leadEmail: string,
  leadName: string,
  company: string,
  campaignId?: string,
  leadId?: string
): Promise<BookedMeeting>;
export async function advancePositiveReplyToMeeting(
  userIdOrInput: string | AdvanceReplyInput,
  replyId?: string,
  leadEmail?: string,
  leadName?: string,
  company?: string,
  campaignId?: string,
  leadId?: string
): Promise<BookedMeeting> {
  const opts: AdvanceReplyInput =
    typeof userIdOrInput === "string"
      ? { userId: userIdOrInput, replyId, leadEmail, leadName, company, campaignId, leadId }
      : userIdOrInput;

  const db = createServiceClient();
  const resolvedLeadId = opts.leadId ?? opts.replyId ?? "";

  // Mark lead as meeting-booked stage
  if (opts.leadId) {
    await db.from("leads").update({ stage: "meeting_booked" }).eq("id", opts.leadId).eq("user_id", opts.userId);
  }

  return createMeetingRecord({
    userId: opts.userId,
    leadId: resolvedLeadId,
    campaignId: opts.campaignId,
    leadEmail: opts.leadEmail ?? "",
    leadName: opts.leadName ?? opts.title ?? "",
    company: opts.company ?? "",
    notes: `Booked from positive reply${opts.replyId ? ` ID: ${opts.replyId}` : ""}${opts.replyClass ? ` (${opts.replyClass})` : ""}`,
  });
}

export async function advancePositiveReplyToCalendarMeeting(input: AdvanceReplyInput): Promise<BookedMeeting> {
  const meeting = await advancePositiveReplyToMeeting(input);
  const start = input.scheduledAt ? new Date(input.scheduledAt) : nextBusinessSlot();
  const end = new Date(start.getTime() + meeting.duration * 60_000);
  const { accessToken } = await getConnectedGoogleAccessToken(input.userId);
  const title = `Veldo meeting${meeting.company ? ` with ${meeting.company}` : ""}`;
  const calendar = await createCalendarEvent(accessToken, {
    summary: title,
    description: meeting.notes ?? undefined,
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
    attendees: meeting.attendeeEmail ? [{ email: meeting.attendeeEmail, name: meeting.attendeeName }] : [],
    conferenceData: true,
  });

  const db = createServiceClient();
  const update = {
    title,
    scheduled_at: start.toISOString(),
    status: "scheduled",
    meet_link: calendar.meetLink ?? null,
    calendar_event_id: calendar.eventId,
    updated_at: new Date().toISOString(),
  };
  const { data } = await db
    .from("meetings")
    .update(update)
    .eq("id", meeting.id)
    .eq("user_id", input.userId)
    .select("*")
    .maybeSingle();

  await db.from("calendar_events").insert({
    user_id: input.userId,
    title,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    attendees: [{ email: meeting.attendeeEmail, name: meeting.attendeeName }],
    meet_link: calendar.meetLink ?? null,
    external_event_id: calendar.eventId,
    created_at: new Date().toISOString(),
  }).then(null, () => {});
  await trackEvent({ userId: input.userId, event: "meeting_booked", entityId: meeting.id, properties: { campaign_id: input.campaignId } });
  await emitCustomerWebhook({
    userId: input.userId,
    workspaceId: input.workspaceId,
    event: "meeting.booked",
    payload: { meeting_id: meeting.id, campaign_id: input.campaignId, lead_id: input.leadId, scheduled_at: start.toISOString() },
  });

  return data ? mapMeeting(data) : { ...meeting, ...mapMeetingUpdate(meeting, update) };
}

function nextBusinessSlot(): Date {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setUTCHours(15, 0, 0, 0);
  return d;
}

function mapMeetingUpdate(meeting: BookedMeeting, update: {
  scheduled_at: string;
  status: string;
  meet_link: string | null;
  calendar_event_id: string;
}): Partial<BookedMeeting> {
  return {
    scheduledAt: update.scheduled_at,
    status: update.status as BookedMeeting["status"],
    meetLink: update.meet_link,
    calendarEventId: update.calendar_event_id,
  };
}

function mapMeeting(row: Record<string, unknown>): BookedMeeting {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    leadId: row.lead_id as string,
    campaignId: (row.campaign_id as string) ?? null,
    attendeeEmail: row.attendee_email as string,
    attendeeName: (row.attendee_name as string) ?? "",
    company: (row.company as string) ?? "",
    scheduledAt: (row.scheduled_at as string) ?? null,
    duration: (row.duration as number) ?? 30,
    meetLink: (row.meet_link as string) ?? null,
    calendarEventId: (row.calendar_event_id as string) ?? null,
    status: (row.status as BookedMeeting["status"]) ?? "pending",
    notes: (row.notes as string) ?? null,
    createdAt: row.created_at as string,
  };
}
