import { fetchWithRetry, isTransientError } from "@/lib/integrations/retry";

export interface CalendarEvent {
  summary?: string;
  title?: string;
  description?: string;
  startDateTime?: string;
  startAt?: string;
  endDateTime?: string;
  endAt?: string;
  attendees: { email: string; name?: string }[] | string[];
  location?: string;
  conferenceData?: boolean;
  accessToken?: string;
  [key: string]: unknown;
}

export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<{ eventId: string; id: string; htmlLink: string; meetLink?: string }> {
  const startTime = event.startDateTime ?? event.startAt ?? "";
  const endTime = event.endDateTime ?? event.endAt ?? "";
  const summary = event.summary ?? event.title ?? "";
  const normalizedAttendees = (event.attendees ?? []).map((a) =>
    typeof a === "string" ? { email: a } : a
  );
  const body = {
    summary,
    description: event.description,
    start: { dateTime: startTime, timeZone: "UTC" },
    end: { dateTime: endTime, timeZone: "UTC" },
    attendees: normalizedAttendees.map((a) => ({ email: (a as { email: string }).email, displayName: (a as { name?: string }).name })),
    location: event.location,
    ...(event.conferenceData
      ? {
          conferenceData: {
            createRequest: { requestId: `veldo_${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } },
          },
        }
      : {}),
  };

  const res = await fetchWithRetry(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events${event.conferenceData ? "?conferenceDataVersion=1" : ""}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    { provider: "google", endpoint: "calendar.events.insert", shouldRetry: isTransientError, timeoutMs: 20_000 }
  );

  if (!res.ok) {
    const err = (await res.json()) as { error?: { message?: string } };
    throw new Error(`Calendar API error: ${err.error?.message ?? res.statusText}`);
  }

  const result = (await res.json()) as {
    id: string;
    htmlLink: string;
    conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
  };

  const meetLink = result.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === "video"
  )?.uri;

  return { eventId: result.id, id: result.id, htmlLink: result.htmlLink, meetLink };
}

export async function createCalendarMeeting(
  options: CalendarEvent & { accessToken: string }
): Promise<{ eventId: string; id: string; htmlLink: string; meetLink?: string }> {
  const { accessToken, ...eventData } = options;
  return createCalendarEvent(accessToken, eventData);
}

export async function getCalendarAvailability(
  input: string | { accessToken: string; timeMin: string; timeMax: string },
  startDate?: string,
  endDate?: string
): Promise<{ start: string; end: string }[]> {
  const accessToken = typeof input === "string" ? input : input.accessToken;
  const timeMin = typeof input === "string" ? startDate! : input.timeMin;
  const timeMax = typeof input === "string" ? endDate! : input.timeMax;
  const res = await fetchWithRetry(
    `https://www.googleapis.com/calendar/v3/freeBusy`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: "primary" }],
      }),
    },
    { provider: "google", endpoint: "calendar.freebusy", shouldRetry: isTransientError, timeoutMs: 15_000 }
  );
  if (!res.ok) throw new Error("Failed to check calendar availability.");
  const data = (await res.json()) as {
    calendars?: { primary?: { busy?: { start: string; end: string }[] } };
  };
  return data.calendars?.primary?.busy ?? [];
}

export async function listUpcomingEvents(
  accessToken: string,
  maxResults = 10
): Promise<{ eventId: string; summary: string; start: string; attendees: string[] }[]> {
  const timeMin = new Date().toISOString();
  const res = await fetchWithRetry(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&timeMin=${timeMin}&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
    { provider: "google", endpoint: "calendar.events.list", shouldRetry: isTransientError, timeoutMs: 15_000 }
  );

  if (!res.ok) throw new Error("Failed to list calendar events.");
  const data = (await res.json()) as { items?: { id: string; summary?: string; start?: { dateTime?: string }; attendees?: { email: string }[] }[] };

  return (data.items ?? []).map((e) => ({
    eventId: e.id,
    summary: e.summary ?? "(No title)",
    start: e.start?.dateTime ?? "",
    attendees: (e.attendees ?? []).map((a) => a.email),
  }));
}
