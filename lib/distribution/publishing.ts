import { createServiceClient } from "@/lib/integrations/supabase";

export async function schedulePublication(input: {
  userId: string;
  workspaceId?: string | null;
  channel: string;
  content: string;
  scheduledAt: string;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string }> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("scheduled_publications")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      channel: input.channel,
      content: input.content,
      scheduled_at: input.scheduledAt,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not schedule publication.");
  return { id: data.id };
}

export async function drainDuePublications(limit = 25): Promise<{ published: number; failed: number }> {
  const db = createServiceClient();
  const { data } = await db
    .from("scheduled_publications")
    .select("id")
    .eq("status", "queued")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  let published = 0;
  let failed = 0;
  for (const item of data ?? []) {
    const { error } = await db
      .from("scheduled_publications")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        metadata: { published_by: "cron" },
      })
      .eq("id", item.id)
      .eq("status", "queued");
    if (error) failed += 1;
    else published += 1;
  }
  return { published, failed };
}
