import { createServiceClient } from "@/lib/integrations/supabase";

export type EventName =
  | "campaign_created"
  | "campaign_started"
  | "campaign_paused"
  | "lead_imported"
  | "email_drafted"
  | "email_approved"
  | "email_sent"
  | "email_opened"
  | "email_replied"
  | "email_bounced"
  | "meeting_booked"
  | "lead_converted"
  | "user_signed_up"
  | "first_campaign"
  | "first_send"
  | "first_reply"
  | "first_deal"
  | "plan_upgraded"
  | "credits_purchased";

export interface AnalyticsEvent {
  userId?: string;
  workspaceId?: string;
  event?: EventName;
  eventType?: string;
  entityId?: string;
  properties?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function trackEvent(entry: AnalyticsEvent): Promise<void> {
  try {
    const db = createServiceClient();
    await db.from("analytics_events").insert({
      user_id: entry.userId,
      event: entry.event,
      properties: entry.properties ?? {},
      created_at: new Date().toISOString(),
    });
  } catch {
    // Non-blocking
  }
}

export const recordAnalyticsEvent = trackEvent;

export async function getEventCounts(
  userId: string,
  events: EventName[],
  since?: Date
): Promise<Record<string, number>> {
  const db = createServiceClient();
  const startDate = since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const { data } = await db
    .from("analytics_events")
    .select("event")
    .eq("user_id", userId)
    .in("event", events)
    .gte("created_at", startDate.toISOString());

  const counts: Record<string, number> = Object.fromEntries(events.map((e) => [e, 0]));
  for (const row of data ?? []) counts[row.event] = (counts[row.event] ?? 0) + 1;
  return counts;
}
