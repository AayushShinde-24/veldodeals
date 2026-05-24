import "server-only";

import { createServiceClient } from "@/lib/integrations/supabase";

export async function recordAnalyticsEvent(input: {
  workspaceId: string;
  eventType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await createServiceClient().from("analytics_events").insert({
    workspace_id: input.workspaceId,
    event_type: input.eventType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
}
