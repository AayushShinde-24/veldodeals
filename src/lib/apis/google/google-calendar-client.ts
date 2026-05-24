import "server-only";

export async function getCalendarAvailability(input: {
  accessToken: string;
  timeMin: string;
  timeMax: string;
  calendarId?: string;
}) {
  const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: input.timeMin,
      timeMax: input.timeMax,
      items: [{ id: input.calendarId ?? "primary" }],
    }),
  });
  if (!response.ok) throw new Error("Calendar availability check failed.");
  return response.json();
}

export async function createCalendarMeeting(input: {
  accessToken: string;
  calendarId?: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  attendees: string[];
}) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId ?? "primary")}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: input.title,
      description: input.description,
      start: { dateTime: input.startAt },
      end: { dateTime: input.endAt },
      attendees: input.attendees.map((email) => ({ email })),
    }),
  });
  if (!response.ok) throw new Error("Calendar event creation failed.");
  return response.json() as Promise<{ id: string; htmlLink?: string }>;
}
